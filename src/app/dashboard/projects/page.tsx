"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getFirebaseDb } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/contexts/theme-context";
import { Loader2, Plus, Calendar, Clock, BarChart, Trash, Edit, ChevronDown, ChevronRight, CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { syncProjectToActivities, deleteProjectFromActivities } from "@/utils/syncProjectsToActivities";
import { logUserActivity } from '@/utils/logUserActivity';
import { ThemedHeader } from '@/components/ui/themed-header';
import { ThemedAchievement } from '@/components/ui/themed-achievement';

// Use getFirebaseDb() to ensure proper initialization
const db = getFirebaseDb();

interface Project {
  id: string;
  name: string;
  description: string;
  status: 'planning' | 'in-progress' | 'completed' | 'on-hold';
  startDate?: string;
  endDate?: string;
  createdAt: string;
  userId: string;
  tasks?: ProjectTask[];
  progress: number;
}

interface ProjectTask {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
  estimatedTime?: number; // Minutes
  loggedTime?: number; // Total minutes logged
  timeEntries?: Array<{
    date: string;
    minutes: number;
    xpEarned: number;
  }>;
}

export default function ProjectsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    status: "planning" as const,
    progressMethod: "manual" as 'manual' | 'tasks' | 'time',
  });
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [isClient, setIsClient] = useState(false);
  const [isLogTimeDialogOpen, setIsLogTimeDialogOpen] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [loggedTime, setLoggedTime] = useState("");
  const [xpEarned, setXpEarned] = useState(0);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    dueDate: "",
    estimatedTime: ""
  });
  const [isEditTaskDialogOpen, setIsEditTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<{
    projectId: string;
    taskId: string;
    title: string;
    dueDate: string;
    estimatedTime: string;
  }>({
    projectId: "",
    taskId: "",
    title: "",
    dueDate: "",
    estimatedTime: ""
  });
  
  // Set isClient to true when component mounts
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Get theme information
  const { theme } = useTheme();
  
  // Function to get theme-specific styles
  const getThemeStyles = () => {
    switch (theme?.toLowerCase()) {
      case 'dbz':
        return {
          primary: 'bg-yellow-600 hover:bg-yellow-700',
          secondary: 'bg-yellow-700/50',
          accent: 'text-yellow-400',
          border: 'border-yellow-600',
          cardBg: 'bg-yellow-950/50',
          itemCard: 'bg-yellow-900 hover:bg-yellow-800',
          progressBar: 'bg-yellow-500',
          header: 'Training Projects',
          buttonHover: 'hover:bg-yellow-700',
          textPrimary: 'text-white',
          textSecondary: 'text-yellow-100',
          textMuted: 'text-yellow-200/80'
        };
      case 'naruto':
        return {
          primary: 'bg-orange-600 hover:bg-orange-700',
          secondary: 'bg-orange-700/50',
          accent: 'text-orange-400',
          border: 'border-orange-600',
          cardBg: 'bg-orange-950/50',
          itemCard: 'bg-orange-900 hover:bg-orange-800',
          progressBar: 'bg-orange-500',
          header: 'Ninja Projects',
          buttonHover: 'hover:bg-orange-700',
          textPrimary: 'text-white',
          textSecondary: 'text-orange-100',
          textMuted: 'text-orange-200/80'
        };
      case 'hogwarts':
        return {
          primary: 'bg-purple-600 hover:bg-purple-700',
          secondary: 'bg-purple-700/50',
          accent: 'text-purple-400',
          border: 'border-purple-600',
          cardBg: 'bg-purple-950/50',
          itemCard: 'bg-purple-900 hover:bg-purple-800',
          progressBar: 'bg-purple-500',
          header: 'Magical Projects',
          buttonHover: 'hover:bg-purple-700',
          textPrimary: 'text-white',
          textSecondary: 'text-purple-100',
          textMuted: 'text-purple-200/80'
        };
      default:
        return {
          primary: 'bg-blue-600 hover:bg-blue-700',
          secondary: 'bg-blue-700/50',
          accent: 'text-blue-400',
          border: 'border-blue-600',
          cardBg: 'bg-slate-800',
          itemCard: 'bg-slate-700 hover:bg-slate-600',
          progressBar: 'bg-blue-500',
          header: 'Projects',
          buttonHover: 'hover:bg-blue-700',
          textPrimary: 'text-white',
          textSecondary: 'text-slate-100',
          textMuted: 'text-slate-300'
        };
    }
  };

  const themeStyles = getThemeStyles();

  const fetchProjects = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const projectsQuery = query(
        collection(db, "projects"),
        where("userId", "==", user.uid)
      );
      const querySnapshot = await getDocs(projectsQuery);
      const projectsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Project[];
      projectsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setProjects(projectsList);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    fetchProjects();
  }, [user, authLoading, router]);

  const handleAddProject = async () => {
    if (!user || !newProject.name.trim()) {
      console.log("Cannot add project: user is null or project name is empty", { user, projectName: newProject.name });
      return;
    }

    try {
      console.log("Adding project:", newProject);
      const projectData = {
        name: newProject.name,
        description: newProject.description,
        status: newProject.status,
        createdAt: new Date().toISOString(),
        userId: user.uid,
        progress: 0,
        tasks: [],
        progressMethod: newProject.progressMethod,
      };

      console.log("Project data:", projectData);
      console.log("Adding to Firestore collection 'projects'");
      // Write to global projects collection
      const docRef = await addDoc(collection(db, "projects"), projectData);
      // Write to user subcollection
      await setDoc(doc(db, "users", user.uid, "projects", docRef.id), { id: docRef.id, ...projectData });
      console.log("Project added with ID:", docRef.id);
      
      const newProjectItem = {
        id: docRef.id,
        ...projectData
      } as Project;
      
      setProjects(prev => [newProjectItem, ...prev]);
      setNewProject({
        name: "",
        description: "",
        status: "planning",
        progressMethod: "manual",
      });
      setIsAddDialogOpen(false);
      
      // Add base XP for creating a new project
      const baseProjectXP = 100;
      
      // Update user XP in Firestore
      try {
        const userRef = doc(db, "users", user.uid);
        
        // Get current user data
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const currentXP = userData.xp || 0;
          
          // Update user XP
          await updateDoc(userRef, {
            xp: currentXP + baseProjectXP,
            lastActivityDate: new Date().toISOString()
          });
          
          toast.success(`Project added successfully! Earned ${baseProjectXP} XP`);
        } else {
          toast.success("Project added successfully");
        }
      } catch (userError) {
        console.error("Error updating user XP:", userError);
        toast.success("Project added successfully");
      }

      // Sync to activities collection
      try {
        const activityId = await syncProjectToActivities(user.uid, docRef.id);
        console.log("Project synced to activities with ID:", activityId);
      } catch (syncError) {
        console.error("Error syncing project to activities:", syncError);
        // Don't show error to user, as the project was still created successfully
      }

      await logUserActivity(user.uid, {
        type: "project_created",
        detail: `Created project \"${newProject.name}\"`,
        projectId: docRef.id,
      });

      await fetchProjects(); // Refetch after add
    } catch (error) {
      console.error("Error adding project:", error);
      toast.error("Failed to add project");
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      const projectRef = doc(db, "projects", projectId);
      await deleteDoc(projectRef);
      // Also delete from user subcollection
      await deleteDoc(doc(db, "users", user.uid, "projects", projectId));

      setProjects(prev => prev.filter(project => project.id !== projectId));
      toast.success("Project deleted successfully");

      // Delete from activities collection
      if (user) {
        try {
          await deleteProjectFromActivities(user.uid, projectId);
        } catch (syncError) {
          console.error("Error deleting project from activities:", syncError);
          // Don't show error to user, as the project was still deleted successfully
        }
      }

      await logUserActivity(user.uid, {
        type: "project_deleted",
        detail: `Deleted project \"${projectId}\"`,
        projectId,
      });

      await fetchProjects(); // Refetch after delete
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("Failed to delete project");
    }
  };

  const handleUpdateProjectStatus = async (projectId: string, status: 'planning' | 'in-progress' | 'completed' | 'on-hold') => {
    try {
      const projectRef = doc(db, "projects", projectId);
      await updateDoc(projectRef, { status });
      // Also update in user subcollection
      await updateDoc(doc(db, "users", user.uid, "projects", projectId), { status });

      setProjects(prev => prev.map(project => 
        project.id === projectId ? { ...project, status } : project
      ));

      toast.success(`Project status updated to ${status}`);

      // Sync to activities collection
      if (user) {
        try {
          await syncProjectToActivities(user.uid, projectId);
        } catch (syncError) {
          console.error("Error syncing project to activities:", syncError);
          // Don't show error to user, as the project was still updated successfully
        }
      }

      await logUserActivity(user.uid, {
        type: "project_status_updated",
        detail: `Updated project status to ${status}`,
        projectId,
        status,
      });

      await fetchProjects(); // Refetch after status update
    } catch (error) {
      console.error("Error updating project status:", error);
      toast.error("Failed to update project status");
    }
  };

  const toggleProjectExpanded = (projectId: string) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  const filteredProjects = projects.filter(project => {
    if (filter === 'all') return true;
    if (filter === 'active') return project.status === 'in-progress' || project.status === 'planning';
    if (filter === 'completed') return project.status === 'completed';
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-blue-500';
      case 'in-progress': return 'bg-yellow-500';
      case 'completed': return 'bg-green-500';
      case 'on-hold': return 'bg-red-500';
      default: return 'bg-slate-500';
    }
  };

  const handleToggleTaskComplete = async (projectId: string, taskId: string) => {
    try {
      // Find the project
      const project = projects.find(p => p.id === projectId);
      if (!project || !project.tasks) {
        toast.error("Project or tasks not found");
        return;
      }

      // Find the task
      const taskIndex = project.tasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) {
        toast.error("Task not found");
        return;
      }

      // Toggle completion status
      const updatedTasks = [...project.tasks];
      const isCompleting = !updatedTasks[taskIndex].completed;
      updatedTasks[taskIndex] = {
        ...updatedTasks[taskIndex],
        completed: isCompleting
      };

      // Calculate new progress
      const completedTasksCount = updatedTasks.filter(t => t.completed).length;
      const progress = updatedTasks.length > 0
        ? (completedTasksCount / updatedTasks.length) * 100
        : 0;

      // Prepare tasks for Firestore - ensure no undefined values
      const tasksForFirestore = updatedTasks.map(task => ({
        id: task.id,
        title: task.title,
        completed: !!task.completed,
        ...(task.dueDate ? { dueDate: task.dueDate } : {}),
        ...(task.estimatedTime ? { estimatedTime: task.estimatedTime } : {}),
        ...(task.loggedTime ? { loggedTime: task.loggedTime } : {}),
        ...(task.timeEntries && task.timeEntries.length > 0 ? { 
          timeEntries: task.timeEntries.map(entry => ({
            date: entry.date,
            minutes: entry.minutes,
            xpEarned: entry.xpEarned
          }))
        } : {})
      }));

      // Calculate XP for task completion
      let xpEarned = 0;
      if (isCompleting) {
        // Base XP for task completion (can be adjusted based on task complexity)
        xpEarned = 50;
        
        // Add bonus for estimated time if available
        if (updatedTasks[taskIndex].estimatedTime) {
          xpEarned += Math.round(updatedTasks[taskIndex].estimatedTime / 2);
        }
      }

      // Update Firestore
      await updateDoc(doc(db, "projects", projectId), {
        tasks: tasksForFirestore,
        progress
      });

      // Update user XP in Firestore if completing the task
      if (user && isCompleting && xpEarned > 0) {
        try {
          const userRef = doc(db, "users", user.uid);
          
          // Get current user data
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const currentXP = userData.xp || 0;
            
            // Update user XP
            await updateDoc(userRef, {
              xp: currentXP + xpEarned,
              lastActivityDate: new Date().toISOString()
            });
          }
        } catch (userError) {
          console.error("Error updating user XP:", userError);
          // Continue with the function as the task status was still updated
        }
      }

      // Update local state
      setProjects(prevProjects =>
        prevProjects.map(p =>
          p.id === projectId
            ? { ...p, tasks: updatedTasks, progress }
            : p
        )
      );

      // Show success message
      toast.success(
        isCompleting
          ? `Task marked as complete! Earned ${xpEarned} XP`
          : "Task marked as incomplete"
      );

      // Sync to activities collection if user is available
      if (user) {
        try {
          await syncProjectToActivities(user.uid, projectId);
        } catch (syncError) {
          console.error("Error syncing project to activities:", syncError);
          // Don't show error to user, as the task status was still updated successfully
        }
      }

      await logUserActivity(user.uid, {
        type: isCompleting ? "task_completed" : "task_uncompleted",
        detail: `${isCompleting ? "Completed" : "Uncompleted"} task \"${updatedTasks[taskIndex].title}\" in project \"${project.name}\"`,
        projectId,
        taskId,
      });

      await fetchProjects(); // Refetch after task update
    } catch (error) {
      console.error("Error toggling task completion:", error);
      toast.error("Failed to update task");
    }
  };

  const handleLogTime = async () => {
    if (!currentProjectId || !currentTaskId || !loggedTime) {
      toast.error("Please enter the time spent on this task");
      return;
    }

    try {
      // Find the current project
      const project = projects.find(p => p.id === currentProjectId);
      if (!project) {
        toast.error("Project not found");
        return;
      }

      // Find the task
      const taskIndex = project.tasks?.findIndex(t => t.id === currentTaskId) ?? -1;
      if (taskIndex === -1) {
        toast.error("Task not found");
        return;
      }

      const task = project.tasks[taskIndex];
      const minutes = parseInt(loggedTime);
      
      if (isNaN(minutes) || minutes <= 0) {
        toast.error("Please enter a valid time");
        return;
      }

      // Calculate XP (1 XP per minute)
      const earnedXP = minutes;
      
      // Create a new time entry
      const timeEntry = {
        date: new Date().toISOString(),
        minutes,
        xpEarned: earnedXP
      };

      // Update the task with the new time entry
      const updatedTask = {
        ...task,
        loggedTime: (task.loggedTime || 0) + minutes,
        timeEntries: [...(task.timeEntries || []), timeEntry]
      };

      // Update the tasks array
      const updatedTasks = [...project.tasks];
      updatedTasks[taskIndex] = updatedTask;

      // Create a clean object for Firestore update (no undefined values)
      const updatedTasksForFirestore = updatedTasks.map(t => ({
        id: t.id,
        title: t.title,
        completed: !!t.completed,
        ...(t.dueDate ? { dueDate: t.dueDate } : {}),
        ...(t.estimatedTime ? { estimatedTime: t.estimatedTime } : {}),
        loggedTime: t.loggedTime || 0,
        timeEntries: (t.timeEntries || []).map(entry => ({
          date: entry.date,
          minutes: entry.minutes,
          xpEarned: entry.xpEarned
        }))
      }));

      // Update the project in Firestore
      await updateDoc(doc(db, "projects", currentProjectId), {
        tasks: updatedTasksForFirestore
      });

      // Update user XP in Firestore
      if (user) {
        try {
          const userRef = doc(db, "users", user.uid);
          
          // Get current user data
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const currentXP = userData.xp || 0;
            
            // Update user XP
            await updateDoc(userRef, {
              xp: currentXP + earnedXP,
              lastActivityDate: new Date().toISOString()
            });
          }

          // Sync to activities collection
          try {
            await syncProjectToActivities(user.uid, currentProjectId);
          } catch (syncError) {
            console.error("Error syncing project to activities:", syncError);
            // Don't show error to user, as the time was still logged successfully
          }
        } catch (userError) {
          console.error("Error updating user XP:", userError);
          // Continue with the function, as the time was still logged successfully
        }
      }

      // Update local state
      setProjects(prevProjects =>
        prevProjects.map(p =>
          p.id === currentProjectId
            ? { ...p, tasks: updatedTasks }
            : p
        )
      );

      // Close the dialog
      setIsLogTimeDialogOpen(false);
      setLoggedTime("");
      setCurrentTaskId(null);

      // Show success message
      toast.success(`Logged ${minutes} minutes and earned ${earnedXP} XP!`);

      await fetchProjects(); // Refetch after time log

    } catch (error) {
      console.error("Error logging time:", error);
      toast.error("Failed to log time");
    }
  };

  const calculateXpPreview = () => {
    if (!loggedTime) {
      setXpEarned(0);
      return;
    }
    
    const minutes = parseInt(loggedTime);
    if (isNaN(minutes) || minutes <= 0) {
      setXpEarned(0);
      return;
    }
    
    // Find current project
    const project = projects.find(p => p.id === currentProjectId);
    if (!project) {
      setXpEarned(0);
      return;
    }
    
    // Calculate XP based on time spent (10 XP per minute as a base rate)
    const baseXp = minutes * 10;
    
    // Apply multipliers based on project priority
    const priorityMultiplier = {
      'low': 0.8,
      'medium': 1.0,
      'high': 1.2
    }[project.status === 'planning' ? 'low' : project.status === 'in-progress' ? 'medium' : 'low'] || 1.0;
    
    // Calculate final XP
    const earnedXp = Math.round(baseXp * priorityMultiplier);
    setXpEarned(earnedXp);
  };

  // Add Task functionality
  const handleAddTask = async () => {
    if (!currentProjectId || !newTask.title.trim()) {
      toast.error("Task title is required");
      return;
    }

    try {
      // Find the current project
      const project = projects.find(p => p.id === currentProjectId);
      if (!project) {
        toast.error("Project not found");
        return;
      }

      // Create the new task with safe defaults for optional fields
      const newTaskItem: ProjectTask = {
        id: Date.now().toString(), // Simple ID generation
        title: newTask.title,
        completed: false,
      };

      // Only add optional fields if they have values
      if (newTask.dueDate) {
        newTaskItem.dueDate = newTask.dueDate;
      }

      if (newTask.estimatedTime && parseInt(newTask.estimatedTime) > 0) {
        newTaskItem.estimatedTime = parseInt(newTask.estimatedTime);
      }

      // Create a clean tasks array for Firestore
      const existingTasks = project.tasks || [];
      const updatedTasks = [...existingTasks, newTaskItem];

      // Prepare tasks for Firestore - ensure no undefined values
      const tasksForFirestore = updatedTasks.map(task => ({
        id: task.id,
        title: task.title,
        completed: !!task.completed,
        ...(task.dueDate ? { dueDate: task.dueDate } : {}),
        ...(task.estimatedTime ? { estimatedTime: task.estimatedTime } : {}),
        ...(task.loggedTime ? { loggedTime: task.loggedTime } : {}),
        ...(task.timeEntries && task.timeEntries.length > 0 ? { 
          timeEntries: task.timeEntries.map(entry => ({
            date: entry.date,
            minutes: entry.minutes,
            xpEarned: entry.xpEarned
          }))
        } : {})
      }));

      // Update the project in Firestore
      await updateDoc(doc(db, "projects", currentProjectId), {
        tasks: tasksForFirestore,
        // Update progress when adding a task
        progress: (updatedTasks.filter(t => t.completed).length / updatedTasks.length) * 100
      });

      // Update local state
      setProjects(prevProjects =>
        prevProjects.map(p =>
          p.id === currentProjectId
            ? { 
                ...p, 
                tasks: updatedTasks,
                progress: (updatedTasks.filter(t => t.completed).length / updatedTasks.length) * 100
              }
            : p
        )
      );

      // Reset form and close dialog
      setNewTask({
        title: "",
        dueDate: "",
        estimatedTime: ""
      });
      setIsAddTaskDialogOpen(false);

      toast.success("Task added successfully!");

      // Sync to activities collection
      if (user) {
        try {
          await syncProjectToActivities(user.uid, currentProjectId);
        } catch (syncError) {
          console.error("Error syncing project to activities:", syncError);
          // Don't show error to user, as the task was still added successfully
        }
      }

      await fetchProjects(); // Refetch after add
    } catch (error) {
      console.error("Error adding task:", error);
      toast.error("Failed to add task");
    }
  };

  // Add these functions for editing and deleting tasks
  const handleEditTask = async () => {
    if (!editingTask.projectId || !editingTask.taskId || !editingTask.title.trim()) {
      toast.error("Task title is required");
      return;
    }

    try {
      // Find the current project
      const project = projects.find(p => p.id === editingTask.projectId);
      if (!project || !project.tasks) {
        toast.error("Project or tasks not found");
        return;
      }

      // Find the task
      const taskIndex = project.tasks.findIndex(t => t.id === editingTask.taskId);
      if (taskIndex === -1) {
        toast.error("Task not found");
        return;
      }

      // Update the task
      const updatedTasks = [...project.tasks];
      updatedTasks[taskIndex] = {
        ...updatedTasks[taskIndex],
        title: editingTask.title,
        dueDate: editingTask.dueDate || undefined,
        estimatedTime: editingTask.estimatedTime ? parseInt(editingTask.estimatedTime) : undefined
      };

      // Prepare tasks for Firestore - ensure no undefined values
      const tasksForFirestore = updatedTasks.map(task => ({
        id: task.id,
        title: task.title,
        completed: !!task.completed,
        ...(task.dueDate ? { dueDate: task.dueDate } : {}),
        ...(task.estimatedTime ? { estimatedTime: task.estimatedTime } : {}),
        ...(task.loggedTime ? { loggedTime: task.loggedTime } : {}),
        ...(task.timeEntries && task.timeEntries.length > 0 ? { 
          timeEntries: task.timeEntries.map(entry => ({
            date: entry.date,
            minutes: entry.minutes,
            xpEarned: entry.xpEarned
          }))
        } : {})
      }));

      // Update Firestore
      await updateDoc(doc(db, "projects", editingTask.projectId), {
        tasks: tasksForFirestore
      });

      // Update local state
      setProjects(prevProjects =>
        prevProjects.map(p =>
          p.id === editingTask.projectId
            ? { ...p, tasks: updatedTasks }
            : p
        )
      );

      // Close the dialog and reset form
      setIsEditTaskDialogOpen(false);
      setEditingTask({
        projectId: "",
        taskId: "",
        title: "",
        dueDate: "",
        estimatedTime: ""
      });

      toast.success("Task updated successfully");

      // Sync to activities collection
      if (user) {
        try {
          await syncProjectToActivities(user.uid, editingTask.projectId);
        } catch (syncError) {
          console.error("Error syncing project to activities:", syncError);
        }
      }

      await fetchProjects(); // Refetch after task update
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    }
  };

  const handleDeleteTask = async (projectId: string, taskId: string) => {
    try {
      // Find the current project
      const project = projects.find(p => p.id === projectId);
      if (!project || !project.tasks) {
        toast.error("Project or tasks not found");
        return;
      }

      // Filter out the task to delete
      const updatedTasks = project.tasks.filter(t => t.id !== taskId);

      // Calculate new progress
      const completedTasksCount = updatedTasks.filter(t => t.completed).length;
      const progress = updatedTasks.length > 0
        ? (completedTasksCount / updatedTasks.length) * 100
        : 0;

      // Prepare tasks for Firestore
      const tasksForFirestore = updatedTasks.map(task => ({
        id: task.id,
        title: task.title,
        completed: !!task.completed,
        ...(task.dueDate ? { dueDate: task.dueDate } : {}),
        ...(task.estimatedTime ? { estimatedTime: task.estimatedTime } : {}),
        ...(task.loggedTime ? { loggedTime: task.loggedTime } : {}),
        ...(task.timeEntries && task.timeEntries.length > 0 ? { 
          timeEntries: task.timeEntries.map(entry => ({
            date: entry.date,
            minutes: entry.minutes,
            xpEarned: entry.xpEarned
          }))
        } : {})
      }));

      // Update Firestore
      await updateDoc(doc(db, "projects", projectId), {
        tasks: tasksForFirestore,
        progress
      });

      // Update local state
      setProjects(prevProjects =>
        prevProjects.map(p =>
          p.id === projectId
            ? { ...p, tasks: updatedTasks, progress }
            : p
        )
      );

      toast.success("Task deleted successfully");

      // Sync to activities collection
      if (user) {
        try {
          await syncProjectToActivities(user.uid, projectId);
        } catch (syncError) {
          console.error("Error syncing project to activities:", syncError);
        }
      }

      await fetchProjects(); // Refetch after task delete
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task");
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className={`h-8 w-8 animate-spin mx-auto mb-4 ${themeStyles.accent}`} />
          <p className={themeStyles.textPrimary}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Luxury Top Bar */}
      <div className="px-4 pt-8 pb-4">
        <ThemedHeader
          theme={theme}
          title={themeStyles.header}
          subtitle="Track your learning projects"
          className="mb-6 shadow-lg"
        />
      </div>

      <div className="flex-1 w-full max-w-6xl mx-auto px-4 pb-8 flex flex-col gap-8">
        {/* Project Milestones luxury widget */}
        <div className="luxury-card p-8 animate-fadeIn mb-8">
          <h2 className="text-2xl font-semibold mb-6">Project Milestones</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ThemedAchievement
              theme={theme}
              title="First Project"
              description="Create your first project."
              icon="🚀"
              isUnlocked={projects.length > 0}
              progress={projects.length > 0 ? 100 : 0}
            />
            <ThemedAchievement
              theme={theme}
              title="Project Completed"
              description="Complete a project."
              icon="🏆"
              isUnlocked={projects.some(p => p.status === 'completed')}
              progress={projects.some(p => p.status === 'completed') ? 100 : 0}
            />
            <ThemedAchievement
              theme={theme}
              title="10 Tasks Logged"
              description="Log 10 tasks across all projects."
              icon="📝"
              isUnlocked={projects.reduce((acc, p) => acc + (p.tasks?.length || 0), 0) >= 10}
              progress={Math.min(100, (projects.reduce((acc, p) => acc + (p.tasks?.length || 0), 0) / 10) * 100)}
            />
          </div>
        </div>

        {/* Quick Add Project luxury card */}
        <div className="luxury-card p-8 animate-fadeIn mb-8">
          <h2 className="text-xl font-semibold mb-4">Add New Project</h2>
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <Input
              type="text"
              placeholder="Project name"
              value={newProject.name}
              onChange={e => setNewProject({ ...newProject, name: e.target.value })}
              className="rounded-lg shadow w-full md:w-1/3"
            />
            <Input
              type="text"
              placeholder="Description"
              value={newProject.description}
              onChange={e => setNewProject({ ...newProject, description: e.target.value })}
              className="rounded-lg shadow w-full md:w-1/2"
            />
            <Button
              onClick={handleAddProject}
              className="rounded-lg shadow bg-blue-600 hover:bg-blue-700 transition-all px-6 py-3 text-lg font-semibold"
              disabled={!newProject.name.trim()}
            >
              <Plus className="h-5 w-5 mr-2" /> Add Project
            </Button>
          </div>
        </div>

        {/* Projects List luxury cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {projects.length === 0 ? (
            <div className="luxury-card p-8 text-center text-slate-400 animate-fadeIn">No projects yet. Start by adding one above!</div>
          ) : (
            projects.map(project => (
              <div key={project.id} className="luxury-card p-6 animate-fadeIn flex flex-col gap-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <BarChart className="w-6 h-6" /> {project.name}
                  </h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(project.status)}`}>{project.status.replace('-', ' ')}</span>
                </div>
                <p className="text-slate-400 mb-2">{project.description}</p>
                <div className="flex items-center gap-4 mb-2">
                  <div className="flex-1">
                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${themeStyles.progressBar}`}
                        style={{ width: `${project.progress || 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400 mt-1 block">Progress: {project.progress || 0}%</span>
                  </div>
                  <Button size="sm" variant="outline" className="rounded-lg shadow hover:shadow-lg transition-all" onClick={() => router.push(`/projects/${project.id}`)}>
                    <Edit className="h-4 w-4 mr-1" /> View
                  </Button>
                  <Button size="sm" variant="destructive" className="rounded-lg shadow hover:shadow-lg transition-all" onClick={() => handleDeleteProject(project.id)}>
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
                {/* Tasks List luxury sub-card */}
                {project.tasks && project.tasks.length > 0 && (
                  <div className="mt-2">
                    <h4 className="text-lg font-semibold mb-2">Tasks</h4>
                    <ul className="space-y-2">
                      {project.tasks.map(task => (
                        <li key={task.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 transition-all">
                          <span className={`w-3 h-3 rounded-full ${task.completed ? 'bg-green-500' : 'bg-slate-500'} inline-block`} />
                          <span className={`flex-1 ${task.completed ? 'line-through text-slate-400' : 'text-slate-100'}`}>{task.title}</span>
                          {task.dueDate && <span className="text-xs text-slate-400">Due: {format(new Date(task.dueDate), 'MMM d')}</span>}
                          <Button size="sm" variant="outline" className="rounded-lg shadow hover:shadow-lg transition-all" onClick={() => handleToggleTaskComplete(project.id, task.id)}>
                            {task.completed ? <CheckIcon className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {isClient && (
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className={`${themeStyles.cardBg} ${themeStyles.border}`} suppressHydrationWarning>
            <DialogHeader>
              <DialogTitle className={themeStyles.textPrimary}>Create New Project</DialogTitle>
              <DialogDescription className={themeStyles.textMuted}>
                Add a new project to track your progress.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label htmlFor="project-name" className={`block text-sm font-medium ${themeStyles.textSecondary} mb-1`}>
                  Project Name
                </label>
                <Input
                  id="project-name"
                  value={newProject.name}
                  onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                  className={`bg-slate-700 border ${themeStyles.border}`}
                  placeholder="Enter project name"
                />
              </div>
              <div>
                <label htmlFor="project-description" className={`block text-sm font-medium ${themeStyles.textSecondary} mb-1`}>
                  Description
                </label>
                <textarea
                  id="project-description"
                  value={newProject.description}
                  onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                  className={`w-full p-2 rounded-md bg-slate-700 border ${themeStyles.border} text-white`}
                  rows={3}
                  placeholder="Enter project description"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium ${themeStyles.textSecondary} mb-1`}>
                  Status
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setNewProject({...newProject, status: 'planning'})}
                    className={`px-3 py-1 rounded-md ${newProject.status === 'planning' ? 'bg-blue-600' : 'bg-slate-700'}`}
                  >
                    Planning
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewProject({...newProject, status: 'in-progress'})}
                    className={`px-3 py-1 rounded-md ${newProject.status === 'in-progress' ? 'bg-yellow-600' : 'bg-slate-700'}`}
                  >
                    In Progress
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewProject({...newProject, status: 'on-hold'})}
                    className={`px-3 py-1 rounded-md ${newProject.status === 'on-hold' ? 'bg-red-600' : 'bg-slate-700'}`}
                  >
                    On Hold
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewProject({...newProject, status: 'completed'})}
                    className={`px-3 py-1 rounded-md ${newProject.status === 'completed' ? 'bg-green-600' : 'bg-slate-700'}`}
                  >
                    Completed
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="progress-method" className={`block text-sm font-medium ${themeStyles.textSecondary} mb-1`}>
                  Progress Calculation Method
                </label>
                console.log('progress-method select theme:', theme);
                <select
                  id="progress-method"
                  value={newProject.progressMethod}
                  onChange={e => setNewProject({ ...newProject, progressMethod: e.target.value as any })}
                  className={`border rounded px-2 py-1 text-sm ${theme === 'dbz' ? 'bg-yellow-950 text-yellow-100 border-yellow-600' : 'bg-background'}`}
                >
                  <option value="manual">Manual</option>
                  <option value="tasks">Task Completion</option>
                  <option value="time">Time Logged</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
                className="border-slate-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddProject}
                disabled={!newProject.name.trim()}
                className={themeStyles.primary}
              >
                Create Project
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {isClient && (
        <Dialog open={isLogTimeDialogOpen} onOpenChange={setIsLogTimeDialogOpen}>
          <DialogContent className={`${themeStyles.cardBg} ${themeStyles.border}`} suppressHydrationWarning>
            <DialogHeader>
              <DialogTitle className={themeStyles.textPrimary}>Log Time for Task</DialogTitle>
              <DialogDescription className={themeStyles.textMuted}>
                Track your time spent on this task to earn XP.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label htmlFor="time-spent" className={`block text-sm font-medium ${themeStyles.textSecondary} mb-1`}>
                  Time Spent (minutes)
                </label>
                <Input
                  id="time-spent"
                  type="number"
                  value={loggedTime}
                  onChange={(e) => {
                    setLoggedTime(e.target.value);
                    calculateXpPreview();
                  }}
                  className={`bg-slate-700 border ${themeStyles.border}`}
                  placeholder="Enter time in minutes"
                  min="1"
                />
              </div>
              
              {xpEarned > 0 && (
                <div className="bg-slate-800 p-3 rounded-md">
                  <p className="text-sm text-center">
                    <span className="text-yellow-400 font-medium">+{xpEarned} XP</span> will be earned
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsLogTimeDialogOpen(false)}
                className="border-slate-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleLogTime}
                disabled={!loggedTime || parseInt(loggedTime) <= 0}
                className={themeStyles.primary}
              >
                Log Time
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {isClient && (
        <Dialog open={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen}>
          <DialogContent className={`${themeStyles.cardBg} ${themeStyles.border}`} suppressHydrationWarning>
            <DialogHeader>
              <DialogTitle className={themeStyles.textPrimary}>Add New Task</DialogTitle>
              <DialogDescription className={themeStyles.textMuted}>
                Add a new task to your project.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label htmlFor="task-title" className={`block text-sm font-medium ${themeStyles.textSecondary} mb-1`}>
                  Task Title
                </label>
                <Input
                  id="task-title"
                  value={newTask.title}
                  onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                  className={`bg-slate-700 border ${themeStyles.border}`}
                  placeholder="Enter task title"
                />
              </div>
              <div>
                <label htmlFor="task-due-date" className={`block text-sm font-medium ${themeStyles.textSecondary} mb-1`}>
                  Due Date (Optional)
                </label>
                <Input
                  id="task-due-date"
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})}
                  className={`bg-slate-700 border ${themeStyles.border}`}
                />
              </div>
              <div>
                <label htmlFor="task-estimated-time" className={`block text-sm font-medium ${themeStyles.textSecondary} mb-1`}>
                  Estimated Time (minutes)
                </label>
                <Input
                  id="task-estimated-time"
                  type="number"
                  value={newTask.estimatedTime}
                  onChange={(e) => setNewTask({...newTask, estimatedTime: e.target.value})}
                  className={`bg-slate-700 border ${themeStyles.border}`}
                  placeholder="Enter estimated time in minutes"
                  min="1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddTaskDialogOpen(false)}
                className="border-slate-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddTask}
                disabled={!newTask.title.trim()}
                className={themeStyles.primary}
              >
                Add Task
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {isClient && (
        <Dialog open={isEditTaskDialogOpen} onOpenChange={setIsEditTaskDialogOpen}>
          <DialogContent className={`${themeStyles.cardBg} ${themeStyles.border}`} suppressHydrationWarning>
            <DialogHeader>
              <DialogTitle className={themeStyles.textPrimary}>Edit Task</DialogTitle>
              <DialogDescription className={themeStyles.textMuted}>
                Update task details.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label htmlFor="edit-task-title" className={`block text-sm font-medium ${themeStyles.textSecondary} mb-1`}>
                  Task Title
                </label>
                <Input
                  id="edit-task-title"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({...editingTask, title: e.target.value})}
                  className={`bg-slate-700 border ${themeStyles.border}`}
                  placeholder="Enter task title"
                />
              </div>
              <div>
                <label htmlFor="edit-task-due-date" className={`block text-sm font-medium ${themeStyles.textSecondary} mb-1`}>
                  Due Date (Optional)
                </label>
                <Input
                  id="edit-task-due-date"
                  type="date"
                  value={editingTask.dueDate}
                  onChange={(e) => setEditingTask({...editingTask, dueDate: e.target.value})}
                  className={`bg-slate-700 border ${themeStyles.border}`}
                />
              </div>
              <div>
                <label htmlFor="edit-task-estimated-time" className={`block text-sm font-medium ${themeStyles.textSecondary} mb-1`}>
                  Estimated Time (minutes)
                </label>
                <Input
                  id="edit-task-estimated-time"
                  type="number"
                  value={editingTask.estimatedTime}
                  onChange={(e) => setEditingTask({...editingTask, estimatedTime: e.target.value})}
                  className={`bg-slate-700 border ${themeStyles.border}`}
                  placeholder="Enter estimated time in minutes"
                  min="1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditTaskDialogOpen(false)}
                className="border-slate-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditTask}
                disabled={!editingTask.title.trim()}
                className={themeStyles.primary}
              >
                Update Task
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
} 