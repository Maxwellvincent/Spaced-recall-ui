"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { Calendar, Brain, ArrowRight, Clock, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Topic, Concept } from "@/types/study";

interface SpacedRecallCardProps {
  item: Topic | Concept;
  subjectId: string;
  parentTopicName?: string;
  onReviewClick: () => void;
}

export function SpacedRecallCard({ 
  item, 
  subjectId, 
  parentTopicName,
  onReviewClick 
}: SpacedRecallCardProps) {
  const router = useRouter();
  
  // Get the next review date from the item
  const nextReviewDate = item.nextReview ? new Date(item.nextReview) : null;
  const isOverdue = nextReviewDate && isPast(nextReviewDate);
  
  // Get mastery level and calculate progress color
  const masteryLevel = item.masteryLevel || 0;
  const progressColor = 
    masteryLevel < 30 ? "bg-red-500" :
    masteryLevel < 60 ? "bg-yellow-500" :
    masteryLevel < 80 ? "bg-blue-500" : "bg-green-500";
  
  // Get the phase
  const phase = item.currentPhase || 'initial';
  
  // Get the phase badge color
  const getPhaseBadgeColor = (phase: string) => {
    switch (phase) {
      case 'initial': return "bg-blue-500/20 text-blue-500 hover:bg-blue-500/30";
      case 'consolidation': return "bg-purple-500/20 text-purple-500 hover:bg-purple-500/30";
      case 'mastery': return "bg-green-500/20 text-green-500 hover:bg-green-500/30";
      default: return "bg-slate-500/20 text-slate-500 hover:bg-slate-500/30";
    }
  };
  
  // Navigate to the item page
  const handleNavigate = () => {
    if ('concepts' in item) {
      // This is a topic
      router.push(`/subjects/${subjectId}/topics/${encodeURIComponent(item.name)}`);
    } else if (parentTopicName) {
      // This is a concept with a parent topic
      router.push(`/subjects/${subjectId}/topics/${encodeURIComponent(parentTopicName)}/concepts/${encodeURIComponent(item.name)}`);
    }
  };

  return (
    <Card className={cn(
      "overflow-hidden transition-all duration-300",
      isOverdue ? "border-red-500/50" : "border-border"
    )}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-medium line-clamp-1">
            {item.name}
          </CardTitle>
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs font-normal",
              getPhaseBadgeColor(phase)
            )}
          >
            {phase}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pb-2">
        {item.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {item.description}
          </p>
        )}
        
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center">
              <Brain className="h-4 w-4 mr-1.5" />
              Mastery
            </span>
            <span className="font-medium">{masteryLevel}%</span>
          </div>
          <Progress 
            value={masteryLevel} 
            max={100} 
            className={cn("h-2", progressColor)} 
          />
          
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-muted-foreground flex items-center">
              <Calendar className="h-4 w-4 mr-1.5" />
              {nextReviewDate ? (
                <>
                  {isOverdue ? "Overdue: " : "Next review: "}
                  <span className={isOverdue ? "text-red-500 ml-1" : "ml-1"}>
                    {formatDistanceToNow(nextReviewDate, { addSuffix: true })}
                  </span>
                </>
              ) : (
                "No review scheduled"
              )}
            </span>
          </div>
          
          {item.reviewLogs && item.reviewLogs.length > 0 && (
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-muted-foreground flex items-center">
                <Clock className="h-4 w-4 mr-1.5" />
                Last reviewed:
              </span>
              <span>
                {format(new Date(item.reviewLogs[item.reviewLogs.length - 1].date), "MMM d")}
              </span>
            </div>
          )}
          
          {item.reviewInterval && (
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-muted-foreground flex items-center">
                <Star className="h-4 w-4 mr-1.5" />
                Interval:
              </span>
              <span>
                {item.reviewInterval} {item.reviewInterval === 1 ? "day" : "days"}
              </span>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="pt-2 flex justify-between">
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-muted-foreground hover:text-foreground"
          onClick={handleNavigate}
        >
          Details
        </Button>
        
        <Button 
          variant="default" 
          size="sm"
          className={cn(
            isOverdue ? "bg-red-500 hover:bg-red-600" : "bg-primary hover:bg-primary/90"
          )}
          onClick={onReviewClick}
        >
          Review Now
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
} 