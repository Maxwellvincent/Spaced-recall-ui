import { useState } from "react";
import { Habit } from "@/types/activities";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, Trash2, Edit, Calendar, AlertCircle, Award, Loader2 } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { TimedActivity } from './TimedActivity';
import { OvertimeInfo } from '@/types/timer';

interface HabitListProps {
  habits: Habit[];
  onComplete: (habitId: string, duration?: number, activeTime?: number) => void;
  onDelete: (habitId: string) => void;
}

export function HabitList({ habits, onComplete, onDelete }: HabitListProps) {
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [xpGained, setXpGained] = useState<{ [id: string]: number }>({});
  const [expandedHabit, setExpandedHabit] = useState<string | null>(null);
  
  const handleComplete = async (id: string) => {
    try {
      setCompletingId(id);
      onComplete(id);
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
        onDelete(id);
      } catch (error) {
        console.error("Error deleting habit:", error);
      } finally {
        setDeletingId(null);
      }
    }
  };
  
  const handleSessionComplete = (
    habitId: string,
    duration: number,
    overtime: OvertimeInfo,
    activeTime: number,
    idleTime: number
  ) => {
    onComplete(habitId, duration, activeTime);
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
    <div className="space-y-4">
      {habits.map((habit) => (
        <div key={habit.id}>
          {habit.isTimed ? (
            <TimedActivity
              activityId={habit.id}
              activityName={habit.name}
              description={habit.description}
              onSessionComplete={(duration, overtime, activeTime, idleTime) =>
                handleSessionComplete(habit.id, duration, overtime, activeTime, idleTime)
              }
            />
          ) : (
            <Card className="p-4 bg-slate-800 border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">{habit.name}</h3>
                  {habit.description && (
                    <p className="text-sm text-slate-400">{habit.description}</p>
                  )}
                  {habit.streak && habit.streak > 0 && (
                    <div className="text-sm text-orange-400 mt-1">
                      🔥 {habit.streak} day streak
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleComplete(habit.id)}
                    className="text-green-500 hover:text-green-400"
                  >
                    <CheckCircle className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(habit.id)}
                    className="text-red-500 hover:text-red-400"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      ))}
    </div>
  );
} 