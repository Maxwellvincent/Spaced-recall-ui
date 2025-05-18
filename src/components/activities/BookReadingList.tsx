"use client";

import { useState } from "react";
import { BookReadingHabit } from "@/types/activities";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ChevronRight, 
  BookOpen, 
  Clock, 
  Calendar, 
  Trash2, 
  Edit, 
  Loader2, 
  Award,
  BookText 
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";

interface BookReadingListProps {
  bookHabits: BookReadingHabit[];
  onComplete: (id: string) => Promise<{ xpGained: number; streak: number }>;
  onDelete: (id: string) => Promise<boolean>;
  showAll?: boolean;
}

export function BookReadingList({ bookHabits, onComplete, onDelete, showAll = false }: BookReadingListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [xpGained, setXpGained] = useState<{ [id: string]: number }>({});
  
  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this book? All reading progress will be lost.")) {
      try {
        setDeletingId(id);
        await onDelete(id);
      } catch (error) {
        console.error("Error deleting book reading habit:", error);
      } finally {
        setDeletingId(null);
      }
    }
  };
  
  const calculateProgress = (book: BookReadingHabit["book"]) => {
    if (!book.totalPages || book.totalPages === 0) return 0;
    return Math.min(100, Math.round((book.currentPage / book.totalPages) * 100));
  };
  
  if (bookHabits.length === 0) {
    return null;
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {bookHabits.map(habit => {
        const progress = calculateProgress(habit.book);
        const lastReadText = habit.lastCompleted 
          ? formatDistanceToNow(new Date(habit.lastCompleted), { addSuffix: true })
          : "Never";
        
        return (
          <Card key={habit.id} className="overflow-hidden flex flex-col border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg text-slate-800 dark:text-slate-100">
                  {habit.book.title}
                </CardTitle>
                <Badge 
                  variant={progress === 100 ? 'success' : 'secondary'}
                  className="ml-2"
                >
                  {progress === 100 ? 'Completed' : `${progress}%`}
                </Badge>
              </div>
              {habit.book.author && (
                <p className="text-sm text-slate-500 dark:text-slate-400 -mt-1">
                  by {habit.book.author}
                </p>
              )}
            </CardHeader>
            
            <CardContent className="pb-2 flex-grow">
              <div className="mb-4">
                <Progress 
                  value={progress} 
                  className="h-2" 
                  indicatorClassName={progress === 100 ? "bg-emerald-500" : undefined}
                />
                <div className="flex justify-between mt-1 text-xs text-slate-500 dark:text-slate-400">
                  <span>Page {habit.book.currentPage}</span>
                  {habit.book.totalPages && (
                    <span>of {habit.book.totalPages}</span>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col gap-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="flex items-center text-slate-600 dark:text-slate-400">
                    <BookText className="h-3.5 w-3.5 mr-1.5" />
                    Sessions
                  </span>
                  <span className="font-medium">{habit.readingSessions.length}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="flex items-center text-slate-600 dark:text-slate-400">
                    <Calendar className="h-3.5 w-3.5 mr-1.5" />
                    Last read
                  </span>
                  <span className="font-medium">{lastReadText}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="flex items-center text-slate-600 dark:text-slate-400">
                    <Award className="h-3.5 w-3.5 mr-1.5" />
                    Current streak
                  </span>
                  <span className="font-medium">{habit.currentStreak} days</span>
                </div>
              </div>
              
              {xpGained[habit.id] && (
                <div className="mt-3 text-center animate-pulse">
                  <span className="text-emerald-400 font-semibold">
                    +{xpGained[habit.id]} XP
                  </span>
                </div>
              )}
            </CardContent>
            
            <CardFooter className="pt-2 flex justify-between">
              <Button
                variant="outline"
                size="sm"
                className="text-red-400 hover:text-red-300 hover:bg-red-950"
                onClick={() => handleDelete(habit.id)}
                disabled={deletingId === habit.id}
              >
                {deletingId === habit.id ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Deleting...
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </span>
                )}
              </Button>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/habits/book/${habit.id}`)}
                >
                  <BookOpen className="h-3 w-3 mr-1" />
                  Details
                </Button>
                
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => router.push(`/habits/book/${habit.id}/record`)}
                >
                  <ChevronRight className="h-3 w-3" />
                  Log Reading
                </Button>
              </div>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
} 