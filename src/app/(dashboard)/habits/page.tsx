"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Habit, BookReadingHabit } from "@/types/activities";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HabitList } from "@/components/activities/HabitList";
import { BookReadingList } from "@/components/activities/BookReadingList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, PlusCircle, BookOpen, Check } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isToday } from 'date-fns';

export default function HabitsPage() {
  const router = useRouter();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [bookHabits, setBookHabits] = useState<BookReadingHabit[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    fetchHabits();
  }, []);

  const fetchHabits = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/activities?type=habit");
      const data = await response.json();
      
      if (response.ok) {
        // Separate book reading habits from regular habits
        const allHabits = data.activities as Habit[];
        const books = allHabits.filter(h => (h as any).habitSubtype === 'book-reading') as BookReadingHabit[];
        const regular = allHabits.filter(h => !(h as any).habitSubtype) as Habit[];
        
        setHabits(regular);
        setBookHabits(books);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch habits",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching habits:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while fetching habits",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteHabit = async (id: string) => {
    try {
      const response = await fetch("/api/activities/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ activityId: id }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: `Habit completed! +${data.xpGained} XP`,
          variant: "default",
        });

        // Refresh habits to update UI
        fetchHabits();
        return data;
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to complete habit",
          variant: "destructive",
        });
        return { xpGained: 0, streak: 0 };
      }
    } catch (error) {
      console.error("Error completing habit:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return { xpGained: 0, streak: 0 };
    }
  };

  const handleDeleteHabit = async (id: string) => {
    try {
      const response = await fetch(`/api/activities?id=${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: "Habit deleted successfully",
          variant: "default",
        });

        // Refresh habits to update UI
        fetchHabits();
        return true;
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete habit",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error("Error deleting habit:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return false;
    }
  };

  const allHabits = [...habits, ...bookHabits] as Habit[];

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Habits</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Track and build consistent habits to earn XP and streaks
          </p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <Button 
            variant="outline" 
            onClick={() => router.push("/habits/new")}
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            New Habit
          </Button>
          <Button 
            onClick={() => router.push("/habits/book/new")}
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Add Book
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="all">All Habits ({allHabits.length})</TabsTrigger>
          <TabsTrigger value="regular">Regular ({habits.length})</TabsTrigger>
          <TabsTrigger value="books">Books ({bookHabits.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : allHabits.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-6">
                  <h3 className="text-xl font-medium mb-2">No habits yet</h3>
                  <p className="text-slate-500 mb-4">
                    Start building consistent habits to earn XP and streaks
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button 
                      variant="outline" 
                      onClick={() => router.push("/habits/new")}
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      New Habit
                    </Button>
                    <Button 
                      onClick={() => router.push("/habits/book/new")}
                    >
                      <BookOpen className="h-4 w-4 mr-2" />
                      Add Book
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <HabitCalendar habits={allHabits} />
              <HabitList habits={habits} onComplete={handleCompleteHabit} onDelete={handleDeleteHabit} />
            </>
          )}
        </TabsContent>

        <TabsContent value="regular">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : habits.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-6">
                  <h3 className="text-xl font-medium mb-2">No regular habits yet</h3>
                  <p className="text-slate-500 mb-4">
                    Create a new habit to start building consistency
                  </p>
                  <Button 
                    onClick={() => router.push("/habits/new")}
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    New Habit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <HabitList 
              habits={habits} 
              onComplete={handleCompleteHabit}
              onDelete={handleDeleteHabit}
            />
          )}
        </TabsContent>

        <TabsContent value="books">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : bookHabits.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-6">
                  <h3 className="text-xl font-medium mb-2">No books yet</h3>
                  <p className="text-slate-500 mb-4">
                    Add a book to start tracking your reading progress
                  </p>
                  <Button 
                    onClick={() => router.push("/habits/book/new")}
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Add Book
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <BookReadingList 
              bookHabits={bookHabits} 
              onComplete={handleCompleteHabit}
              onDelete={handleDeleteHabit}
              showAll
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function HabitCalendar({ habits }: { habits: Habit[] }) {
  // For demo: assume each habit has a completedDates: string[] (ISO date)
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Map: habitId -> Set of completed date strings
  const habitCompletion: Record<string, Set<string>> = {};
  habits.forEach(habit => {
    habitCompletion[habit.id] = new Set((habit as any).completedDates || []);
  });

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold mb-2">Habit Calendar</h2>
      <div className="overflow-x-auto">
        <table className="min-w-max border-collapse">
          <thead>
            <tr>
              <th className="p-1 text-xs text-slate-400">Sun</th>
              <th className="p-1 text-xs text-slate-400">Mon</th>
              <th className="p-1 text-xs text-slate-400">Tue</th>
              <th className="p-1 text-xs text-slate-400">Wed</th>
              <th className="p-1 text-xs text-slate-400">Thu</th>
              <th className="p-1 text-xs text-slate-400">Fri</th>
              <th className="p-1 text-xs text-slate-400">Sat</th>
            </tr>
          </thead>
          <tbody>
            {/* Render weeks */}
            {(() => {
              const weeks = [];
              let week: JSX.Element[] = [];
              let dayIdx = 0;
              // Pad first week
              for (let i = 0; i < days[0].getDay(); i++) {
                week.push(<td key={`pad-${i}`}></td>);
                dayIdx++;
              }
              days.forEach((day, idx) => {
                week.push(
                  <td key={day.toISOString()} className="p-1 align-top">
                    <div className={`rounded-full w-8 h-8 flex flex-col items-center justify-center text-xs ${isToday(day) ? 'bg-blue-700 text-white' : 'bg-slate-800 text-slate-300'}`}
                         style={{ border: isToday(day) ? '2px solid #60a5fa' : undefined }}>
                      {format(day, 'd')}
                      {/* For each habit, show a check if completed */}
                      <div className="flex flex-wrap gap-0.5 mt-0.5">
                        {habits.map(habit => (
                          <span key={habit.id} className={`inline-block w-2 h-2 rounded-full ${habitCompletion[habit.id].has(format(day, 'yyyy-MM-dd')) ? 'bg-green-400' : 'bg-slate-500/40'}`}></span>
                        ))}
                      </div>
                    </div>
                  </td>
                );
                dayIdx++;
                if (dayIdx === 7) {
                  weeks.push(<tr key={`week-${idx}`}>{week}</tr>);
                  week = [];
                  dayIdx = 0;
                }
              });
              // Pad last week
              if (week.length > 0) {
                while (week.length < 7) week.push(<td key={`endpad-${week.length}`}></td>);
                weeks.push(<tr key="last-week">{week}</tr>);
              }
              return weeks;
            })()}
          </tbody>
        </table>
        <div className="flex gap-2 mt-2 text-xs">
          {habits.map(habit => (
            <div key={habit.id} className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-green-400"></span>
              <span>{habit.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 