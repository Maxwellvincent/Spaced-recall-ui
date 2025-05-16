import { useState } from "react";
import { Habit } from "@/types/activities";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, Trash2, Edit, Calendar, AlertCircle, Award, Loader2 } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface HabitListProps {
  habits: Habit[];
  onComplete: (id: string) => Promise<{ xpGained: number; streak: number }>;
  onDelete: (id: string) => Promise<boolean>;
}

export function HabitList({ habits, onComplete, onDelete }: HabitListProps) {
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [xpGained, setXpGained] = useState<{ [id: string]: number }>({});
  
  const handleComplete = async (id: string) => {
    try {
      setCompletingId(id);
      const result = await onComplete(id);
      setXpGained({ ...xpGained, [id]: result.xpGained });
      
      // Show XP gained for 3 seconds
      setTimeout(() => {
        setXpGained(prev => {
          const newState = { ...prev };
          delete newState[id];
          return newState;
        });
      }, 3000);
    } catch (error) {
      console.error("Error completing habit:", error);
    } finally {
      setCompletingId(null);
    }
  };
  
  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this habit?")) {
      try {
        setDeletingId(id);
        await onDelete(id);
      } catch (error) {
        console.error("Error deleting habit:", error);
      } finally {
        setDeletingId(null);
      }
    }
  };
  
  if (habits.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-900/50 rounded-lg border border-slate-800">
        <AlertCircle className="mx-auto h-12 w-12 text-slate-500 mb-4" />
        <h3 className="text-xl font-medium text-slate-300 mb-2">No habits yet</h3>
        <p className="text-slate-400 mb-6">Start building consistent habits to earn XP and streaks</p>
        <Link href="/activities/new/habit">
          <Button>Create your first habit</Button>
        </Link>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {habits.map(habit => {
        const isCompleted = habit.completionHistory.length > 0 && 
          new Date(habit.completionHistory[0].date).toDateString() === new Date().toDateString();
        
        const lastCompletedText = habit.lastCompleted 
          ? formatDistanceToNow(new Date(habit.lastCompleted), { addSuffix: true })
          : "Never";
          
        return (
          <Card key={habit.id} className="bg-slate-950 border-slate-800 overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg text-slate-100">{habit.name}</CardTitle>
                <Badge 
                  variant={habit.difficulty === 'easy' ? 'outline' : 
                          habit.difficulty === 'medium' ? 'secondary' : 'destructive'}
                  className="ml-2"
                >
                  {habit.difficulty}
                </Badge>
              </div>
              <div className="flex gap-2 text-xs text-slate-400 mt-1">
                <span className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {habit.timeRequired || 15} min
                </span>
                <span className="flex items-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  {habit.frequency}
                </span>
              </div>
            </CardHeader>
            
            <CardContent className="pb-2">
              {habit.description && (
                <p className="text-sm text-slate-300 mb-3">{habit.description}</p>
              )}
              
              <div className="flex justify-between items-center mb-1 text-xs text-slate-400">
                <span>Completed {habit.completedCount} times</span>
                <span>Last: {lastCompletedText}</span>
              </div>
              
              <div className="flex items-center gap-2 mt-3">
                <Award className="h-4 w-4 text-amber-500" />
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-slate-400">Current streak</span>
                    <span className="text-xs font-medium text-amber-400">
                      {habit.currentStreak} days
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(100, (habit.currentStreak / Math.max(habit.bestStreak, 7)) * 100)} 
                    className="h-1 bg-slate-800" 
                    indicatorClassName="bg-amber-500"
                  />
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
            
            <CardFooter className="pt-2">
              <div className="flex justify-between w-full">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-400 hover:text-red-300 hover:bg-red-950"
                  onClick={() => handleDelete(habit.id)}
                  disabled={!!deletingId || !!completingId}
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
                  <Link href={`/activities/edit/habit/${habit.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-blue-400 hover:text-blue-300 hover:bg-blue-950"
                      disabled={!!deletingId || !!completingId}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  </Link>
                  
                  <Button
                    variant={isCompleted ? "secondary" : "default"}
                    size="sm"
                    onClick={() => handleComplete(habit.id)}
                    disabled={isCompleted || !!completingId || !!deletingId}
                  >
                    {completingId === habit.id ? (
                      <span className="flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Completing...
                      </span>
                    ) : isCompleted ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Completed
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Complete
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
} 