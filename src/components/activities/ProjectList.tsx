import { useState } from "react";
import { Project } from "@/types/activities";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle, Clock, Trash2, Edit, Calendar, AlertCircle, 
  Loader2, Milestone, FolderKanban, BarChart3, ListChecks 
} from "lucide-react";
import Link from "next/link";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { useRouter } from "next/navigation";
import clsx from "clsx";

interface ProjectListProps {
  projects: Project[];
  onUpdateProgress: (id: string, progress: number) => Promise<{ xpGained: number; streak: number }>;
  onCompleteMilestone: (projectId: string, milestoneId: string) => Promise<{ xpGained: number; streak: number }>;
  onDelete: (id: string) => Promise<boolean>;
}

export function ProjectList({ projects, onUpdateProgress, onCompleteMilestone, onDelete }: ProjectListProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [xpGained, setXpGained] = useState<{ [id: string]: number }>({});
  const [progressValue, setProgressValue] = useState<{ [id: string]: number }>({});
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [expandedWorkItems, setExpandedWorkItems] = useState<string | null>(null);
  const router = useRouter();
  
  const handleUpdateProgress = async (id: string) => {
    try {
      const progress = progressValue[id];
      if (progress === undefined || progress < 0 || progress > 100) return;
      
      setUpdatingId(id);
      const result = await onUpdateProgress(id, progress);
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
      console.error("Error updating project progress:", error);
    } finally {
      setUpdatingId(null);
    }
  };
  
  const handleCompleteMilestone = async (projectId: string, milestoneId: string) => {
    try {
      setUpdatingId(projectId);
      const result = await onCompleteMilestone(projectId, milestoneId);
      setXpGained({ ...xpGained, [projectId]: result.xpGained });
      
      // Show XP gained for 3 seconds
      setTimeout(() => {
        setXpGained(prev => {
          const newState = { ...prev };
          delete newState[projectId];
          return newState;
        });
      }, 3000);
    } catch (error) {
      console.error("Error completing milestone:", error);
    } finally {
      setUpdatingId(null);
    }
  };
  
  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this project?")) {
      try {
        setDeletingId(id);
        await onDelete(id);
      } catch (error) {
        console.error("Error deleting project:", error);
      } finally {
        setDeletingId(null);
      }
    }
  };
  
  const handleProgressChange = (id: string, value: string) => {
    const progress = parseInt(value, 10);
    if (!isNaN(progress) && progress >= 0 && progress <= 100) {
      setProgressValue({ ...progressValue, [id]: progress });
    }
  };
  
  // Filter and sort projects
  const activeProjects = projects
    .filter(project => project.status !== 'completed' && project.status !== 'cancelled')
    .sort((a, b) => {
      // Sort by priority first
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by due date if available
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      
      // Finally by creation date
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    
  const completedProjects = projects
    .filter(project => project.status === 'completed')
    .sort((a, b) => 
      new Date(b.completedAt || b.createdAt).getTime() - 
      new Date(a.completedAt || a.createdAt).getTime()
    );
  
  if (projects.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-900/50 rounded-lg border border-slate-800">
        <AlertCircle className="mx-auto h-12 w-12 text-slate-500 mb-4" />
        <h3 className="text-xl font-medium text-slate-300 mb-2">No projects yet</h3>
        <p className="text-slate-400 mb-6">Create projects to organize your work and track progress</p>
        <Link href="/activities/new/project">
          <Button>Create your first project</Button>
        </Link>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      {activeProjects.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-slate-200 mb-4">Active Projects</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {activeProjects.map(project => {
              console.log('[ACTIVITIES TAB] Project:', project.id, project.name, 'Progress:', project.progress);
              const isPastDue = project.dueDate && isPast(new Date(project.dueDate));
              const isExpanded = expandedProject === project.id;
              const pendingMilestones = project.milestones.filter(m => !m.completed);
              const completedMilestones = project.milestones.filter(m => m.completed);
              
              return (
                <Card
                  key={project.id}
                  className={clsx(
                    "bg-slate-950 border-slate-800 cursor-pointer transition-all duration-200",
                    "aspect-square h-64 w-full flex flex-col justify-between overflow-hidden hover:scale-105 hover:shadow-2xl hover:border-blue-500",
                    isPastDue ? "border-l-4 border-l-red-500" : ""
                  )}
                  onClick={() => router.push(`/projects/${project.sourceProjectId || project.id}`)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="text-lg text-slate-100 flex items-center truncate">
                        <FolderKanban className="h-5 w-5 mr-2 text-blue-400" />
                        <span className="truncate max-w-[8rem]">{project.name}</span>
                      </div>
                      <Badge 
                        variant={
                          project.priority === 'low' ? 'outline' : 
                          project.priority === 'medium' ? 'secondary' : 
                          'default'
                        }
                      >
                        {project.priority}
                      </Badge>
                    </div>
                    <div className="flex gap-2 text-xs text-slate-400 mt-1 flex-wrap">
                      <span className="flex items-center">
                        <BarChart3 className="h-3 w-3 mr-1" />
                        {project.status}
                      </span>
                      {project.startDate && (
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          Started: {format(new Date(project.startDate), 'MMM d')}
                        </span>
                      )}
                      {project.dueDate && (
                        <span className={`flex items-center ${isPastDue ? 'text-red-400' : ''}`}> 
                          <Clock className="h-3 w-3 mr-1" />
                          Due: {format(new Date(project.dueDate), 'MMM d')}
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col justify-between p-2">
                    {project.description && (
                      <p className="text-sm text-slate-300 mb-2 line-clamp-2">{project.description}</p>
                    )}
                    <div className="mb-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-slate-300">Progress</span>
                        <span className="text-sm font-medium text-slate-300">
                          {project.progress}%
                        </span>
                      </div>
                      <Progress 
                        value={project.progress} 
                        className="h-2 bg-slate-800" 
                        indicatorClassName="bg-blue-500"
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="p-2 pt-0 flex flex-col gap-2">
                    <div className="flex justify-between w-full gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-400 hover:text-red-300 hover:bg-red-950"
                        onClick={e => { e.stopPropagation(); handleDelete(project.id); }}
                        disabled={!!deletingId || !!updatingId}
                      >
                        {deletingId === project.id ? (
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
                      <Link href={`/activities/edit/project/${project.id}`} onClick={e => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-blue-400 hover:text-blue-300 hover:bg-blue-950"
                          disabled={!!deletingId || !!updatingId}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </Link>
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      )}
      
      {completedProjects.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-slate-200 mb-4">Completed Projects</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {completedProjects.slice(0, 4).map(project => (
              <Card key={project.id} className="bg-slate-950 border-slate-800 opacity-80">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg text-slate-100 flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2 text-emerald-400" />
                      {project.name}
                    </CardTitle>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Completed {project.completedAt && formatDistanceToNow(new Date(project.completedAt), { addSuffix: true })}
                  </div>
                </CardHeader>
                
                <CardContent className="pb-2">
                  {project.description && (
                    <p className="text-sm text-slate-400 mb-3">{project.description}</p>
                  )}
                  
                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <span>XP gained: {project.xp}</span>
                    <span>Milestones: {project.milestones.filter(m => m.completed).length}/{project.milestones.length}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {completedProjects.length > 4 && (
            <div className="text-center mt-4">
              <Button variant="outline" size="sm">
                Show more ({completedProjects.length - 4} more)
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 