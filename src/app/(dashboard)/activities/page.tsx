"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useActivities } from "@/hooks/useActivities";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, CheckCircle, ListTodo, FolderKanban } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<string>("habits");
  
  const { 
    activities, 
    stats, 
    loading, 
    error,
    completeHabit,
    completeTodo,
    updateProjectProgress,
    completeProjectMilestone,
    deleteActivity
  } = useActivities({ autoLoad: true });
  
  const habits = activities.filter(a => a.type === 'habit');
  const todos = activities.filter(a => a.type === 'todo');
  const projects = activities.filter(a => a.type === 'project');

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
        defaultValue="habits" 
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
            onComplete={completeHabit} 
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