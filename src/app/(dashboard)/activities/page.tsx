"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useActivities } from "@/hooks/useActivities";
import { useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  Plus, 
  CheckCircle, 
  ListTodo, 
  FolderKanban, 
  Clock,
  ChevronDown
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

export default function ActivitiesPage() {
  const { user, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<string>(tabFromUrl || "habits");
  
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
    recordTimedSession
  } = useActivities({ autoLoad: true });

  // Separate hooks for each tab
  const { activities: projectActivities } = useActivities({ type: 'project' });

  const habits = allActivities.filter(a => a.type === 'habit');
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
          <HabitList 
            habits={habits} 
            onComplete={handleTimedActivityComplete}
            onDelete={deleteActivity} 
          />
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