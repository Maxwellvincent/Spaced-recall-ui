"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useActivities } from "@/hooks/useActivities";
import { useSearchParams, useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  Plus, 
  CheckCircle, 
  ListTodo, 
  FolderKanban, 
  Clock,
  ChevronDown,
  BookOpen
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemedHeader } from "@/components/ui/themed-components";
import { useTheme } from "@/contexts/theme-context";
import { HabitList } from "@/components/activities/HabitList";
import { TodoList } from "@/components/activities/TodoList";
import { ProjectList } from "@/components/activities/ProjectList";
import { ActivityStats } from "@/components/activities/ActivityStats";
import Link from "next/link";
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isToday } from 'date-fns';
import { ThemedCalendar } from "@/components/ui/themed-calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { BookReadingList } from "@/components/activities/BookReadingList";
import { getFirebaseAuth } from "@/lib/firebase";

export default function ActivitiesPage() {
  const { user, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<string>(tabFromUrl || "habits");
  const router = useRouter();
  
  useEffect(() => {
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);
  
  const {
    activities: allActivities,
    stats,
    loading,
    error,
    completeHabit,
    completeTodo,
    updateProjectProgress,
    completeProjectMilestone,
    deleteActivity,
    recordTimedSession,
    loadActivities
  } = useActivities({ autoLoad: true });

  // Separate hooks for each tab
  const { activities: projectActivities } = useActivities({ type: 'project' });

  // Combine regular and book reading habits for the habits tab
  const allHabits = allActivities.filter(a => a.type === 'habit');
  const bookHabits = allHabits.filter(h => h.habitSubtype === 'book-reading');
  const regularHabits = allHabits.filter(h => !h.habitSubtype);
  const habits = allHabits; // Use all for calendar and list

  const todos = allActivities.filter(a => a.type === 'todo');
  // Use projectActivities for the projects tab
  const projects = projectActivities;

  const handleTimedActivityComplete = async (
    activityId: string,
    duration: number,
    activeTime: number
  ) => {
    try {
      await recordTimedSession(activityId, {
        duration,
        activeTime,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error recording timed session:', error);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <ThemedHeader
          theme={theme}
          title="Activities"
          subtitle="Track your habits, todos, and projects"
        />
        
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Timer</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/activities/quick-timer" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Quick Timer</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/activities/new/timed" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span>New Timed Activity</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Link href="/activities/new/habit">
            <Button variant="outline" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>New Habit</span>
            </Button>
          </Link>
          
          <Link href="/activities/new/todo">
            <Button variant="outline" className="flex items-center gap-2">
              <ListTodo className="h-4 w-4" />
              <span>New Todo</span>
            </Button>
          </Link>
          
          <Link href="/activities/new/project">
            <Button variant="outline" className="flex items-center gap-2">
              <FolderKanban className="h-4 w-4" />
              <span>New Project</span>
            </Button>
          </Link>
        </div>
      </div>
      
      {stats && <ActivityStats stats={stats} />}
      
      <Tabs 
        defaultValue={activeTab} 
        value={activeTab}
        onValueChange={setActiveTab}
        className="mt-8"
      >
        <TabsList className="grid grid-cols-3 mb-8">
          <TabsTrigger value="habits" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            <span>Habits</span>
          </TabsTrigger>
          <TabsTrigger value="todos" className="flex items-center gap-2">
            <ListTodo className="h-4 w-4" />
            <span>Todos</span>
          </TabsTrigger>
          <TabsTrigger value="projects" className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4" />
            <span>Projects</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="habits">
          <div className="mb-4 flex justify-between items-center">
            <h3 className="text-lg font-semibold">Habits</h3>
            <Button onClick={() => router.push('/dashboard/habits/new')} variant="outline">
              New Habit
            </Button>
          </div>
          <HabitsThemedCalendar habits={habits} theme={theme} refreshHabits={loadActivities} />
          <HabitList habits={habits} onComplete={completeHabit} onDelete={deleteActivity} renderBookHabit={renderBookHabit} />
        </TabsContent>
        
        <TabsContent value="todos">
          <TodoList 
            todos={todos} 
            onComplete={completeTodo} 
            onDelete={deleteActivity} 
          />
        </TabsContent>
        
        <TabsContent value="projects">
          <ProjectList 
            projects={projects} 
            onUpdateProgress={updateProjectProgress}
            onCompleteMilestone={completeProjectMilestone}
            onDelete={deleteActivity} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper to render book reading habits in the list
function renderBookHabit(habit) {
  if (habit.habitSubtype === 'book-reading') {
    return (
      <div className="flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-blue-400" />
        <span className="font-semibold">{habit.book?.title || habit.name}</span>
        {habit.book?.author && <span className="text-xs text-slate-400 ml-2">by {habit.book.author}</span>}
        <span className="ml-2 text-xs text-emerald-400">📚 Book</span>
      </div>
    );
  }
  return null;
}

function HabitsThemedCalendar({ habits, theme, refreshHabits }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedHabits, setSelectedHabits] = useState([]);
  const [dialogMode, setDialogMode] = useState('add'); // 'add' or 'remove'

  // Map each habit completion to a calendar event
  const events = habits.flatMap(habit => {
    return (habit.completionHistory || [])
      .filter(entry => entry.completed)
      .map(entry => {
        const [year, month, day] = entry.date.split('-');
        const isBook = habit.habitSubtype === 'book-reading';
        return {
          id: `${habit.id}-${entry.date}`,
          title: isBook ? `📚 ${habit.book?.title || habit.name}` : habit.name,
          date: new Date(Number(year), Number(month) - 1, Number(day)),
          type: isBook ? 'reading' : 'habit',
          urgency: habit.difficulty === 'hard' ? 'high' : habit.difficulty === 'medium' ? 'medium' : 'low',
          completed: true,
          habitId: habit.id,
          habitColor: habit.color,
          habitEmoji: habit.emoji,
          isBook,
        };
      });
  });

  // Get unique habits for the legend
  const uniqueHabits = habits.map(habit => ({
    id: habit.id,
    name: habit.name,
    color: habit.color,
    emoji: habit.emoji,
    difficulty: habit.difficulty,
  }));

  // Emoji/color fallback by difficulty
  const emojiByDifficulty = { easy: '🟢', medium: '🟡', hard: '🔴' };
  const colorByDifficulty = { easy: '#22c55e', medium: '#eab308', hard: '#ef4444' };

  // Helpers to get completed/not-completed habits for a date
  function getLocalDateString(date) {
    if (!date) return "";
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }
  const completedHabitsOnDate = (date) => {
    if (!date) return [];
    return habits.filter(habit =>
      (habit.completionHistory && habit.completionHistory.some(h => h.date === getLocalDateString(date) && h.completed))
    );
  };
  const notCompletedHabitsOnDate = (date) => {
    if (!date) return [];
    return habits.filter(habit =>
      !(habit.completionHistory && habit.completionHistory.some(h => h.date === getLocalDateString(date) && h.completed))
    );
  };

  // Add/remove completion handlers
  const handleAddCompletion = async () => {
    if (!selectedHabits.length || !selectedDate) return;
    try {
      const auth = getFirebaseAuth();
      const user = auth.currentUser;
      if (!user) {
        toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
        return;
      }
      const token = await user.getIdToken();
      console.log("[AddCompletion] User:", user);
      console.log("[AddCompletion] Token:", token);
      const res = await fetch("/api/activities/update-completion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          habitIds: selectedHabits.map(h => h.id),
          date: selectedDate.toISOString().slice(0, 10),
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to add completion");
      }
      setDialogOpen(false);
      toast({ title: "Success", description: "Completion added!" });
      refreshHabits();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };
  const handleRemoveCompletion = async () => {
    if (!selectedHabits.length || !selectedDate) return;
    try {
      const auth = getFirebaseAuth();
      const user = auth.currentUser;
      if (!user) {
        toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
        return;
      }
      const token = await user.getIdToken();
      console.log("[RemoveCompletion] User:", user);
      console.log("[RemoveCompletion] Token:", token);
      const res = await fetch("/api/activities/update-completion", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          habitIds: selectedHabits.map(h => h.id),
          date: selectedDate.toISOString().slice(0, 10),
        }),
      });
      if (!res.ok) {
        throw new Error("Failed to remove completion");
      }
      setDialogOpen(false);
      toast({ title: "Success", description: "Completion removed!" });
      refreshHabits();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // Calendar click handlers
  const handleDateClick = (date) => {
    setSelectedDate(date);
    setDialogMode('add');
    setSelectedHabits([]);
    setDialogOpen(true);
  };
  const handleEventClick = (event) => {
    setSelectedDate(event.date);
    setDialogMode('remove');
    setSelectedHabits([habits.find(h => h.id === event.habitId)]);
    setDialogOpen(true);
  };

  // Theme background/text for modal
  const themeBg = {
    dbz: "bg-yellow-950/90 text-yellow-200",
    naruto: "bg-orange-950/90 text-orange-100",
    hogwarts: "bg-purple-950/90 text-purple-100",
    classic: "bg-slate-900 text-slate-100"
  };

  return (
    <div className="mb-8">
      <ThemedCalendar
        theme={theme}
        events={events.map(event => ({
          ...event,
          title: `${uniqueHabits.find(h => h.name === event.title)?.emoji || emojiByDifficulty[uniqueHabits.find(h => h.name === event.title)?.difficulty || 'easy']} ${event.title}`,
        }))}
        className="mb-4"
        heading="Habit Calendar"
        onEventClick={handleEventClick}
        onDayClick={handleDateClick}
      />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className={themeBg[theme] || themeBg.classic}>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'add' ? `Add completion for ${selectedDate ? selectedDate.toLocaleDateString() : ''}` : `Remove completion for ${selectedDate ? selectedDate.toLocaleDateString() : ''}`}
            </DialogTitle>
          </DialogHeader>
          <div className="mb-4">
            <label className="block mb-2">Select Habit</label>
            <select
              className="w-full border rounded px-2 py-1 bg-white text-slate-900"
              value={selectedHabits[0]?.id || ''}
              onChange={e => setSelectedHabits([habits.find(h => h.id === e.target.value)])}
            >
              <option value="">Select a habit</option>
              {(dialogMode === 'add' ? notCompletedHabitsOnDate(selectedDate) : completedHabitsOnDate(selectedDate)).map(habit => (
                <option key={habit.id} value={habit.id}>{habit.name}</option>
              ))}
            </select>
          </div>
          <DialogFooter>
            {dialogMode === 'add' ? (
              <Button onClick={handleAddCompletion} disabled={!selectedHabits.length || !selectedDate}>Add Completion</Button>
            ) : (
              <Button variant="destructive" onClick={handleRemoveCompletion} disabled={!selectedHabits.length || !selectedDate}>Remove Completion</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="flex flex-wrap gap-4 mt-2 text-xs items-center">
        <span className="font-semibold mr-2">Legend:</span>
        {uniqueHabits.map(habit => (
          <div key={habit.id} className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 border border-slate-700">
            <span style={{ fontSize: '1.2em' }}>{habit.emoji || emojiByDifficulty[habit.difficulty]}</span>
            <span className="ml-1" style={{ color: habit.color || colorByDifficulty[habit.difficulty] }}>{habit.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
} 