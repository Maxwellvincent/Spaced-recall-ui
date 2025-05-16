import { useState } from "react";
import { Project } from "@/types/activities";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle, Clock, Trash2, Edit, Calendar, AlertCircle, 
  Loader2, Milestone, FolderKanban, BarChart3 
} from "lucide-react";
import Link from "next/link";
import { format, formatDistanceToNow, isPast } from "date-fns";

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
          <div className="grid grid-cols-1 gap-6">
            {activeProjects.map(project => {
              const isPastDue = project.dueDate && isPast(new Date(project.dueDate));
              const isExpanded = expandedProject === project.id;
              const pendingMilestones = project.milestones.filter(m => !m.completed);
              const completedMilestones = project.milestones.filter(m => m.completed);
              
              return (
                <Card 
                  key={project.id} 
                  className={`bg-slate-950 border-slate-800 ${
                    isPastDue ? 'border-l-4 border-l-red-500' : ''
                  }`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg text-slate-100 flex items-center">
                        <FolderKanban className="h-5 w-5 mr-2 text-blue-400" />
                        {project.name}
                      </CardTitle>
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
                    <div className="flex gap-2 text-xs text-slate-400 mt-1">
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
                  
                  <CardContent>
                    {project.description && (
                      <p className="text-sm text-slate-300 mb-4">{project.description}</p>
                    )}
                    
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
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
                    
                    {updatingId === project.id && !xpGained[project.id] && (
                      <div className="mb-4">
                        <label className="text-xs text-slate-400 block mb-1">
                          Update progress (0-100%):
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            className="flex-1 px-2 py-1 text-sm bg-slate-900 border border-slate-700 rounded text-slate-200"
                            placeholder={project.progress.toString()}
                            value={progressValue[project.id] || project.progress}
                            onChange={(e) => handleProgressChange(project.id, e.target.value)}
                            autoFocus
                          />
                          <Button 
                            size="sm"
                            onClick={() => handleUpdateProgress(project.id)}
                          >
                            Update
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {xpGained[project.id] && (
                      <div className="mb-4 text-center animate-pulse">
                        <span className="text-emerald-400 font-semibold">
                          +{xpGained[project.id]} XP
                        </span>
                      </div>
                    )}
                    
                    {project.milestones.length > 0 && (
                      <div className="mt-4">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                          className="mb-2 w-full flex justify-between"
                        >
                          <span className="flex items-center">
                            <Milestone className="h-4 w-4 mr-2" />
                            Milestones ({completedMilestones.length}/{project.milestones.length})
                          </span>
                          <span>{isExpanded ? '▲' : '▼'}</span>
                        </Button>
                        
                        {isExpanded && (
                          <div className="space-y-3 mt-3 pl-2 border-l-2 border-slate-800">
                            {pendingMilestones.length > 0 && (
                              <div className="space-y-2">
                                <h4 className="text-sm font-medium text-slate-300">Pending</h4>
                                {pendingMilestones.map(milestone => (
                                  <div 
                                    key={milestone.id} 
                                    className="bg-slate-900/50 p-3 rounded-md border border-slate-800"
                                  >
                                    <div className="flex justify-between items-start mb-1">
                                      <span className="text-sm font-medium text-slate-200">
                                        {milestone.name}
                                      </span>
                                      {milestone.dueDate && (
                                        <span className={`text-xs ${
                                          isPast(new Date(milestone.dueDate)) ? 'text-red-400' : 'text-slate-400'
                                        }`}>
                                          Due: {format(new Date(milestone.dueDate), 'MMM d')}
                                        </span>
                                      )}
                                    </div>
                                    {milestone.description && (
                                      <p className="text-xs text-slate-400 mb-2">{milestone.description}</p>
                                    )}
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      className="mt-1 w-full"
                                      onClick={() => handleCompleteMilestone(project.id, milestone.id)}
                                      disabled={!!updatingId}
                                    >
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Complete Milestone
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {completedMilestones.length > 0 && (
                              <div className="space-y-2">
                                <h4 className="text-sm font-medium text-slate-300">Completed</h4>
                                {completedMilestones.map(milestone => (
                                  <div 
                                    key={milestone.id} 
                                    className="bg-slate-900/30 p-3 rounded-md border border-slate-800"
                                  >
                                    <div className="flex justify-between items-start mb-1">
                                      <span className="text-sm font-medium text-slate-300 flex items-center">
                                        <CheckCircle className="h-3 w-3 mr-1 text-emerald-400" />
                                        {milestone.name}
                                      </span>
                                      {milestone.completedAt && (
                                        <span className="text-xs text-slate-400">
                                          {formatDistanceToNow(new Date(milestone.completedAt), { addSuffix: true })}
                                        </span>
                                      )}
                                    </div>
                                    {milestone.description && (
                                      <p className="text-xs text-slate-500">{milestone.description}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                  
                  <CardFooter>
                    <div className="flex justify-between w-full">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-400 hover:text-red-300 hover:bg-red-950"
                        onClick={() => handleDelete(project.id)}
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
                      
                      <div className="flex gap-2">
                        <Link href={`/activities/edit/project/${project.id}`}>
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
                        
                        {updatingId === project.id ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setUpdatingId(null)}
                            disabled={!!xpGained[project.id]}
                          >
                            Cancel
                          </Button>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => {
                              setProgressValue({ ...progressValue, [project.id]: project.progress });
                              setUpdatingId(project.id);
                            }}
                            disabled={!!updatingId || !!deletingId || project.progress === 100}
                          >
                            <BarChart3 className="h-3 w-3 mr-1" />
                            Update Progress
                          </Button>
                        )}
                      </div>
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