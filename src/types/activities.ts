import { activityTypes } from "@/lib/xpSystem";

// Base interface for all activity types
export interface BaseActivity {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  userId: string;
  xp: number;
  completedCount: number;
  streak: number;
  lastCompleted?: string;
  tags?: string[];
}

// Habit tracking
export interface Habit extends BaseActivity {
  type: 'habit';
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
  customFrequency?: number; // Days between required completions
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'anytime';
  timeRequired?: number; // Minutes
  difficulty: 'easy' | 'medium' | 'hard';
  completionHistory: Array<{
    date: string;
    completed: boolean;
    notes?: string;
  }>;
  currentStreak: number;
  bestStreak: number;
  reminderEnabled?: boolean;
  reminderTime?: string; // HH:MM format
}

// Todo item
export interface Todo extends BaseActivity {
  type: 'todo';
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  completedAt?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  projectId?: string; // Link to a project if this todo is part of one
  estimatedTime?: number; // Minutes
  actualTime?: number; // Minutes
  subtasks?: Array<{
    id: string;
    name: string;
    completed: boolean;
    completedAt?: string;
  }>;
}

// Project tracking
export interface Project extends BaseActivity {
  type: 'project';
  status: 'planning' | 'in-progress' | 'on-hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  startDate?: string;
  dueDate?: string;
  completedAt?: string;
  progress: number; // 0-100
  todos: string[]; // Array of todo IDs associated with this project
  milestones: Array<{
    id: string;
    name: string;
    description?: string;
    dueDate?: string;
    completed: boolean;
    completedAt?: string;
  }>;
  collaborators?: string[]; // Array of user IDs
}

// Activity session for tracking time spent
export interface ActivitySession {
  id: string;
  activityId: string;
  activityType: 'habit' | 'todo' | 'project';
  startTime: string;
  endTime?: string;
  duration: number; // Minutes
  notes?: string;
  xpGained: number;
}

// Union type for all activity types
export type Activity = Habit | Todo | Project;

// Interface for activity stats
export interface ActivityStats {
  totalActivities: number;
  completedActivities: number;
  pendingActivities: number;
  totalXpGained: number;
  currentStreak: number;
  bestStreak: number;
  completionRate: number;
} 