import { useState } from "react";
import { Todo } from "@/types/activities";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle, Clock, Trash2, Edit, Calendar, AlertCircle, 
  Loader2, AlertTriangle, CheckSquare 
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow, isPast, format } from "date-fns";

interface TodoListProps {
  todos: Todo[];
  onComplete: (id: string, actualTime?: number) => Promise<{ xpGained: number; streak: number }>;
  onDelete: (id: string) => Promise<boolean>;
}

export function TodoList({ todos, onComplete, onDelete }: TodoListProps) {
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [xpGained, setXpGained] = useState<{ [id: string]: number }>({});
  const [actualTime, setActualTime] = useState<{ [id: string]: number }>({});
  
  const handleComplete = async (id: string) => {
    try {
      setCompletingId(id);
      const time = actualTime[id];
      const result = await onComplete(id, time);
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
      console.error("Error completing todo:", error);
    } finally {
      setCompletingId(null);
    }
  };
  
  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this todo?")) {
      try {
        setDeletingId(id);
        await onDelete(id);
      } catch (error) {
        console.error("Error deleting todo:", error);
      } finally {
        setDeletingId(null);
      }
    }
  };
  
  const handleActualTimeChange = (id: string, value: string) => {
    const time = parseInt(value, 10);
    if (!isNaN(time) && time > 0) {
      setActualTime({ ...actualTime, [id]: time });
    }
  };
  
  // Filter and sort todos
  const pendingTodos = todos
    .filter(todo => todo.status !== 'completed' && todo.status !== 'cancelled')
    .sort((a, b) => {
      // Sort by priority first
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
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
    
  const completedTodos = todos
    .filter(todo => todo.status === 'completed')
    .sort((a, b) => 
      new Date(b.completedAt || b.createdAt).getTime() - 
      new Date(a.completedAt || a.createdAt).getTime()
    );
  
  if (todos.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-900/50 rounded-lg border border-slate-800">
        <AlertCircle className="mx-auto h-12 w-12 text-slate-500 mb-4" />
        <h3 className="text-xl font-medium text-slate-300 mb-2">No todos yet</h3>
        <p className="text-slate-400 mb-6">Add tasks to track your progress and earn XP</p>
        <Link href="/activities/new/todo">
          <Button>Create your first todo</Button>
        </Link>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      {pendingTodos.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-slate-200 mb-4">Pending Tasks</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingTodos.map(todo => {
              const isPastDue = todo.dueDate && isPast(new Date(todo.dueDate));
              const subtaskProgress = todo.subtasks?.length 
                ? Math.round((todo.subtasks.filter(st => st.completed).length / todo.subtasks.length) * 100)
                : 0;
                
              return (
                <Card 
                  key={todo.id} 
                  className={`bg-slate-950 border-slate-800 overflow-hidden ${
                    isPastDue ? 'border-l-4 border-l-red-500' : ''
                  }`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg text-slate-100">{todo.name}</CardTitle>
                      <div className="flex gap-1">
                        <Badge 
                          variant={
                            todo.priority === 'low' ? 'outline' : 
                            todo.priority === 'medium' ? 'secondary' : 
                            todo.priority === 'high' ? 'default' : 
                            'destructive'
                          }
                          className="ml-2"
                        >
                          {todo.priority}
                        </Badge>
                        <Badge 
                          variant={
                            todo.difficulty === 'easy' ? 'outline' : 
                            todo.difficulty === 'medium' ? 'secondary' : 
                            'destructive'
                          }
                        >
                          {todo.difficulty}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2 text-xs text-slate-400 mt-1">
                      {todo.estimatedTime && (
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          ~{todo.estimatedTime} min
                        </span>
                      )}
                      {todo.dueDate && (
                        <span className={`flex items-center ${isPastDue ? 'text-red-400' : ''}`}>
                          <Calendar className="h-3 w-3 mr-1" />
                          {isPastDue ? 'Due ' : 'Due: '}
                          {format(new Date(todo.dueDate), 'MMM d')}
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pb-2">
                    {todo.description && (
                      <p className="text-sm text-slate-300 mb-3">{todo.description}</p>
                    )}
                    
                    {todo.subtasks && todo.subtasks.length > 0 && (
                      <div className="mt-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-slate-400">Subtasks</span>
                          <span className="text-xs font-medium text-slate-400">
                            {todo.subtasks.filter(st => st.completed).length}/{todo.subtasks.length}
                          </span>
                        </div>
                        <Progress 
                          value={subtaskProgress} 
                          className="h-1 bg-slate-800" 
                          indicatorClassName="bg-blue-500"
                        />
                      </div>
                    )}
                    
                    {xpGained[todo.id] && (
                      <div className="mt-3 text-center animate-pulse">
                        <span className="text-emerald-400 font-semibold">
                          +{xpGained[todo.id]} XP
                        </span>
                      </div>
                    )}
                    
                    {completingId === todo.id && (
                      <div className="mt-3">
                        <label className="text-xs text-slate-400 block mb-1">
                          Actual time spent (minutes):
                        </label>
                        <input
                          type="number"
                          min="1"
                          className="w-full px-2 py-1 text-sm bg-slate-900 border border-slate-700 rounded text-slate-200"
                          placeholder={todo.estimatedTime?.toString() || "15"}
                          onChange={(e) => handleActualTimeChange(todo.id, e.target.value)}
                          autoFocus
                        />
                      </div>
                    )}
                  </CardContent>
                  
                  <CardFooter className="pt-2">
                    <div className="flex justify-between w-full">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-400 hover:text-red-300 hover:bg-red-950"
                        onClick={() => handleDelete(todo.id)}
                        disabled={!!deletingId || !!completingId}
                      >
                        {deletingId === todo.id ? (
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
                        <Link href={`/activities/edit/todo/${todo.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-blue-400 hover:text-blue-300 hover:bg-blue-950"
                            disabled={!!deletingId || !!completingId}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        </Link>
                        
                        {completingId === todo.id ? (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleComplete(todo.id)}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Confirm
                          </Button>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => setCompletingId(todo.id)}
                            disabled={!!completingId || !!deletingId}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Complete
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
      
      {completedTodos.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-slate-200 mb-4">Completed Tasks</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedTodos.slice(0, 6).map(todo => (
              <Card key={todo.id} className="bg-slate-950 border-slate-800 opacity-80">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg text-slate-100 flex items-center">
                      <CheckSquare className="h-4 w-4 mr-2 text-emerald-400" />
                      <span className="line-through">{todo.name}</span>
                    </CardTitle>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Completed {todo.completedAt && formatDistanceToNow(new Date(todo.completedAt), { addSuffix: true })}
                  </div>
                </CardHeader>
                
                <CardContent className="pb-2">
                  {todo.description && (
                    <p className="text-sm text-slate-400 line-through mb-3">{todo.description}</p>
                  )}
                  
                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <span>XP gained: {todo.xp}</span>
                    {todo.actualTime && <span>Time: {todo.actualTime} min</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {completedTodos.length > 6 && (
            <div className="text-center mt-4">
              <Button variant="outline" size="sm">
                Show more ({completedTodos.length - 6} more)
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 