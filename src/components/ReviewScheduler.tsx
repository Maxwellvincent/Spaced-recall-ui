import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Clock, Brain, Loader2, Edit2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, differenceInDays, isAfter, isBefore } from 'date-fns';
import { FSRS, calculateNextReview, suggestInitialInterval } from '@/lib/fsrs';
import type { Topic, Concept, ReviewLog, StudySession } from '@/types/study';
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { generateGoogleCalendarLink, generateCalendarDescription } from "@/lib/calendar";
import { checkGoogleCalendarAuth, initiateGoogleCalendarAuth } from '@/lib/googleAuth';

dayjs.extend(utc);
dayjs.extend(timezone);

interface ReviewSchedulerProps {
  topic: Topic;
  concept?: Concept;
  onScheduleUpdate: (date: Date, reviewLog?: { rating: number; date: Date }) => void;
  initialDate?: Date;
}

export function ReviewScheduler({ topic, concept, onScheduleUpdate, initialDate }: ReviewSchedulerProps) {
  const [date, setDate] = useState<Date | undefined>(initialDate);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isAddingToCalendar, setIsAddingToCalendar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [schedulingInfo, setSchedulingInfo] = useState<string>('');
  const [calendarEventId, setCalendarEventId] = useState<string | undefined>(
    concept?.reviewLogs?.[concept.reviewLogs.length - 1]?.calendarEventId ||
    topic?.reviewLogs?.[topic.reviewLogs.length - 1]?.calendarEventId
  );

  const item = concept || topic;
  const masteryLevel = item.masteryLevel || 0;
  const lastReview = item.reviewLogs?.[item.reviewLogs.length - 1];
  const studySessions = item.studySessions || [];

  // Calculate suggested review date based on multiple factors
  const calculateSuggestedDate = (quality: number) => {
    let interval: number;
    let adjustmentFactor = 1.0;
    let explanation: string[] = [];

    // Base interval calculation using FSRS
    if (!lastReview) {
      interval = suggestInitialInterval(masteryLevel);
      explanation.push(`Initial interval based on ${masteryLevel}% mastery`);
    } else {
      const { interval: nextInterval } = calculateNextReview(quality, lastReview.interval || 1);
      interval = nextInterval;
      explanation.push(`Base interval from FSRS: ${interval} days`);
    }

    // Analyze study history
    if (studySessions.length > 0) {
      // Calculate average performance from study sessions
      const recentSessions = studySessions
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

      const avgMasteryGain = recentSessions.reduce((sum, session) => 
        sum + (session.masteryGained || 0), 0) / recentSessions.length;

      // Adjust interval based on mastery gains
      if (avgMasteryGain > 15) {
        adjustmentFactor *= 1.2;
        explanation.push("Strong recent performance (+20% interval)");
      } else if (avgMasteryGain < 5) {
        adjustmentFactor *= 0.8;
        explanation.push("Lower recent performance (-20% interval)");
      }

      // Consider study frequency
      const daysSinceLastStudy = differenceInDays(
        new Date(),
        new Date(recentSessions[0].date)
      );

      if (daysSinceLastStudy < 7) {
        adjustmentFactor *= 1.1;
        explanation.push("Recent active study (+10% interval)");
      }
    }

    // Consider previous review performance
    if (lastReview) {
      const previousRating = lastReview.rating;
      const ratingDiff = quality - previousRating;

      if (ratingDiff > 0) {
        adjustmentFactor *= 1.15;
        explanation.push("Improved recall (+15% interval)");
      } else if (ratingDiff < 0) {
        adjustmentFactor *= 0.85;
        explanation.push("Decreased recall (-15% interval)");
      }

      // Check if previous review was on time
      const previousReviewDate = new Date(lastReview.date);
      const scheduledDate = addDays(previousReviewDate, lastReview.interval || 0);
      const reviewDelay = differenceInDays(new Date(lastReview.date), scheduledDate);

      if (reviewDelay > 2) {
        adjustmentFactor *= 0.9;
        explanation.push("Previous review was delayed (-10% interval)");
      }
    }

    // Apply mastery level influence
    if (masteryLevel < 50) {
      adjustmentFactor *= 0.9;
      explanation.push("Low mastery level (-10% interval)");
    } else if (masteryLevel > 80) {
      adjustmentFactor *= 1.1;
      explanation.push("High mastery level (+10% interval)");
    }

    // Calculate final interval
    const finalInterval = Math.round(interval * adjustmentFactor);
    const suggestedDate = addDays(new Date(), finalInterval);

    // Update scheduling info for display
    setSchedulingInfo(
      `Suggested interval: ${finalInterval} days\n` +
      explanation.join('\n')
    );

    return suggestedDate;
  };

  // Update suggested date when rating changes
  useEffect(() => {
    if (rating > 0 && !isCustomDate) {
      const suggestedDate = calculateSuggestedDate(rating);
      setDate(suggestedDate);
    }
  }, [rating, isCustomDate]);

  // Reset custom date flag when rating changes
  useEffect(() => {
    if (rating > 0) {
      setIsCustomDate(false);
    }
  }, [rating]);

  const handleDateSelect = (newDate: Date | undefined) => {
    setDate(newDate);
    setIsCustomDate(true);
    setIsScheduling(false);
  };

  const handleSchedule = () => {
    if (!date) {
      toast.error("Please rate the review first to calculate the next review date");
      return;
    }

    if (!rating) {
      toast.error("Please rate the review first");
      return;
    }
    
    onScheduleUpdate(date, { rating, date: new Date() });
    toast.success("Review scheduled successfully");
  };

  const handleAddToCalendar = async () => {
    if (!date) {
      toast.error("Please rate the review first to calculate the next review date");
      return;
    }

    // Check if already added to calendar
    if (calendarEventId) {
      toast.info('Review already in calendar', {
        description: 'This review session is already scheduled in your calendar'
      });
      return;
    }

    setIsAddingToCalendar(true);

    try {
      // Check Google Calendar authentication
      const isAuthenticated = await checkGoogleCalendarAuth();
      
      if (!isAuthenticated) {
        // Store current state in localStorage before redirecting
        localStorage.setItem('pendingCalendarAdd', JSON.stringify({
          itemName: item.name,
          date: date.toISOString(),
          description: generateCalendarDescription(item, topic)
        }));
        
        // Redirect to Google Calendar auth
        await initiateGoogleCalendarAuth();
        return;
      }

      const response = await fetch('/api/calendar/add-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `Review: ${item.name}`,
          description: generateCalendarDescription(item, topic),
          startDate: date,
          durationMinutes: 30
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add event to calendar');
      }

      const data = await response.json();
      
      // Store the calendar event ID
      setCalendarEventId(data.eventId);

      // Update the review log to mark it as added to calendar
      const lastReviewLog = item.reviewLogs?.[item.reviewLogs.length - 1];
      if (lastReviewLog) {
        lastReviewLog.addedToCalendar = true;
        lastReviewLog.calendarEventId = data.eventId;
      }
      
      toast.success('Added to Google Calendar', {
        description: 'Review session has been scheduled'
      });

      // Open the event in Google Calendar for any additional modifications
      if (data.htmlLink) {
        window.open(data.htmlLink, '_blank');
      }
    } catch (error) {
      console.error('Error adding to calendar:', error);
      
      if (error.message.includes('User not authenticated')) {
        toast.error('Please sign in', {
          description: 'You need to be signed in to add events to your calendar'
        });
      } else if (error.message.includes('No Google access token found')) {
        toast.error('Google Calendar not connected', {
          description: 'Please connect your Google Calendar in settings first'
        });
      } else {
        toast.error('Failed to add to calendar', {
          description: error.message || 'Please try again later'
        });
      }
    } finally {
      setIsAddingToCalendar(false);
    }
  };

  // Reset calendar event ID when rating changes
  useEffect(() => {
    if (rating > 0) {
      setCalendarEventId(undefined);
    }
  }, [rating]);

  const getQualityDescription = (quality: number): string => {
    switch (quality) {
      case 1: return "Hard - Review needed soon";
      case 2: return "Medium - Some effort to recall";
      case 3: return "Easy - Recalled with minimal effort";
      case 4: return "Perfect - Instant recall";
      default: return "Select rating";
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="text-sm text-red-400 mb-2">{error}</div>
      )}
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex flex-col gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-slate-400" />
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
            >
              <option value={0}>Rate your recall</option>
              <option value={1}>Hard (1)</option>
              <option value={2}>Medium (2)</option>
              <option value={3}>Easy (3)</option>
              <option value={4}>Perfect (4)</option>
            </select>
          </div>
          {rating > 0 && (
            <p className="text-sm text-slate-400">{getQualityDescription(rating)}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Popover open={isScheduling} onOpenChange={setIsScheduling}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !date && "text-muted-foreground",
                  isCustomDate && "border-yellow-500"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Waiting for rating...</span>}
                {isCustomDate && <Edit2 className="ml-2 h-4 w-4 text-yellow-500" />}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={handleDateSelect}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleSchedule}
                    disabled={!rating || !date}
                    variant="secondary"
                    size="sm"
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    {isScheduling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Schedule Review
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Confirm and schedule the review</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleAddToCalendar}
                    disabled={!date || isAddingToCalendar || !!calendarEventId}
                    variant="outline"
                    size="sm"
                    className={cn(
                      "text-slate-300 hover:text-white hover:bg-slate-700",
                      calendarEventId && "bg-green-900/20 text-green-400"
                    )}
                  >
                    {isAddingToCalendar ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CalendarIcon className="mr-2 h-4 w-4" />
                    )}
                    {isAddingToCalendar 
                      ? 'Adding...' 
                      : calendarEventId 
                        ? 'Added to Calendar' 
                        : 'Add to Calendar'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {calendarEventId 
                    ? 'This review is already in your calendar'
                    : 'Add review reminder to your calendar'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {schedulingInfo && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-400 hover:text-slate-300"
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <div className="text-sm whitespace-pre-line">
                      {schedulingInfo}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </div>

      {isCustomDate && date && (
        <p className="text-sm text-yellow-500">
          <Edit2 className="inline h-4 w-4 mr-1" />
          Custom date selected. The suggested review interval has been overridden.
        </p>
      )}
    </div>
  );
} 