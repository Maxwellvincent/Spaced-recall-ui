"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getFirebaseDb } from '@/lib/firebase';
import { doc, getDoc, updateDoc, deleteDoc, deleteField } from "firebase/firestore";
import { Loader2, Plus, Calendar, Clock, BarChart, Trash, Edit, FolderKanban, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Milestone } from "lucide-react";
import { useTheme } from "@/contexts/theme-context";
import { useCallback } from "react";
import { Select } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from '@/components/ui/dropdown-menu';
import { syncProjectToActivities } from '@/utils/syncProjectsToActivities';
import { useAuth } from '@/lib/auth';
import { calculateUserXP } from '@/utils/calculateUserXP';

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.projectId as string;
  console.log("ProjectDetailPage mounted", projectId);
  const db = getFirebaseDb();
  const { user } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [addItemType, setAddItemType] = useState<'task' | 'tool'>('task');
  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    dueDate: '',
    estimatedTime: '',
    loggedTime: '',
    xpEarned: '',
  });
  const [isEditTaskDialogOpen, setIsEditTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [status, setStatus] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [isEditProjectDialogOpen, setIsEditProjectDialogOpen] = useState(false);
  const [isDeleteProjectDialogOpen, setIsDeleteProjectDialogOpen] = useState(false);
  const [editProject, setEditProject] = useState<any>(null);
  const [deletingProject, setDeletingProject] = useState(false);
  const { theme } = useTheme();
  const [isEditToolDialogOpen, setIsEditToolDialogOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<any>(null);
  const [progressMethod, setProgressMethod] = useState<'manual' | 'tasks' | 'time'>('manual');
  const [totalExpectedTime, setTotalExpectedTime] = useState<number | null>(project?.totalExpectedTime || null);
  const [expectedTimeInput, setExpectedTimeInput] = useState<{ value: string, unit: 'minutes' | 'hours' }>({ value: '', unit: 'minutes' });
  const [additionalTime, setAdditionalTime] = useState("");
  const [additionalToolTime, setAdditionalToolTime] = useState("");

  // Utility: Determine if DBZ theme is active
  const isDbzTheme = theme?.toLowerCase() === 'dbz';

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
          header: 'Training Project',
          buttonHover: 'hover:bg-yellow-700',
          textPrimary: 'text-white',
          textSecondary: 'text-yellow-100',
          textMuted: 'text-yellow-200/80',
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
          header: 'Ninja Project',
          buttonHover: 'hover:bg-orange-700',
          textPrimary: 'text-white',
          textSecondary: 'text-orange-100',
          textMuted: 'text-orange-200/80',
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
          header: 'Magical Project',
          buttonHover: 'hover:bg-purple-700',
          textPrimary: 'text-white',
          textSecondary: 'text-purple-100',
          textMuted: 'text-purple-200/80',
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
          header: 'Project Details',
          buttonHover: 'hover:bg-blue-700',
          textPrimary: 'text-white',
          textSecondary: 'text-slate-100',
          textMuted: 'text-slate-300',
        };
    }
  };
  const themeStyles = getThemeStyles();

  useEffect(() => {
    const fetchProject = async () => {
      setLoading(true);
      try {
        console.log('[DEBUG] About to fetch project from Firestore:', projectId);
        const projectRef = doc(db, "projects", projectId);
        const projectSnap = await getDoc(projectRef);
        console.log('[DEBUG] projectSnap.exists:', projectSnap.exists());
        console.log('[DEBUG] projectSnap.id:', projectSnap.id);
        console.log('[DEBUG] projectSnap.data():', projectSnap.data());
        if (projectSnap.exists()) {
          const data = { id: projectSnap.id, ...projectSnap.data() };
          setProject(data);
          setStatus(data.status || "planning");
          setProgress(data.progress || 0);
          if (data.totalExpectedTime) {
            setTotalExpectedTime(data.totalExpectedTime);
            setExpectedTimeInput({ value: String(data.totalExpectedTime), unit: 'minutes' });
          }
          if (data.progressMethod) {
            setProgressMethod(data.progressMethod);
          } else {
            setProgressMethod('manual');
          }
        } else {
          setError("Project not found");
        }
      } catch (err) {
        console.error('[DEBUG] Error in fetchProject:', err);
        setError("Failed to load project");
      } finally {
        setLoading(false);
      }
    };
    if (projectId) fetchProject();
  }, [projectId, db]);

  // Helper to sync user XP after XP-changing actions
  const syncUserXP = async (showToast = false) => {
    if (!user) return;
    const prevXP = user.totalXP || 0;
    const xpResult = await calculateUserXP(user.uid, db);
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    const userData = userDoc.exists() ? userDoc.data() : {};
    if (userData.totalXP !== xpResult.totalXP || userData.level !== xpResult.level) {
      await updateDoc(userRef, {
        totalXP: xpResult.totalXP,
        level: xpResult.level,
        lastUpdated: new Date().toISOString()
      });
    }
    if (showToast) {
      const delta = xpResult.totalXP - (userData.totalXP || 0);
      if (delta > 0) toast.success(`+${delta} XP earned!`);
    }
  };

  // Task management handlers
  const handleToggleTaskComplete = async (taskId: string) => {
    try {
      const updatedTasks = project.tasks.map((t: any) => t.id === taskId ? { ...t, completed: !t.completed } : t);
      await updateDoc(doc(db, "projects", projectId), { tasks: updatedTasks });
      setProject((prev: any) => ({ ...prev, tasks: updatedTasks }));
      if (user) await syncProjectToActivities(user.uid, projectId);
      await syncUserXP();
    } catch (error) {
      toast.error("Failed to update task");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const updatedTasks = project.tasks.filter((t: any) => t.id !== taskId);
      await updateDoc(doc(db, "projects", projectId), { tasks: updatedTasks });
      setProject((prev: any) => ({ ...prev, tasks: updatedTasks }));
      toast.success("Task deleted successfully");
      if (user) await syncProjectToActivities(user.uid, projectId);
      await syncUserXP();
    } catch (error) {
      toast.error("Failed to delete task");
    }
  };

  const handleEditTask = (task: any) => {
    setEditingTask(task);
    setIsEditTaskDialogOpen(true);
  };

  const handleSaveEditTask = async () => {
    if (!editingTask.title.trim()) {
      toast.error("Task title is required");
      return;
    }
    try {
      const addTime = Number(additionalTime) || 0;
      const updatedTask = {
        ...editingTask,
        loggedTime: (Number(editingTask.loggedTime) || 0) + addTime,
        xpEarned: (Number(editingTask.xpEarned) || 0) + addTime,
      };
      const updatedTasks = project.tasks.map((t: any) => t.id === editingTask.id ? updatedTask : t);
      await updateDoc(doc(db, "projects", projectId), { tasks: updatedTasks });
      setProject((prev: any) => ({ ...prev, tasks: updatedTasks }));
      setIsEditTaskDialogOpen(false);
      setEditingTask(null);
      setAdditionalTime("");
      toast.success("Task updated successfully");
      if (user) await syncProjectToActivities(user.uid, projectId);
      await syncUserXP();
    } catch (error) {
      toast.error("Failed to update task");
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      await updateDoc(doc(db, "projects", projectId), { status: newStatus });
      setStatus(newStatus);
      setProject((prev: any) => ({ ...prev, status: newStatus }));
      toast.success(`Project status updated to ${newStatus}`);
      if (user) await syncProjectToActivities(user.uid, projectId);
      // If completed, show XP gained
      if (newStatus === 'completed') {
        await syncUserXP(true);
      } else {
        await syncUserXP();
      }
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleUpdateProgress = async () => {
    try {
      await updateDoc(doc(db, "projects", projectId), { progress });
      setProject((prev: any) => ({ ...prev, progress }));
      toast.success("Progress updated");
      if (user) await syncProjectToActivities(user.uid, projectId);
      await syncUserXP();
    } catch {
      toast.error("Failed to update progress");
    }
  };

  const handleEditProject = () => {
    setEditProject({ ...project });
    setIsEditProjectDialogOpen(true);
  };

  const handleSaveEditProject = async () => {
    console.log("[DEBUG] handleSaveEditProject called", editProject, expectedTimeInput);
    if (!editProject.name || !editProject.name.trim()) {
      console.log("[DEBUG] Project name missing or empty", editProject.name);
      toast.error("Project name is required");
      return;
    }
    let expectedMinutes = null;
    if (expectedTimeInput.value) {
      expectedMinutes = expectedTimeInput.unit === 'hours'
        ? Math.round(Number(expectedTimeInput.value) * 60)
        : Math.round(Number(expectedTimeInput.value));
    }
    console.log("[DEBUG] About to updateDoc", {
      name: editProject.name,
      description: editProject.description,
      dueDate: editProject.dueDate ? editProject.dueDate : null,
      startDate: editProject.startDate ? editProject.startDate : null,
      priority: editProject.priority,
      progressMethod: editProject.progressMethod,
      totalExpectedTime: expectedMinutes,
    });
    try {
      await updateDoc(doc(db, "projects", projectId), {
        name: editProject.name,
        description: editProject.description,
        dueDate: editProject.dueDate ? editProject.dueDate : null,
        startDate: editProject.startDate ? editProject.startDate : null,
        priority: editProject.priority,
        progressMethod: editProject.progressMethod,
        totalExpectedTime: expectedMinutes,
      });
      setProject((prev: any) => ({ ...prev, ...editProject, totalExpectedTime: expectedMinutes }));
      setProgressMethod(editProject.progressMethod);
      setTotalExpectedTime(expectedMinutes);
      setIsEditProjectDialogOpen(false);
      toast.success("Project updated successfully");
      if (user) await syncProjectToActivities(user.uid, projectId);
      await syncUserXP();
    } catch (error) {
      console.error("[DEBUG] Error in updateDoc", error);
      toast.error("Failed to update project");
    }
  };

  const handleDeleteProject = async () => {
    setDeletingProject(true);
    try {
      await deleteDoc(doc(db, "projects", projectId));
      toast.success("Project deleted");
      router.push("/projects");
    } catch (error) {
      toast.error("Failed to delete project");
    } finally {
      setDeletingProject(false);
      setIsDeleteProjectDialogOpen(false);
    }
  };

  const handleEditTool = (tool: any) => {
    setEditingTool(tool);
    setIsEditToolDialogOpen(true);
  };

  const handleSaveEditTool = async () => {
    if (!editingTool.name.trim()) {
      toast.error("Tool name is required");
      return;
    }
    try {
      const addTime = Number(additionalToolTime) || 0;
      const updatedTool = {
        ...editingTool,
        loggedTime: (Number(editingTool.loggedTime) || 0) + addTime,
        xpEarned: (Number(editingTool.xpEarned) || 0) + addTime,
      };
      const updatedTools = project.tools.map((t: any) => t.id === editingTool.id ? updatedTool : t);
      await updateDoc(doc(db, "projects", projectId), { tools: updatedTools });
      setProject((prev: any) => ({ ...prev, tools: updatedTools }));
      setIsEditToolDialogOpen(false);
      setEditingTool(null);
      setAdditionalToolTime("");
      toast.success("Tool updated successfully");
      if (user) await syncProjectToActivities(user.uid, projectId);
      await syncUserXP();
    } catch (error) {
      toast.error("Failed to update tool");
    }
  };

  const handleDeleteTool = async (toolId: string) => {
    try {
      const updatedTools = project.tools.filter((t: any) => t.id !== toolId);
      await updateDoc(doc(db, "projects", projectId), { tools: updatedTools });
      setProject((prev: any) => ({ ...prev, tools: updatedTools }));
      toast.success("Tool deleted successfully");
      if (user) await syncProjectToActivities(user.uid, projectId);
      await syncUserXP();
    } catch (error) {
      toast.error("Failed to delete tool");
    }
  };

  // Utility to format minutes as min/hr/days
  function formatTime(minutes: number) {
    if (minutes < 60) {
      return `${minutes} min`;
    } else if (minutes < 1440) {
      return `${(minutes / 60).toFixed(1)} hr`;
    } else {
      return `${(minutes / 1440).toFixed(1)} days`;
    }
  }

  const statusOptions = [
    { value: 'planning', label: 'Planning' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'on-hold', label: 'On Hold' },
    { value: 'completed', label: 'Completed' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-400" />
        <p className="text-blue-200">Loading project...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-900/20 p-8 rounded-lg text-center max-w-md">
          <h2 className="text-2xl font-bold text-red-400 mb-4">{error}</h2>
          <Button onClick={() => router.push("/projects")} className="mt-4">Back to Projects</Button>
        </div>
      </div>
    );
  }

  if (!project) return null;

  // All calculations that use 'project' must be below this line
  // Calculate progress by tasks
  const totalTasks = project.tasks?.length || 0;
  const completedTasks = project.tasks?.filter((t: any) => t.completed).length || 0;
  const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Calculate progress by time
  const totalExpected = totalExpectedTime || ((project.tasks?.reduce((sum: number, t: any) => sum + (Number(t.estimatedTime) || 0), 0) || 0) + (project.tools?.reduce((sum: number, t: any) => sum + (Number(t.estimatedTime) || 0), 0) || 0));
  const totalLogged = (project.tasks?.reduce((sum: number, t: any) => sum + (Number(t.loggedTime) || 0), 0) || 0) + (project.tools?.reduce((sum: number, t: any) => sum + (Number(t.loggedTime) || 0), 0) || 0);
  const timeProgress = totalExpected > 0 ? Math.round((totalLogged / totalExpected) * 100) : 0;

  // Determine which progress value to show
  const displayProgress = progressMethod === 'manual' ? progress : progressMethod === 'tasks' ? taskProgress : timeProgress;

  // Calculate total XP from all tasks and tools
  const totalTaskXp = project.tasks?.reduce((sum: number, t: any) => sum + (Number(t.xpEarned) || 0) + (t.timeEntries ? t.timeEntries.reduce((s: number, e: any) => s + (Number(e.xpEarned) || 0), 0) : 0), 0) || 0;
  const totalToolXp = project.tools?.reduce((sum: number, t: any) => sum + (Number(t.xpEarned) || 0), 0) || 0;
  const totalProjectXp = totalTaskXp + totalToolXp;

  // Debug: Log tasks to check for xpEarned
  console.log('Tasks:', project.tasks);

  return (
    <div className={`min-h-screen flex flex-col items-center py-10 px-4 ${themeStyles.textPrimary} ${themeStyles.cardBg}`}>
      <div className={`max-w-2xl w-full rounded-lg shadow-2xl p-8 ${themeStyles.cardBg} ${themeStyles.border} flex flex-col gap-6`}>
        <div className="flex justify-between items-start mb-2">
          <div>
            <h1 className={`text-3xl font-bold mb-1 flex items-center gap-2 ${themeStyles.textPrimary}`}>
              <FolderKanban className={`h-6 w-6 ${themeStyles.accent}`} />
              {project.name}
            </h1>
            <div className="flex gap-2 flex-wrap mb-2">
              <Badge variant={project.priority === 'low' ? 'outline' : project.priority === 'medium' ? 'secondary' : 'default'}>{project.priority}</Badge>
              <div className="mb-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <span className={`${themeStyles.primary} text-white px-3 py-1 rounded-full text-xs cursor-pointer flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-yellow-400`}>
                      Status: {status}
                    </span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="z-50 w-40">
                    {statusOptions.map(option => (
                      <DropdownMenuItem
                        key={option.value}
                        onClick={() => handleUpdateStatus(option.value)}
                        className={status === option.value ? 'font-bold text-yellow-700' : ''}
                      >
                        {option.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <span className={`${themeStyles.cardBg} ${themeStyles.textPrimary} px-3 py-1 rounded-full text-xs`}>Progress: {displayProgress}%</span>
              {project.xp && <span className={`${themeStyles.cardBg} text-amber-300 px-3 py-1 rounded-full text-xs`}>XP: {project.xp}</span>}
            </div>
            <div className="flex gap-2 flex-wrap mb-2">
              <span className={`${themeStyles.cardBg} text-amber-300 px-3 py-1 rounded-full text-xs`}>Total XP: {totalProjectXp}</span>
              {project.startDate && <span className={`${themeStyles.cardBg} ${themeStyles.textPrimary} px-3 py-1 rounded-full text-xs`}>Started: {format(new Date(project.startDate), 'MMM d, yyyy')}</span>}
              {project.dueDate && <span className={`${themeStyles.cardBg} ${themeStyles.textPrimary} px-3 py-1 rounded-full text-xs`}>Due: {format(new Date(project.dueDate), 'MMM d, yyyy')}</span>}
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleEditProject} className={isDbzTheme ? 'text-black' : ''}><Edit className="h-4 w-4 mr-1" />Edit</Button>
            <Button size="sm" variant="destructive" onClick={() => setIsDeleteProjectDialogOpen(true)}><Trash className="h-4 w-4 mr-1" />Delete</Button>
          </div>
        </div>
        <p className={`${themeStyles.textMuted} mb-2`}>{project.description || "No description provided."}</p>
        <div className="mb-4">
          <h4 className={`text-sm font-medium mb-2 ${themeStyles.textSecondary}`}>Progress</h4>
          <div className="flex items-center gap-2 mb-2">
            <Progress
              value={displayProgress}
              className={`h-4 flex-1 ${themeStyles.cardBg}`}
              indicatorClassName={`${themeStyles.progressBar} ${isDbzTheme ? 'relative z-10 shadow-[0_0_24px_8px_rgba(253,224,71,0.8)] dbz-bar-spikes after:content-[""] after:absolute after:inset-y-0 after:left-[-16px] after:w-8 after:right-auto after:bg-gradient-to-l after:from-yellow-400/60 after:to-yellow-200/0 after:blur-md after:opacity-80 after:animate-dbzaura' : ''}`}
            />
            {progressMethod === 'manual' && (
              <input type="number" min={0} max={100} value={progress} onChange={e => setProgress(Number(e.target.value))} className={`w-16 px-2 py-1 rounded ${themeStyles.cardBg} ${themeStyles.border} ${themeStyles.textPrimary} text-xs`} />
            )}
            {progressMethod === 'manual' && (
              <Button size="sm" onClick={handleUpdateProgress}>Update</Button>
            )}
            {progressMethod === 'time' && (
              <span className="text-xs ml-2">Logged: {formatTime(totalLogged)} / Expected: {formatTime(totalExpected)}</span>
            )}
            <span className="ml-2 text-xs">{displayProgress}%</span>
          </div>
        </div>
        {project.milestones && project.milestones.length > 0 && (
          <div className="mb-4">
            <h2 className={`text-lg font-semibold mb-2 flex items-center gap-2 ${themeStyles.accent}`}><Milestone className={`h-5 w-5 ${themeStyles.accent}`} />Milestones</h2>
            <ul className="space-y-2">
              {project.milestones.map((m: any) => (
                <li key={m.id} className={`flex items-center justify-between ${themeStyles.itemCard} rounded px-3 py-2`}>
                  <div className="flex items-center gap-2">
                    <span className={m.completed ? "line-through text-green-400" : themeStyles.textPrimary}>{m.title}</span>
                    {m.completed && <CheckCircle className="h-4 w-4 text-green-400" />}
                  </div>
                  {!m.completed && (
                    <Button size="xs" variant="outline" onClick={async () => { await handleCompleteMilestone(project.id, m.id); }}>
                      Mark Complete
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mb-4">
          <h2 className={`text-lg font-semibold mb-2 ${themeStyles.accent}`}>Tasks</h2>
          <Button onClick={() => setIsAddItemDialogOpen(true)} className="mb-2" size="sm">
            <Plus className="h-4 w-4 mr-1" /> Add Item
          </Button>
          {project.tasks && project.tasks.length > 0 ? (
            <ul className="list-disc pl-5 space-y-1">
              {project.tasks.map((task: any) => {
                const totalXp = task.timeEntries?.reduce((sum: number, entry: any) => sum + (Number(entry.xpEarned) || 0), 0) || 0;
                const latestXp = task.timeEntries?.[0]?.xpEarned;
                return (
                  <li key={task.id} className={`${themeStyles.textPrimary} flex items-center justify-between`}>
                    <div>
                      <div className={task.completed ? "line-through text-green-400" : ""}>{task.title}</div>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {latestXp !== undefined && latestXp !== '' && (
                          <span className="text-xs text-amber-300 bg-amber-900/40 px-2 py-0.5 rounded">+{latestXp} XP (latest)</span>
                        )}
                        {totalXp > 0 && (
                          <span className="text-xs text-yellow-200 bg-yellow-900/40 px-2 py-0.5 rounded">+{totalXp} XP (total)</span>
                        )}
                        {typeof task.xpEarned !== 'undefined' && task.xpEarned !== '' && (
                          <span className="text-xs text-amber-300 bg-amber-900/40 px-2 py-0.5 rounded">+{task.xpEarned} XP</span>
                        )}
                        {typeof task.loggedTime !== 'undefined' && task.loggedTime !== '' && (
                          <span className="text-xs text-blue-300 bg-blue-900/40 px-2 py-0.5 rounded">{formatTime(Number(task.loggedTime))}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 items-center">
                      <Button size="sm" variant="outline" onClick={() => handleToggleTaskComplete(task.id)} className={isDbzTheme ? 'text-black border-yellow-600 bg-yellow-50 hover:bg-yellow-100' : ''}>
                        {task.completed ? "Undo" : "Complete"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleEditTask(task)} className={isDbzTheme ? 'text-black border-yellow-600 bg-yellow-50 hover:bg-yellow-100' : ''}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDeleteTask(task.id)} className={isDbzTheme ? 'text-black border-yellow-600 bg-yellow-50 hover:bg-yellow-100' : ''}>
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className={themeStyles.textMuted}>No tasks for this project.</p>
          )}
        </div>
        <div className="mb-4">
          <h2 className={`text-lg font-semibold mb-2 ${themeStyles.accent}`}>Tools / Implementations</h2>
          {project.tools && project.tools.length > 0 ? (
            <ul className="list-disc pl-5 space-y-1">
              {project.tools.map((tool: any) => (
                <li key={tool.id} className={`${themeStyles.textPrimary} flex items-center justify-between`}>
                  <span>
                    {tool.name}
                    {typeof tool.xpEarned !== 'undefined' && tool.xpEarned !== '' && (
                      <span className="ml-2 text-xs text-amber-300 bg-amber-900/40 px-2 py-0.5 rounded">+{tool.xpEarned} XP</span>
                    )}
                    {typeof tool.loggedTime !== 'undefined' && tool.loggedTime !== '' && (
                      <span className="ml-2 text-xs text-blue-300 bg-blue-900/40 px-2 py-0.5 rounded">{formatTime(Number(tool.loggedTime))}</span>
                    )}
                  </span>
                  <div className="flex gap-2 items-center">
                    <Button size="sm" variant="outline" onClick={() => handleEditTool(tool)} className={isDbzTheme ? 'text-black border-yellow-600 bg-yellow-50 hover:bg-yellow-100' : ''}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDeleteTool(tool.id)} className={isDbzTheme ? 'text-black border-yellow-600 bg-yellow-50 hover:bg-yellow-100' : ''}>
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className={themeStyles.textMuted}>No tools/implementations for this project.</p>
          )}
        </div>
        <Button onClick={() => router.push("/projects")} variant="outline" className={isDbzTheme ? 'text-black border-yellow-600 bg-yellow-50 hover:bg-yellow-100' : ''}>Back to Projects</Button>
      </div>

      <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
        <DialogContent className={`${themeStyles.cardBg} ${themeStyles.border} ${isDbzTheme ? 'text-white' : ''}`}>
          <DialogHeader>
            <DialogTitle className={themeStyles.textPrimary}>Add Item</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2 mb-2">
            <Button variant={addItemType === 'task' ? 'default' : 'outline'} size="sm" onClick={() => setAddItemType('task')}>Task</Button>
            <Button
              variant={addItemType === 'tool' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAddItemType('tool')}
              className={isDbzTheme ? 'text-black bg-yellow-100 border-yellow-400 hover:bg-yellow-200' : theme === 'naruto' ? 'text-black bg-orange-100 border-orange-400 hover:bg-orange-200' : theme === 'hogwarts' ? 'text-yellow-100 bg-purple-900 border-purple-400 hover:bg-purple-800' : 'text-black bg-white border-gray-300 hover:bg-slate-200'}
            >
              Tool / Implementation / Update
            </Button>
          </div>
          <Input
            placeholder={addItemType === 'task' ? 'Task title' : 'Tool/Implementation name'}
            value={newItem.title}
            onChange={e => setNewItem({ ...newItem, title: e.target.value })}
            className={`mb-2 ${isDbzTheme ? 'text-white' : ''}`}
          />
          {addItemType === 'tool' && (
            <Input
              placeholder="Description (optional)"
              value={newItem.description}
              onChange={e => setNewItem({ ...newItem, description: e.target.value })}
              className={`mb-2 ${isDbzTheme ? 'text-white' : ''}`}
            />
          )}
          {addItemType === 'task' && (
            <Input
              placeholder="Due date (optional)"
              value={newItem.dueDate}
              onChange={e => setNewItem({ ...newItem, dueDate: e.target.value })}
              className={`mb-2 ${isDbzTheme ? 'text-white' : ''}`}
            />
          )}
          {addItemType === 'task' && (
            <Input
              placeholder="Estimated time (minutes, optional)"
              value={newItem.estimatedTime}
              onChange={e => setNewItem({ ...newItem, estimatedTime: e.target.value })}
              className={`mb-2 ${isDbzTheme ? 'text-white' : ''}`}
            />
          )}
          <Input
            placeholder="Logged time (minutes, optional)"
            value={newItem.loggedTime}
            onChange={e => setNewItem({ ...newItem, loggedTime: e.target.value })}
            className={`mb-2 ${isDbzTheme ? 'text-white' : ''}`}
          />
          <DialogFooter>
            <Button onClick={async () => {
              if (!newItem.title.trim()) {
                toast.error(addItemType === 'task' ? 'Task title is required' : 'Tool name is required');
                return;
              }
              if (addItemType === 'task') {
                const loggedTime = newItem.loggedTime ? parseInt(newItem.loggedTime) : 0;
                const newTask = {
                  id: Date.now().toString(),
                  title: newItem.title,
                  completed: false,
                  dueDate: newItem.dueDate || null,
                  estimatedTime: newItem.estimatedTime ? parseInt(newItem.estimatedTime) : null,
                  loggedTime,
                  xpEarned: loggedTime,
                };
                const updatedTasks = [...(project.tasks || []), newTask];
                await updateDoc(doc(db, "projects", projectId), { tasks: updatedTasks });
                setProject((prev: any) => ({ ...prev, tasks: updatedTasks }));
              } else {
                const loggedTime = newItem.loggedTime ? parseInt(newItem.loggedTime) : 0;
                const newTool = {
                  id: Date.now().toString(),
                  name: newItem.title,
                  description: newItem.description || null,
                  loggedTime,
                  xpEarned: loggedTime,
                };
                const updatedTools = [...(project.tools || []), newTool];
                await updateDoc(doc(db, "projects", projectId), { tools: updatedTools });
                setProject((prev: any) => ({ ...prev, tools: updatedTools }));
              }
              setNewItem({ title: '', description: '', dueDate: '', estimatedTime: '', loggedTime: '', xpEarned: '' });
              setIsAddItemDialogOpen(false);
              toast.success(addItemType === 'task' ? 'Task added successfully!' : 'Tool/Implementation added successfully!');
            }}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isEditTaskDialogOpen} onOpenChange={setIsEditTaskDialogOpen}>
        <DialogContent className={`${themeStyles.cardBg} ${themeStyles.border} ${isDbzTheme ? 'text-white' : ''}`}>
          <DialogHeader>
            <DialogTitle className={themeStyles.textPrimary}>Edit Task</DialogTitle>
          </DialogHeader>
          <label className="block text-sm font-medium mb-1">Task Title</label>
          <Input
            placeholder="Task title"
            value={editingTask?.title || ""}
            onChange={e => setEditingTask((prev: any) => ({ ...prev, title: e.target.value }))}
            className={`mb-2 ${isDbzTheme ? 'text-white' : ''}`}
          />
          <label className="block text-sm font-medium mb-1">Due Date (optional)</label>
          <Input
            placeholder="Due date (optional)"
            value={editingTask?.dueDate || ""}
            onChange={e => setEditingTask((prev: any) => ({ ...prev, dueDate: e.target.value }))}
            className={`mb-2 ${isDbzTheme ? 'text-white' : ''}`}
          />
          <label className="block text-sm font-medium mb-1">Estimated Time (minutes, optional)</label>
          <Input
            placeholder="Estimated time (minutes, optional)"
            value={editingTask?.estimatedTime || ""}
            onChange={e => setEditingTask((prev: any) => ({ ...prev, estimatedTime: e.target.value }))}
            className={`mb-2 ${isDbzTheme ? 'text-white' : ''}`}
          />
          <label className="block text-sm font-medium mb-1">Logged Time (minutes, optional)</label>
          <Input
            placeholder="Logged time (minutes, optional)"
            value={editingTask?.loggedTime || ""}
            onChange={e => {
              const loggedTime = e.target.value;
              setEditingTask((prev: any) => ({
                ...prev,
                loggedTime,
                xpEarned: loggedTime ? String(Number(loggedTime)) : ""
              }));
            }}
            className={`mb-2 ${isDbzTheme ? 'text-white' : ''}`}
          />
          <label className="block text-sm font-medium mb-1">Add Time (minutes)</label>
          <Input
            placeholder="Add Time (minutes)"
            value={additionalTime}
            onChange={e => setAdditionalTime(e.target.value)}
            className={`mb-2 ${isDbzTheme ? 'text-white' : ''}`}
          />
          <DialogFooter>
            <Button onClick={handleSaveEditTask}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isEditProjectDialogOpen} onOpenChange={setIsEditProjectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Project name"
            value={editProject?.name || ""}
            onChange={e => setEditProject((prev: any) => ({ ...prev, name: e.target.value }))}
            className="mb-2"
          />
          <Input
            placeholder="Description"
            value={editProject?.description || ""}
            onChange={e => setEditProject((prev: any) => ({ ...prev, description: e.target.value }))}
            className="mb-2"
          />
          <Input
            placeholder="Due date (optional)"
            value={editProject?.dueDate || ""}
            onChange={e => setEditProject((prev: any) => ({ ...prev, dueDate: e.target.value }))}
            className="mb-2 hidden"
          />
          <label htmlFor="edit-due-date" className="block text-sm font-medium mb-1">Due Date</label>
          <input
            type="date"
            id="edit-due-date"
            value={editProject?.dueDate ? editProject.dueDate.slice(0, 10) : ""}
            onChange={e => setEditProject((prev: any) => ({ ...prev, dueDate: e.target.value }))}
            className={`mb-2 border rounded px-2 py-1 text-sm w-full
              ${theme === 'dbz' ? 'bg-yellow-100 text-black border-yellow-400 focus:ring-yellow-300' : ''}
              ${theme === 'naruto' ? 'bg-orange-100 text-black border-orange-400 focus:ring-orange-300' : ''}
              ${theme === 'hogwarts' ? 'bg-purple-900 text-yellow-100 border-purple-400 focus:ring-purple-300' : ''}
              ${theme === 'classic' ? 'bg-white text-black border-gray-300 focus:ring-blue-300' : ''}
            `}
            placeholder="Due date (optional)"
          />
          <Input
            placeholder="Start date (optional)"
            value={editProject?.startDate || ""}
            onChange={e => setEditProject((prev: any) => ({ ...prev, startDate: e.target.value }))}
            className="mb-2 hidden"
          />
          <label htmlFor="edit-start-date" className="block text-sm font-medium mb-1">Start Date</label>
          <input
            type="date"
            id="edit-start-date"
            value={editProject?.startDate ? editProject.startDate.slice(0, 10) : ""}
            onChange={e => setEditProject((prev: any) => ({ ...prev, startDate: e.target.value }))}
            className={`mb-2 border rounded px-2 py-1 text-sm w-full
              ${theme === 'dbz' ? 'bg-yellow-100 text-black border-yellow-400 focus:ring-yellow-300' : ''}
              ${theme === 'naruto' ? 'bg-orange-100 text-black border-orange-400 focus:ring-orange-300' : ''}
              ${theme === 'hogwarts' ? 'bg-purple-900 text-yellow-100 border-purple-400 focus:ring-purple-300' : ''}
              ${theme === 'classic' ? 'bg-white text-black border-gray-300 focus:ring-blue-300' : ''}
            `}
            placeholder="Start date (optional)"
          />
          <Input
            placeholder="Priority (low, medium, high)"
            value={editProject?.priority || ""}
            onChange={e => setEditProject((prev: any) => ({ ...prev, priority: e.target.value }))}
            className="mb-2"
          />
          <div className="mb-2">
            <label htmlFor="edit-progress-method" className="block text-sm font-medium mb-1">
              Progress Calculation Method
            </label>
            <select
              id="edit-progress-method"
              value={editProject?.progressMethod || 'manual'}
              onChange={e => setEditProject((prev: any) => ({ ...prev, progressMethod: e.target.value }))}
              className={`border rounded px-2 py-1 text-sm 
                ${theme === 'dbz' ? 'bg-yellow-100 text-black border-yellow-400 focus:ring-yellow-300' : ''}
                ${theme === 'naruto' ? 'bg-orange-100 text-black border-orange-400 focus:ring-orange-300' : ''}
                ${theme === 'hogwarts' ? 'bg-purple-900 text-yellow-100 border-purple-400 focus:ring-purple-300' : ''}
                ${theme === 'classic' ? 'bg-white text-black border-gray-300 focus:ring-blue-300' : ''}
              `}
            >
              <option value="manual">Manual</option>
              <option value="tasks">Task Completion</option>
              <option value="time">Time Logged</option>
            </select>
          </div>
          <div className="mb-2">
            <label htmlFor="expected-time" className="block text-sm font-medium mb-1">Total Expected Time</label>
            <div className="flex gap-2 items-center">
              <input
                id="expected-time"
                type="number"
                min="0"
                value={expectedTimeInput.value}
                onChange={e => setExpectedTimeInput({ ...expectedTimeInput, value: e.target.value })}
                className={`border rounded px-2 py-1 text-sm w-24
                  ${theme === 'dbz' ? 'bg-yellow-100 text-black border-yellow-400 focus:ring-yellow-300' : ''}
                  ${theme === 'naruto' ? 'bg-orange-100 text-black border-orange-400 focus:ring-orange-300' : ''}
                  ${theme === 'hogwarts' ? 'bg-purple-900 text-yellow-100 border-purple-400 focus:ring-purple-300' : ''}
                  ${theme === 'classic' ? 'bg-white text-black border-gray-300 focus:ring-blue-300' : ''}
                `}
                placeholder="e.g. 120"
              />
              <select
                value={expectedTimeInput.unit}
                onChange={e => setExpectedTimeInput({ ...expectedTimeInput, unit: e.target.value as 'minutes' | 'hours' })}
                className={`border rounded px-2 py-1 text-sm
                  ${theme === 'dbz' ? 'bg-yellow-100 text-black border-yellow-400 focus:ring-yellow-300' : ''}
                  ${theme === 'naruto' ? 'bg-orange-100 text-black border-orange-400 focus:ring-orange-300' : ''}
                  ${theme === 'hogwarts' ? 'bg-purple-900 text-yellow-100 border-purple-400 focus:ring-purple-300' : ''}
                  ${theme === 'classic' ? 'bg-white text-black border-gray-300 focus:ring-blue-300' : ''}
                `}
              >
                <option value="minutes">minutes</option>
                <option value="hours">hours</option>
              </select>
            </div>
            <div className="text-xs text-slate-400 mt-1">Set the total expected time for this project (used for time progress calculation).</div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveEditProject}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isDeleteProjectDialogOpen} onOpenChange={setIsDeleteProjectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
          </DialogHeader>
          <p className="mb-4 text-red-400">Are you sure you want to delete this project? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteProjectDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteProject} disabled={deletingProject}>
              {deletingProject ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isEditToolDialogOpen} onOpenChange={setIsEditToolDialogOpen}>
        <DialogContent className={`${themeStyles.cardBg} ${themeStyles.border} ${isDbzTheme ? 'text-white' : ''}`}>
          <DialogHeader>
            <DialogTitle className={themeStyles.textPrimary}>Edit Tool / Implementation</DialogTitle>
          </DialogHeader>
          <label className="block text-sm font-medium mb-1">Tool Name</label>
          <Input
            placeholder="Tool name"
            value={editingTool?.name || ""}
            onChange={e => setEditingTool((prev: any) => ({ ...prev, name: e.target.value }))}
            className={`mb-2 ${isDbzTheme ? 'text-white' : ''}`}
          />
          <label className="block text-sm font-medium mb-1">Description (optional)</label>
          <Input
            placeholder="Description (optional)"
            value={editingTool?.description || ""}
            onChange={e => setEditingTool((prev: any) => ({ ...prev, description: e.target.value }))}
            className={`mb-2 ${isDbzTheme ? 'text-white' : ''}`}
          />
          <label className="block text-sm font-medium mb-1">Logged Time (minutes, optional)</label>
          <Input
            placeholder="Logged time (minutes, optional)"
            value={editingTool?.loggedTime || ""}
            onChange={e => {
              const loggedTime = e.target.value;
              setEditingTool((prev: any) => ({
                ...prev,
                loggedTime,
                xpEarned: loggedTime ? String(Number(loggedTime)) : ""
              }));
            }}
            className={`mb-2 ${isDbzTheme ? 'text-white' : ''}`}
          />
          <label className="block text-sm font-medium mb-1">Add Time (minutes)</label>
          <Input
            placeholder="Add Time (minutes)"
            value={additionalToolTime}
            onChange={e => setAdditionalToolTime(e.target.value)}
            className={`mb-2 ${isDbzTheme ? 'text-white' : ''}`}
          />
          <DialogFooter>
            <Button onClick={handleSaveEditTool}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 