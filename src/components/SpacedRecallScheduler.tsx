"use client";

import { useState, useEffect } from "react";
import { format, addDays, differenceInDays, isToday } from "date-fns";
import { Calendar as CalendarIcon, Brain, Edit2, Loader2, Check, X, Flame, Award } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Switch from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { SpacedRepetition } from "@/lib/spacedRepetition";
import { Topic, Concept } from "@/types/study";

interface SpacedRecallSchedulerProps {
  topic?: Topic;
  concept?: Concept;
  onScheduleUpdate: (date: Date, reviewLog?: { rating: number; date: Date; interval: number }) => void;
  initialDate?: Date;
}

export function SpacedRecallScheduler({ topic, concept, onScheduleUpdate, initialDate }: SpacedRecallSchedulerProps) {
  const [date, setDate] = useState<Date | undefined>(initialDate);
  const [isScheduling, setIsScheduling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [schedulingInfo, setSchedulingInfo] = useState<string>('');
  const [intervalDays, setIntervalDays] = useState<number>(1);
  const [isSimpleMode, setIsSimpleMode] = useState(true);
  const [passFailRating, setPassFailRating] = useState<'pass' | 'fail' | null>(null);
  const [reviewStreak, setReviewStreak] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Make sure we have either a topic or concept
  if (!topic && !concept) {
    console.error("SpacedRecallScheduler: Either topic or concept must be provided");
    return <div className="text-red-500">Error: Missing item data</div>;
  }

  const item = concept || topic;
  const masteryLevel = item.masteryLevel || 0;
  const currentPhase = item.currentPhase || 'initial';
  
  // Get the last review data if available
  const lastReview = item.reviewLogs?.[item.reviewLogs.length - 1];
  
  // Calculate review streak based on review logs
  useEffect(() => {
    if (item.reviewLogs && item.reviewLogs.length > 0) {
      let streak = 0;
      const sortedLogs = [...item.reviewLogs].sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      
      // Check if there's a review today
      const hasReviewToday = sortedLogs.some(log => {
        try {
          const logDate = new Date(log.date);
          return isToday(logDate);
        } catch (e) {
          return false;
        }
      });
      
      // If there's a review today, start counting streak
      if (hasReviewToday) {
        streak = 1;
        
        // Check consecutive days before today
        const today = new Date();
        let currentDate = addDays(today, -1); // Start from yesterday
        
        for (let i = 1; i < sortedLogs.length; i++) {
          try {
            const logDate = new Date(sortedLogs[i].date);
            const dayDiff = differenceInDays(currentDate, logDate);
            
            if (dayDiff === 0) {
              // Found a review on the expected day
              streak++;
              currentDate = addDays(currentDate, -1);
            } else if (dayDiff < 0) {
              // This log is from a future date compared to what we're looking for
              continue;
            } else {
              // Gap in streak
              break;
            }
          } catch (e) {
            continue;
          }
        }
      }
      
      setReviewStreak(streak);
    }
  }, [item.reviewLogs]);
  
  // Convert pass/fail to numeric rating
  const convertPassFailToRating = (result: 'pass' | 'fail'): number => {
    // Pass = 4 (Easy), Fail = 2 (Hard)
    return result === 'pass' ? 4 : 2;
  };
  
  // Calculate suggested review date based on spaced repetition algorithm
  const calculateSuggestedDate = (quality: number) => {
    try {
      // Default state if no previous review exists
      const defaultState = {
        stability: 1.0,
        difficulty: 0.3,
        retrievability: 0.9,
        lastReview: lastReview?.date ? new Date(lastReview.date) : new Date()
      };
      
      // Use existing FSRS params if available or default
      const fsrsState = item.fsrsParams || defaultState;
      
      // Convert rating (1-5) to our internal scale
      const normalizedRating = Math.max(1, Math.min(5, quality));
      
      // Calculate next review schedule using SpacedRepetition algorithm
      const scheduling = SpacedRepetition.repeat(
        fsrsState,
        new Date(),
        normalizedRating
      );
      
      // Apply phase-specific adjustments
      let phaseMultiplier = 1.0;
      let phaseExplanation = "";
      
      switch(currentPhase) {
        case 'initial':
          phaseMultiplier = 0.8; // Shorter intervals for initial learning
          phaseExplanation = "Initial learning phase (shorter intervals)";
          break;
        case 'consolidation':
          phaseMultiplier = 1.0; // Standard intervals
          phaseExplanation = "Consolidation phase (standard intervals)";
          break;
        case 'mastery':
          phaseMultiplier = 1.2; // Longer intervals for mastered content
          phaseExplanation = "Mastery phase (longer intervals)";
          break;
      }
      
      // Calculate days until next review with phase adjustment
      const daysUntilReview = Math.round(
        differenceInDays(scheduling.scheduledDate, new Date()) * phaseMultiplier
      );
      
      // Ensure minimum interval of 1 day
      const finalInterval = Math.max(1, daysUntilReview);
      setIntervalDays(finalInterval);
      
      // Calculate the next review date
      const nextReviewDate = addDays(new Date(), finalInterval);
      
      // Update scheduling info for display
      setSchedulingInfo(
        `Next review in: ${finalInterval} days\n` +
        `Stability: ${scheduling.stability.toFixed(2)}\n` +
        `Retrievability: ${(scheduling.retrievability * 100).toFixed(0)}%\n` +
        `Phase: ${phaseExplanation}`
      );
      
      return nextReviewDate;
    } catch (err) {
      console.error("Error calculating review date:", err);
      setError("Failed to calculate next review date");
      return addDays(new Date(), SpacedRepetition.getSpacingInterval(currentPhase));
    }
  };

  // Update suggested date when rating changes
  useEffect(() => {
    if (rating > 0 && !isCustomDate) {
      const suggestedDate = calculateSuggestedDate(rating);
      setDate(suggestedDate);
    }
  }, [rating, isCustomDate]);
  
  // Update suggested date when pass/fail rating changes
  useEffect(() => {
    if (passFailRating && !isCustomDate) {
      const numericRating = convertPassFailToRating(passFailRating);
      const suggestedDate = calculateSuggestedDate(numericRating);
      setDate(suggestedDate);
    }
  }, [passFailRating, isCustomDate]);

  // Reset custom date flag when rating changes
  useEffect(() => {
    if (rating > 0 || passFailRating) {
      setIsCustomDate(false);
    }
  }, [rating, passFailRating]);
  
  // Reset ratings when switching modes
  useEffect(() => {
    setRating(0);
    setPassFailRating(null);
    setDate(undefined);
    setSchedulingInfo('');
  }, [isSimpleMode]);

  const handleDateSelect = (newDate: Date | undefined) => {
    setDate(newDate);
    setIsCustomDate(true);
    setIsScheduling(false);
    
    // Update interval if custom date is selected
    if (newDate) {
      const newInterval = differenceInDays(newDate, new Date());
      setIntervalDays(Math.max(1, newInterval));
    }
  };

  const handleSchedule = () => {
    if (!date) {
      toast({
        title: "Error",
        description: "Please rate your recall first to calculate the next review date",
        variant: "destructive"
      });
      return;
    }

    if (!rating && !passFailRating) {
      toast({
        title: "Error",
        description: "Please rate your recall first",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    // Get the final rating value
    const finalRating = isSimpleMode && passFailRating 
      ? convertPassFailToRating(passFailRating) 
      : rating;
    
    // Create the review log object with proper validation
    const reviewLog = { 
      rating: finalRating || 3, // Default to 3 if somehow rating is still 0
      date: new Date(),
      interval: Math.max(1, intervalDays || 1) // Ensure interval is at least 1 day
    };
    
    // Show confetti for streak milestones
    if (reviewStreak === 4 || reviewStreak === 9 || reviewStreak === 14 || reviewStreak === 29) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
    
    // Pass the scheduled date and review log to the parent component
    setTimeout(() => {
      onScheduleUpdate(date, reviewLog);
      setIsSubmitting(false);
      
      toast({
        title: "Success",
        description: "Review scheduled successfully",
      });
    }, 800);
  };

  // Helper function to get quality description
  const getQualityDescription = (quality: number): string => {
    switch (quality) {
      case 1: return "Difficult to recall - will need shorter interval";
      case 2: return "Recalled with effort - moderate interval";
      case 3: return "Recalled well - standard interval";
      case 4: return "Perfect recall - extended interval";
      case 5: return "Very easy recall - maximum interval";
      default: return "";
    }
  };
  
  // Helper function to get pass/fail description
  const getPassFailDescription = (result: 'pass' | 'fail' | null): string => {
    switch (result) {
      case 'pass': return "Successfully recalled - longer interval";
      case 'fail': return "Failed to recall - shorter interval";
      default: return "";
    }
  };

  // Helper function to get streak badge color
  const getStreakBadgeColor = (streak: number): string => {
    if (streak >= 30) return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    if (streak >= 15) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    if (streak >= 7) return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    if (streak >= 3) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    return "bg-slate-500/20 text-slate-400 border-slate-500/30";
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="text-sm text-red-400 mb-2 bg-red-900/20 p-2 rounded border border-red-900/50">{error}</div>
      )}
      
      {reviewStreak > 0 && (
        <div className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-md border mb-2 text-sm",
          getStreakBadgeColor(reviewStreak)
        )}>
          <Flame className="h-4 w-4" />
          <span className="font-medium">{reviewStreak} day streak!</span>
          {reviewStreak >= 30 && <Award className="h-4 w-4 ml-auto" />}
        </div>
      )}
      
      <div className="flex items-center justify-between mb-4 bg-slate-800/50 p-3 rounded-md border border-slate-700">
        <Label htmlFor="rating-mode" className="text-sm font-medium text-slate-300">
          Simple mode (Pass/Fail)
        </Label>
        <Switch
          id="rating-mode"
          checked={isSimpleMode}
          onCheckedChange={setIsSimpleMode}
        />
      </div>
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex flex-col gap-2 w-full sm:w-auto">
          {isSimpleMode ? (
            <div className="flex items-center gap-3">
              <Button
                variant={passFailRating === 'pass' ? "default" : "outline"}
                size="sm"
                className={cn(
                  "flex items-center gap-2 transition-all duration-300",
                  passFailRating === 'pass' 
                    ? "bg-green-600 hover:bg-green-700 border-green-500 shadow-md shadow-green-900/20" 
                    : "border-slate-600 text-slate-300"
                )}
                onClick={() => setPassFailRating('pass')}
              >
                <Check className="h-4 w-4" />
                Pass
              </Button>
              
              <Button
                variant={passFailRating === 'fail' ? "default" : "outline"}
                size="sm"
                className={cn(
                  "flex items-center gap-2 transition-all duration-300",
                  passFailRating === 'fail' 
                    ? "bg-red-600 hover:bg-red-700 border-red-500 shadow-md shadow-red-900/20" 
                    : "border-slate-600 text-slate-300"
                )}
                onClick={() => setPassFailRating('fail')}
              >
                <X className="h-4 w-4" />
                Fail
              </Button>
            </div>
          ) : (
            <div className="w-full">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-300">Rate your recall:</span>
              </div>
              <div className="flex items-center justify-between gap-1 w-full">
                {[1, 2, 3, 4, 5].map((value) => (
                  <Button
                    key={value}
                    variant={rating === value ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "flex-1 transition-all duration-300",
                      rating === value 
                        ? value === 1 ? "bg-red-600 hover:bg-red-700 border-red-500" 
                        : value === 2 ? "bg-orange-600 hover:bg-orange-700 border-orange-500"
                        : value === 3 ? "bg-yellow-600 hover:bg-yellow-700 border-yellow-500"
                        : value === 4 ? "bg-green-600 hover:bg-green-700 border-green-500"
                        : "bg-emerald-600 hover:bg-emerald-700 border-emerald-500"
                        : "border-slate-600 text-slate-300"
                    )}
                    onClick={() => setRating(value)}
                  >
                    {value}
                  </Button>
                ))}
              </div>
            </div>
          )}
          
          {rating > 0 && !isSimpleMode && (
            <p className="text-sm text-slate-400 mt-1">{getQualityDescription(rating)}</p>
          )}
          
          {passFailRating && isSimpleMode && (
            <p className="text-sm text-slate-400 mt-1">{getPassFailDescription(passFailRating)}</p>
          )}
        </div>

        <Popover open={isScheduling} onOpenChange={setIsScheduling}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[240px] justify-start text-left font-normal bg-slate-800 border-slate-700 hover:bg-slate-700",
                !date && "text-slate-400",
                isCustomDate && "border-yellow-500/70"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
              {date ? (
                <span className="text-slate-200">{format(date, "PPP")}</span>
              ) : (
                <span>Waiting for rating...</span>
              )}
              {isCustomDate && <Edit2 className="ml-2 h-4 w-4 text-yellow-500" />}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-slate-800 border-slate-700" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateSelect}
              initialFocus
              className="bg-slate-800 text-slate-200"
            />
          </PopoverContent>
        </Popover>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleSchedule}
                disabled={(!rating && !passFailRating) || !date || isSubmitting}
                variant="default"
                size="sm"
                className={cn(
                  "bg-blue-600 text-white hover:bg-blue-700 min-w-[140px]",
                  (!rating && !passFailRating) || !date ? "opacity-50" : ""
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  "Schedule Review"
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-slate-800 text-slate-200 border-slate-700">
              <p>Confirm and schedule the next review</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {((rating > 0 && !isSimpleMode) || (passFailRating && isSimpleMode)) && schedulingInfo && (
        <div className="text-sm text-slate-300 bg-slate-800/50 p-3 rounded-md border border-slate-700 whitespace-pre-line">
          {schedulingInfo}
        </div>
      )}
      
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-blue-500/5 animate-pulse"></div>
          <div className="text-center bg-slate-800/90 p-4 rounded-lg border border-blue-500/50 shadow-xl">
            <Award className="h-12 w-12 text-yellow-400 mx-auto mb-2" />
            <h3 className="text-lg font-medium text-slate-100">Streak Milestone!</h3>
            <p className="text-slate-300">You've reached a {reviewStreak} day streak!</p>
          </div>
        </div>
      )}
    </div>
  );
} 