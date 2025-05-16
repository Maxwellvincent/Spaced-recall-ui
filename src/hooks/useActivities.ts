import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { Activity, Habit, Todo, Project, ActivityStats } from '@/types/activities';
import { createHabit, createTodo, createProject } from '@/utils/activityUtils';

interface UseActivitiesOptions {
  type?: 'habit' | 'todo' | 'project';
  autoLoad?: boolean;
}

interface UseActivitiesReturn {
  activities: Activity[];
  stats: ActivityStats | null;
  loading: boolean;
  error: Error | null;
  loadActivities: () => Promise<void>;
  createActivity: (data: Partial<Activity> & { name: string; type: 'habit' | 'todo' | 'project' }) => Promise<Activity>;
  updateActivity: (id: string, updates: Partial<Activity>) => Promise<Activity>;
  deleteActivity: (id: string) => Promise<boolean>;
  completeHabit: (id: string) => Promise<{ xpGained: number; streak: number }>;
  completeTodo: (id: string, actualTime?: number) => Promise<{ xpGained: number; streak: number }>;
  updateProjectProgress: (id: string, progress: number) => Promise<{ xpGained: number; streak: number }>;
  completeProjectMilestone: (projectId: string, milestoneId: string) => Promise<{ xpGained: number; streak: number }>;
}

export function useActivities(options: UseActivitiesOptions = {}): UseActivitiesReturn {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const loadActivities = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const url = new URL('/api/activities', window.location.origin);
      if (options.type) {
        url.searchParams.append('type', options.type);
      }
      
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`Failed to load activities: ${response.status}`);
      }
      
      const data = await response.json();
      setActivities(data.activities || []);
      setStats(data.stats || null);
    } catch (err) {
      console.error('Error loading activities:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [user, options.type]);

  const createActivity = useCallback(async (data: Partial<Activity> & { name: string; type: 'habit' | 'todo' | 'project' }): Promise<Activity> => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      setLoading(true);
      
      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to create activity: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Update local state
      setActivities(prev => [...prev, result.activity]);
      
      return result.activity;
    } catch (err) {
      console.error('Error creating activity:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updateActivity = useCallback(async (id: string, updates: Partial<Activity>): Promise<Activity> => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      setLoading(true);
      
      const response = await fetch('/api/activities', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, ...updates }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update activity: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Update local state
      setActivities(prev => 
        prev.map(activity => 
          activity.id === id ? result.activity : activity
        )
      );
      
      return result.activity;
    } catch (err) {
      console.error('Error updating activity:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const deleteActivity = useCallback(async (id: string): Promise<boolean> => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      setLoading(true);
      
      const response = await fetch(`/api/activities?id=${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete activity: ${response.status}`);
      }
      
      // Update local state
      setActivities(prev => prev.filter(activity => activity.id !== id));
      
      return true;
    } catch (err) {
      console.error('Error deleting activity:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const completeActivity = useCallback(async (
    activityId: string, 
    additionalData: Record<string, any> = {}
  ): Promise<{ xpGained: number; streak: number }> => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      setLoading(true);
      
      const response = await fetch('/api/activities/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ activityId, ...additionalData }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to complete activity: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Update local state
      setActivities(prev => 
        prev.map(activity => 
          activity.id === activityId ? result.activity : activity
        )
      );
      
      return { 
        xpGained: result.xpGained,
        streak: result.streak
      };
    } catch (err) {
      console.error('Error completing activity:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const completeHabit = useCallback((id: string) => {
    return completeActivity(id);
  }, [completeActivity]);

  const completeTodo = useCallback((id: string, actualTime?: number) => {
    return completeActivity(id, { actualTime });
  }, [completeActivity]);

  const updateProjectProgress = useCallback((id: string, progress: number) => {
    return completeActivity(id, { progress });
  }, [completeActivity]);

  const completeProjectMilestone = useCallback((projectId: string, milestoneId: string) => {
    return completeActivity(projectId, { milestoneId });
  }, [completeActivity]);

  // Load activities on mount if autoLoad is true
  useEffect(() => {
    if (options.autoLoad !== false && user) {
      loadActivities();
    }
  }, [loadActivities, options.autoLoad, user]);

  return {
    activities,
    stats,
    loading,
    error,
    loadActivities,
    createActivity,
    updateActivity,
    deleteActivity,
    completeHabit,
    completeTodo,
    updateProjectProgress,
    completeProjectMilestone,
  };
} 