"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow, isPast, isToday, isTomorrow, addDays, isAfter } from "date-fns";
import { Calendar, Brain, ArrowRight, Clock, Star, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Sparkles, BarChart3 } from "lucide-react";
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
  const [expanded, setExpanded] = useState(false);
  
  // Get the next review date from the item
  const nextReviewDate = item.nextReview ? new Date(item.nextReview) : null;
  const isValidDate = nextReviewDate && !isNaN(nextReviewDate.getTime());
  const isOverdue = isValidDate && isPast(nextReviewDate) && !isToday(nextReviewDate);
  const isToReviewToday = isValidDate && isToday(nextReviewDate);
  const isTomorrowReview = isValidDate && isTomorrow(nextReviewDate);
  const isUpcoming = isValidDate && !isOverdue && !isToReviewToday && !isTomorrowReview && isAfter(nextReviewDate as Date, new Date());
  
  // Calculate days overdue
  const daysOverdue = isOverdue && isValidDate 
    ? Math.floor(Math.abs((new Date().getTime() - nextReviewDate!.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  
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
  
  // Calculate review history stats
  const reviewLogs = item.reviewLogs || [];
  const totalReviews = reviewLogs.length;
  const averageRating = totalReviews > 0 
    ? reviewLogs.reduce((sum, log) => sum + log.rating, 0) / totalReviews
    : 0;
  
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
  
  // Get card status class
  const getCardStatusClass = () => {
    if (isOverdue) return "border-red-500/50 bg-gradient-to-br from-slate-900 to-red-950/30";
    if (isToReviewToday) return "border-blue-500/50 bg-gradient-to-br from-slate-900 to-blue-950/30";
    if (isTomorrowReview) return "border-yellow-500/50 bg-gradient-to-br from-slate-900 to-yellow-950/30";
    if (isUpcoming) return "border-green-500/50 bg-gradient-to-br from-slate-900 to-green-950/30";
    return "border-slate-800 bg-gradient-to-br from-slate-900 to-slate-800/50";
  };
  
  // Get status badge
  const getStatusBadge = () => {
    if (isOverdue) {
      return (
        <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {daysOverdue > 1 ? `${daysOverdue} days overdue` : "Overdue"}
        </Badge>
      );
    }
    
    if (isToReviewToday) {
      return (
        <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Review today
        </Badge>
      );
    }
    
    if (isTomorrowReview) {
      return (
        <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          Tomorrow
        </Badge>
      );
    }
    
    if (isUpcoming) {
      return (
        <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30 flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          Upcoming
        </Badge>
      );
    }
    
    return null;
  };

  return (
    <Card className={cn(
      "overflow-hidden transition-all duration-300 border hover:shadow-lg hover:shadow-slate-900/50",
      getCardStatusClass()
    )}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle 
            className="text-lg font-medium line-clamp-1 text-slate-100 cursor-pointer hover:text-blue-400 transition-colors"
            onClick={handleNavigate}
          >
            {item.name}
          </CardTitle>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
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
        </div>
      </CardHeader>
      
      <CardContent className="pb-2">
        {item.description && (
          <p className="text-sm text-slate-400 line-clamp-2 mb-3">
            {item.description}
          </p>
        )}
        
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400 flex items-center">
              <Brain className="h-4 w-4 mr-1.5" />
              Mastery
            </span>
            <span className={cn(
              "font-medium",
              masteryLevel < 30 ? "text-red-400" :
              masteryLevel < 60 ? "text-yellow-400" :
              masteryLevel < 80 ? "text-blue-400" : "text-green-400"
            )}>
              {masteryLevel}%
            </span>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <Progress 
              value={masteryLevel} 
              max={100} 
              className={cn(
                "h-full rounded-full transition-all duration-500",
                progressColor
              )} 
            />
          </div>
          
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-slate-400 flex items-center">
              <Calendar className={cn(
                "h-4 w-4 mr-1.5",
                isOverdue ? "text-red-400" : 
                isToReviewToday ? "text-blue-400" : ""
              )} />
              {nextReviewDate && isValidDate ? (
                <>
                  {isOverdue ? "Overdue: " : "Next review: "}
                  <span className={cn(
                    "ml-1",
                    isOverdue ? "text-red-400 font-medium" : 
                    isToReviewToday ? "text-blue-400 font-medium" : "text-slate-300"
                  )}>
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
              <span className="text-slate-400 flex items-center">
                <Clock className="h-4 w-4 mr-1.5" />
                Last reviewed:
              </span>
              <span className="text-slate-300">
                {(() => {
                  try {
                    const lastReviewDate = new Date(item.reviewLogs[item.reviewLogs.length - 1].date);
                    return !isNaN(lastReviewDate.getTime()) 
                      ? format(lastReviewDate, "MMM d") 
                      : "Invalid date";
                  } catch (e) {
                    return "Unknown date";
                  }
                })()}
              </span>
            </div>
          )}
          
          {item.reviewInterval && (
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-slate-400 flex items-center">
                <Star className="h-4 w-4 mr-1.5 text-yellow-400" />
                Interval:
              </span>
              <span className="text-slate-300">
                {item.reviewInterval} {item.reviewInterval === 1 ? "day" : "days"}
              </span>
            </div>
          )}
          
          {/* Expandable section */}
          {expanded && (
            <div className="mt-4 pt-3 border-t border-slate-800/70 animate-fadeIn">
              <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center">
                <BarChart3 className="h-4 w-4 mr-1.5 text-blue-400" />
                Review Stats
              </h4>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-800/50 p-2 rounded">
                  <p className="text-slate-400">Total Reviews</p>
                  <p className="text-slate-200 font-medium">{totalReviews}</p>
                </div>
                
                <div className="bg-slate-800/50 p-2 rounded">
                  <p className="text-slate-400">Avg. Rating</p>
                  <p className="text-slate-200 font-medium">
                    {averageRating ? averageRating.toFixed(1) : "N/A"}
                  </p>
                </div>
                
                {'concepts' in item && (
                  <div className="bg-slate-800/50 p-2 rounded col-span-2">
                    <p className="text-slate-400">Concepts</p>
                    <p className="text-slate-200 font-medium">{item.concepts?.length || 0}</p>
                  </div>
                )}
              </div>
              
              {item.reviewLogs && item.reviewLogs.length > 0 && (
                <div className="mt-3">
                  <h5 className="text-xs font-medium text-slate-400 mb-1">Recent Reviews</h5>
                  <div className="max-h-24 overflow-y-auto text-xs space-y-1 pr-1">
                    {[...item.reviewLogs].reverse().slice(0, 3).map((log, idx) => {
                      try {
                        const reviewDate = new Date(log.date);
                        return (
                          <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-800/50">
                            <span className="text-slate-300">{format(reviewDate, "MMM d")}</span>
                            <div className="flex items-center">
                              <span className="text-slate-400 mr-1">Rating:</span>
                              <span className={cn(
                                "font-medium",
                                log.rating <= 2 ? "text-red-400" :
                                log.rating === 3 ? "text-yellow-400" :
                                "text-green-400"
                              )}>
                                {log.rating}
                              </span>
                            </div>
                          </div>
                        );
                      } catch (e) {
                        return null;
                      }
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="pt-2 flex justify-between border-t border-slate-800/50">
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-slate-400 hover:text-slate-100 hover:bg-slate-800"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4 mr-1" />
              Less
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-1" />
              More
            </>
          )}
        </Button>
        
        <Button 
          variant="default" 
          size="sm"
          className={cn(
            "transition-all duration-300",
            isOverdue 
              ? "bg-red-600 hover:bg-red-700 text-white" 
              : isToReviewToday
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : isTomorrowReview
                  ? "bg-yellow-600 hover:bg-yellow-700 text-white"
                  : "bg-slate-700 hover:bg-slate-600 text-slate-100"
          )}
          onClick={onReviewClick}
        >
          {isOverdue ? (
            <>
              Review Now
              <AlertTriangle className="ml-2 h-4 w-4" />
            </>
          ) : isToReviewToday ? (
            <>
              Review Today
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          ) : (
            <>
              Review
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </CardFooter>
      
      {/* Special indicator for mastery level achievements */}
      {masteryLevel >= 80 && (
        <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
          <div className="absolute top-0 right-0 transform rotate-45 bg-green-500 text-white text-xs font-bold py-1 w-24 text-center" style={{ transform: "rotate(45deg) translate(25%, -25%)" }}>
            <Sparkles className="h-3 w-3 inline-block" />
          </div>
        </div>
      )}
    </Card>
  );
} 