import { activityTypes } from "@/lib/xpSystem";
import { TimerSettings } from './timer';
import { ProjectWorkItem } from '@/types/project';

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

// Book reading habit extension
export interface BookReadingHabit extends Habit {
  habitSubtype: 'book-reading';
  book: {
    title: string;
    author?: string;
    totalPages?: number;
    currentPage: number; // Current page the user is on
    startDate: string;
    completionDate?: string;
    isCompleted: boolean;
  };
  readingSessions: Array<{
    date: string;
    startPage: number;
    endPage: number;
    duration: number; // Minutes spent reading
    summary?: string; // User's summary of what they read
  }>;
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
  workItems?: ProjectWorkItem[];
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
export type Activity = Habit | Todo | Project | BookReadingHabit;

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

export type ActivityType = 'habit' | 'todo' | 'project';
export type ActivityStatus = 'active' | 'completed' | 'archived';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Frequency = 'daily' | 'weekly' | 'monthly';

interface BaseActivity {
  id: string;
  userId: string;
  name: string;
  description?: string;
  type: ActivityType;
  status: ActivityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TimedActivitySession {
  id: string;
  startTime: string;
  endTime: string;
  duration: number;
  activeTime: number;
  idleTime: number;
  overtime?: number;
}

export interface HabitActivity extends BaseActivity {
  type: 'habit';
  difficulty: Difficulty;
  frequency: Frequency;
  streak: number;
  bestStreak: number;
  completedCount: number;
  lastCompleted?: string;
  completionHistory: Array<{
    date: string;
    duration?: number;
    activeTime?: number;
  }>;
  isTimed?: boolean;
  timerSettings?: TimerSettings;
  sessions?: TimedActivitySession[];
}

export interface TodoActivity extends BaseActivity {
  type: 'todo';
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  completedAt?: string;
  isTimed?: boolean;
  timerSettings?: TimerSettings;
  sessions?: TimedActivitySession[];
}

export interface ProjectMilestone {
  id: string;
  name: string;
  description?: string;
  dueDate?: string;
  completedAt?: string;
  order: number;
}

export interface ProjectActivity extends BaseActivity {
  type: 'project';
  startDate: string;
  endDate?: string;
  progress: number;
  milestones: ProjectMilestone[];
  isTimed?: boolean;
  timerSettings?: TimerSettings;
  sessions?: TimedActivitySession[];
  workItems?: ProjectWorkItem[];
}

export type Activity = HabitActivity | TodoActivity | ProjectActivity;

export interface ActivityStats {
  totalActivities: number;
  completedActivities: number;
  activeStreaks: number;
  totalTimeSpent: number;
  activeTime: number;
  longestStreak: number;
} 