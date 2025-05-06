"use client";

import { useState, useEffect } from "react";
import { format, addDays, differenceInDays } from "date-fns";
import { Calendar as CalendarIcon, Brain, Edit2, Loader2, Check, X } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { SpacedRepetition } from "@/lib/spacedRepetition";
import { Topic, Concept } from "@/types/study";

interface SpacedRecallSchedulerProps {
  topic: Topic;
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

  const item = concept || topic;
  const masteryLevel = item.masteryLevel || 0;
  const currentPhase = item.currentPhase || 'initial';
  
  // Get the last review data if available
  const lastReview = item.reviewLogs?.[item.reviewLogs.length - 1];
  
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
        lastReview: new Date(lastReview?.date || new Date())
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
      toast.error("Please rate your recall first to calculate the next review date");
      return;
    }

    if (!rating && !passFailRating) {
      toast.error("Please rate your recall first");
      return;
    }
    
    // Get the final rating value
    const finalRating = isSimpleMode && passFailRating 
      ? convertPassFailToRating(passFailRating) 
      : rating;
    
    // Pass the scheduled date, rating, and interval to the parent component
    onScheduleUpdate(date, { 
      rating: finalRating, 
      date: new Date(),
      interval: intervalDays
    });
    
    toast.success("Review scheduled successfully");
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

  return (
    <div className="space-y-4">
      {error && (
        <div className="text-sm text-destructive mb-2">{error}</div>
      )}
      
      <div className="flex items-center justify-between mb-4">
        <Label htmlFor="rating-mode" className="text-sm font-medium">
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
                  "flex items-center gap-2",
                  passFailRating === 'pass' && "bg-green-600 hover:bg-green-700"
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
                  "flex items-center gap-2",
                  passFailRating === 'fail' && "bg-red-600 hover:bg-red-700"
                )}
                onClick={() => setPassFailRating('fail')}
              >
                <X className="h-4 w-4" />
                Fail
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-muted-foreground" />
              <select
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="bg-background border border-input rounded px-3 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-ring w-full sm:w-auto"
              >
                <option value={0}>Rate your recall</option>
                <option value={1}>Hard (1)</option>
                <option value={2}>Medium (2)</option>
                <option value={3}>Good (3)</option>
                <option value={4}>Easy (4)</option>
                <option value={5}>Perfect (5)</option>
              </select>
            </div>
          )}
          
          {rating > 0 && !isSimpleMode && (
            <p className="text-sm text-muted-foreground">{getQualityDescription(rating)}</p>
          )}
          
          {passFailRating && isSimpleMode && (
            <p className="text-sm text-muted-foreground">{getPassFailDescription(passFailRating)}</p>
          )}
        </div>

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

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleSchedule}
                disabled={(!rating && !passFailRating) || !date}
                variant="default"
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Schedule Review
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Confirm and schedule the next review</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {((rating > 0 && !isSimpleMode) || (passFailRating && isSimpleMode)) && schedulingInfo && (
        <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md whitespace-pre-line">
          {schedulingInfo}
        </div>
      )}
    </div>
  );
} 