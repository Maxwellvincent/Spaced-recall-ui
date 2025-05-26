import { useState } from "react";
import { Habit } from "@/types/activities";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, Trash2, Edit, Calendar, AlertCircle, Award, Loader2, BookOpen, Flame, Star } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { TimedActivity } from './TimedActivity';
import { OvertimeInfo } from '@/types/timer';

interface HabitListProps {
  habits: Habit[];
  onComplete: (habitId: string, duration?: number, activeTime?: number) => void;
  onDelete: (habitId: string) => void;
  compact?: boolean;
  renderBookHabit?: (habit: any) => React.ReactNode;
}

export function HabitList({ habits, onComplete, onDelete, compact, renderBookHabit }: HabitListProps) {
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const emojiByDifficulty = { easy: '🟢', medium: '🟡', hard: '🔴' };
  const colorByDifficulty = { easy: '#22c55e', medium: '#eab308', hard: '#ef4444' };
  
  // Helper to calculate total XP for a habit from its completionHistory
  function calculateHabitXP(habit) {
    if (!habit.completionHistory || habit.completionHistory.length === 0) return 0;
    // Sort by date ascending
    const completions = [...habit.completionHistory]
      .filter(h => h.completed)
      .sort((a, b) => a.date.localeCompare(b.date));
    let totalXP = 0;
    let streak = 0;
    let prevDate = null;
    for (let i = 0; i < completions.length; i++) {
      const currDate = new Date(completions[i].date);
      if (prevDate) {
        const diff = (currDate - prevDate) / (1000 * 60 * 60 * 24);
        if (diff === 1) {
          streak++;
        } else {
          streak = 1;
        }
      } else {
        streak = 1;
      }
      totalXP += 10 + 5 * (streak - 1);
      prevDate = currDate;
    }
    return totalXP;
  }
  
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
  
  const handleEdit = (id: string) => {
    window.location.href = `/dashboard/habits/${id}/edit`;
  };
  
  if (habits.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-900/50 rounded-lg border border-slate-800">
        <AlertCircle className="mx-auto h-12 w-12 text-slate-500 mb-4" />
        <h3 className="text-xl font-medium text-slate-300 mb-2">No habits yet</h3>
        <p className="text-slate-400 mb-6">Start building consistent habits to earn XP and streaks</p>
        <Link href="/dashboard/habits/new">
          <Button>Create your first habit</Button>
        </Link>
      </div>
    );
  }
  
  // Only render the pill style for all habits
  return (
    <div className="flex flex-wrap gap-2">
      {habits.map((habit) => {
        const emoji = habit.emoji || emojiByDifficulty[habit.difficulty] || '🟢';
        const color = habit.color || colorByDifficulty[habit.difficulty] || '#22c55e';
        const totalXP = calculateHabitXP(habit);
        const isHovered = hoveredId === habit.id;
        return (
          <div
            key={habit.id}
            className={`relative flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-white text-sm font-medium shadow cursor-pointer transition-all duration-200 group hover:shadow-lg hover:bg-slate-700 ${isHovered ? 'pr-32' : ''}`}
            onMouseEnter={() => setHoveredId(habit.id)}
            onMouseLeave={() => setHoveredId(null)}
            style={{ borderColor: color, minWidth: 'fit-content', maxWidth: isHovered ? 400 : undefined }}
          >
            <span style={{ fontSize: '1.2em' }}>{emoji}</span>
            <span className="ml-1" style={{ color }}>{habit.name}</span>
            {/* Streak badge */}
            {habit.streak && habit.streak > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-orange-900 text-orange-300 text-xs font-semibold flex items-center gap-1"><Flame className="h-3 w-3 inline" /> {habit.streak}</span>
            )}
            {/* XP badge */}
            <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-900 text-blue-300 text-xs font-semibold flex items-center gap-1"><Star className="h-3 w-3 inline" /> {totalXP} XP</span>
            {/* Actions grow to the right on hover */}
            <div
              className={`flex items-center gap-1 ml-2 overflow-hidden transition-all duration-200 ${isHovered ? 'w-auto opacity-100 ml-4' : 'w-0 opacity-0'}`}
              style={{
                maxWidth: isHovered ? 200 : 0,
                minWidth: isHovered ? 120 : 0,
                pointerEvents: isHovered ? 'auto' : 'none',
              }}
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onComplete(habit.id)}
                className="text-green-500 hover:text-green-400"
                title="Complete"
                disabled={completingId === habit.id}
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
              {habit.habitSubtype === 'book-reading' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => window.location.href = `/dashboard/habits/book/${habit.id}/record`}
                  className="text-purple-500 hover:text-purple-400"
                  title="Log Reading"
                >
                  <BookOpen className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.location.href = `/dashboard/habits/${habit.id}/edit`}
                className="text-blue-500 hover:text-blue-400"
                title="Edit"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(habit.id)}
                className="text-red-500 hover:text-red-400"
                title="Delete"
                disabled={deletingId === habit.id}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
} 