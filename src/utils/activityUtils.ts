import { v4 as uuidv4 } from 'uuid';
import { Habit, Todo, Project, Activity, ActivityStats, BookReadingHabit } from '@/types/activities';
import { calculateSessionXP } from '@/lib/xpSystem';
console.log('DEBUG calculateSessionXP:', calculateSessionXP);

/**
 * Create a new habit
 */
export function createHabit(data: Partial<Habit> & { name: string; userId: string }): Habit {
  return {
    id: uuidv4(),
    name: data.name,
    description: data.description || '',
    createdAt: new Date().toISOString(),
    userId: data.userId,
    xp: 0,
    completedCount: 0,
    streak: 0,
    type: 'habit',
    frequency: data.frequency || 'daily',
    customFrequency: data.customFrequency,
    timeOfDay: data.timeOfDay || 'anytime',
    timeRequired: data.timeRequired || 15,
    difficulty: data.difficulty || 'medium',
    completionHistory: [],
    currentStreak: 0,
    bestStreak: 0,
    tags: data.tags || [],
  };
}

/**
 * Create a new book reading habit
 */
export function createBookReadingHabit(
  data: Partial<BookReadingHabit> & { 
    name: string; 
    userId: string;
    book: {
      title: string;
      author?: string;
      totalPages?: number;
    }
  }
): BookReadingHabit {
  const baseHabit = createHabit(data);
  
  return {
    ...baseHabit,
    habitSubtype: 'book-reading',
    book: {
      title: data.book.title,
      author: data.book.author || '',
      totalPages: data.book.totalPages || 0,
      currentPage: 0,
      startDate: new Date().toISOString(),
      isCompleted: false,
    },
    readingSessions: [],
  } as BookReadingHabit;
}

/**
 * Create a new todo
 */
export function createTodo(data: Partial<Todo> & { name: string; userId: string }): Todo {
  return {
    id: uuidv4(),
    name: data.name,
    description: data.description || '',
    createdAt: new Date().toISOString(),
    userId: data.userId,
    xp: 0,
    completedCount: 0,
    streak: 0,
    type: 'todo',
    status: 'pending',
    priority: data.priority || 'medium',
    dueDate: data.dueDate,
    difficulty: data.difficulty || 'medium',
    projectId: data.projectId,
    estimatedTime: data.estimatedTime,
    subtasks: data.subtasks || [],
    tags: data.tags || [],
  };
}

/**
 * Create a new project
 */
export function createProject(data: Partial<Project> & { name: string; userId: string }): Project {
  return {
    id: uuidv4(),
    name: data.name,
    description: data.description || '',
    createdAt: new Date().toISOString(),
    userId: data.userId,
    xp: 0,
    completedCount: 0,
    streak: 0,
    type: 'project',
    status: 'planning',
    priority: data.priority || 'medium',
    startDate: data.startDate || new Date().toISOString(),
    dueDate: data.dueDate,
    progress: 0,
    todos: data.todos || [],
    milestones: data.milestones || [],
    tags: data.tags || [],
  };
}

/**
 * Complete a habit and calculate XP
 */
export function completeHabit(habit: Habit): { updatedHabit: Habit; xpGained: number } {
  const now = new Date().toISOString();
  const lastCompletionDate = habit.completionHistory.length > 0 
    ? new Date(habit.completionHistory[0].date) 
    : null;
  
  // Calculate streak
  let newStreak = habit.currentStreak;
  if (lastCompletionDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lastDate = new Date(lastCompletionDate);
    lastDate.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Check if streak should continue based on frequency
    let streakContinues = false;
    switch (habit.frequency) {
      case 'daily':
        streakContinues = diffDays <= 1;
        break;
      case 'weekly':
        streakContinues = diffDays <= 7;
        break;
      case 'monthly':
        streakContinues = diffDays <= 31;
        break;
      case 'custom':
        streakContinues = diffDays <= (habit.customFrequency || 1);
        break;
    }
    
    if (streakContinues) {
      newStreak += 1;
    } else {
      newStreak = 1; // Reset streak
    }
  } else {
    newStreak = 1; // First completion
  }
  
  // Calculate XP based on difficulty and streak
  const difficultyMap = { 'easy': 'easy', 'medium': 'medium', 'hard': 'hard' } as const;
  const xpResult = calculateSessionXP({
    activityType: 'habit',
    difficulty: difficultyMap[habit.difficulty],
    duration: habit.timeRequired || 15,
    currentLevel: Math.floor(habit.xp / 1000) + 1,
  });
  
  // Apply streak bonus (5% per day of streak, up to 100%)
  const streakMultiplier = Math.min(2, 1 + (newStreak * 0.05));
  const finalXp = Math.round(xpResult.xp * streakMultiplier);
  
  // Update habit
  const updatedHabit: Habit = {
    ...habit,
    completionHistory: [
      { date: now, completed: true },
      ...habit.completionHistory
    ],
    currentStreak: newStreak,
    bestStreak: Math.max(habit.bestStreak, newStreak),
    lastCompleted: now,
    completedCount: habit.completedCount + 1,
    xp: habit.xp + finalXp,
  };
  
  return { updatedHabit, xpGained: finalXp };
}

/**
 * Complete a todo and calculate XP
 */
export function completeTodo(todo: Todo, actualTime?: number): { updatedTodo: Todo; xpGained: number } {
  const now = new Date().toISOString();
  
  // Calculate XP based on priority and difficulty
  const difficultyMap = { 'easy': 'easy', 'medium': 'medium', 'hard': 'hard' } as const;
  const priorityMultiplier = {
    'low': 0.8,
    'medium': 1.0,
    'high': 1.2,
    'urgent': 1.5
  }[todo.priority];
  
  const estimatedDuration = todo.estimatedTime || 30;
  const actualDuration = actualTime || estimatedDuration;
  
  const xpResult = calculateSessionXP({
    activityType: 'todo',
    difficulty: difficultyMap[todo.difficulty],
    duration: actualDuration,
    currentLevel: Math.floor(todo.xp / 1000) + 1,
  });
  
  // Apply priority multiplier
  const finalXp = Math.round(xpResult.xp * priorityMultiplier);
  
  // Calculate completion percentage of subtasks
  const subtasksCompleted = todo.subtasks?.filter(st => st.completed).length || 0;
  const subtasksTotal = todo.subtasks?.length || 0;
  const subtaskCompletionRate = subtasksTotal > 0 ? subtasksCompleted / subtasksTotal : 1;
  
  // Update todo
  const updatedTodo: Todo = {
    ...todo,
    status: 'completed',
    completedAt: now,
    actualTime,
    lastCompleted: now,
    completedCount: todo.completedCount + 1,
    xp: todo.xp + finalXp,
  };
  
  return { updatedTodo, xpGained: finalXp };
}

/**
 * Update project progress and calculate XP
 */
export function updateProjectProgress(
  project: Project, 
  newProgress: number
): { updatedProject: Project; xpGained: number } {
  // Calculate XP based on progress increase
  const progressIncrease = Math.max(0, newProgress - project.progress);
  
  if (progressIncrease <= 0) {
    return { updatedProject: project, xpGained: 0 };
  }
  
  // Calculate XP based on complexity and progress increase
  const priorityMultiplier = {
    'low': 0.8,
    'medium': 1.0,
    'high': 1.2
  }[project.priority];
  
  const xpResult = calculateSessionXP({
    activityType: 'project',
    difficulty: 'medium', // Default to medium
    duration: 60, // Default to 1 hour
    currentLevel: Math.floor(project.xp / 1000) + 1,
  });
  
  // Scale XP by progress increase (0-100%)
  const progressFactor = progressIncrease / 100;
  const finalXp = Math.round(xpResult.xp * priorityMultiplier * progressFactor);
  
  // Check if project is now complete
  const isComplete = newProgress >= 100;
  
  // Update project
  const updatedProject: Project = {
    ...project,
    progress: newProgress,
    status: isComplete ? 'completed' : project.status,
    completedAt: isComplete ? new Date().toISOString() : project.completedAt,
    lastCompleted: isComplete ? new Date().toISOString() : project.lastCompleted,
    completedCount: isComplete ? project.completedCount + 1 : project.completedCount,
    xp: project.xp + finalXp,
  };
  
  return { updatedProject, xpGained: finalXp };
}

/**
 * Complete a project milestone and calculate XP
 */
export function completeProjectMilestone(
  project: Project, 
  milestoneId: string
): { updatedProject: Project; xpGained: number } {
  const milestone = project.milestones.find(m => m.id === milestoneId);
  
  if (!milestone || milestone.completed) {
    return { updatedProject: project, xpGained: 0 };
  }
  
  // Calculate XP for milestone completion
  const xpResult = calculateSessionXP({
    activityType: 'milestone',
    difficulty: 'medium', // Default to medium
    duration: 60, // Default to 1 hour
    currentLevel: Math.floor(project.xp / 1000) + 1,
  });
  
  const finalXp = xpResult.xp;
  
  // Update milestone
  const updatedMilestones = project.milestones.map(m => 
    m.id === milestoneId 
      ? { ...m, completed: true, completedAt: new Date().toISOString() } 
      : m
  );
  
  // Calculate new progress based on completed milestones
  const completedMilestones = updatedMilestones.filter(m => m.completed).length;
  const totalMilestones = updatedMilestones.length;
  const newProgress = Math.round((completedMilestones / totalMilestones) * 100);
  
  // Update project
  const updatedProject: Project = {
    ...project,
    milestones: updatedMilestones,
    progress: newProgress,
    lastCompleted: new Date().toISOString(),
    xp: project.xp + finalXp,
  };
  
  return { updatedProject, xpGained: finalXp };
}

/**
 * Record a reading session and calculate XP
 */
export function recordReadingSession(
  habit: BookReadingHabit, 
  session: { 
    startPage: number; 
    endPage: number; 
    duration: number; 
    summary?: string;
  }
): { updatedHabit: BookReadingHabit; xpGained: number } {
  const now = new Date().toISOString();
  const pagesRead = Math.max(0, session.endPage - session.startPage);
  
  if (pagesRead <= 0) {
    return { updatedHabit: habit, xpGained: 0 };
  }
  
  // First, complete the habit as usual
  const { updatedHabit: baseUpdatedHabit, xpGained: baseXp } = completeHabit(habit);
  
  // Calculate additional XP for pages read
  // Base: 1 XP per page, adjusted for difficulty
  const difficultyMultiplier = {
    'easy': 0.8,
    'medium': 1.0,
    'hard': 1.5
  }[habit.difficulty];
  
  const pagesXp = Math.round(pagesRead * difficultyMultiplier);
  
  // Bonus XP for adding a summary (encourages reflection)
  const summaryBonus = session.summary && session.summary.length > 50 ? 20 : 0;
  
  // Total XP
  const totalXp = baseXp + pagesXp + summaryBonus;
  
  // Check if book is now complete
  const isBookComplete = 
    habit.book.totalPages && 
    session.endPage >= habit.book.totalPages;
  
  // Apply completion bonus if book is finished
  const completionBonus = isBookComplete ? 100 : 0;
  
  // Create updated habit
  const updatedHabit: BookReadingHabit = {
    ...baseUpdatedHabit,
    book: {
      ...habit.book,
      currentPage: session.endPage,
      isCompleted: isBookComplete,
      completionDate: isBookComplete ? now : habit.book.completionDate,
    },
    readingSessions: [
      {
        date: now,
        startPage: session.startPage,
        endPage: session.endPage,
        duration: session.duration,
        summary: session.summary,
      },
      ...habit.readingSessions,
    ],
    xp: baseUpdatedHabit.xp + pagesXp + summaryBonus + completionBonus,
  } as BookReadingHabit;
  
  return { 
    updatedHabit, 
    xpGained: totalXp + completionBonus 
  };
}

/**
 * Calculate activity statistics for a user
 */
export function calculateActivityStats(activities: Activity[]): ActivityStats {
  const stats: ActivityStats = {
    totalActivities: activities.length,
    completedActivities: 0,
    pendingActivities: 0,
    totalXpGained: 0,
    currentStreak: 0,
    bestStreak: 0,
    completionRate: 0,
  };
  
  // Calculate total XP and counts
  activities.forEach(activity => {
    stats.totalXpGained += activity.xp;
    
    if (activity.type === 'habit') {
      stats.currentStreak = Math.max(stats.currentStreak, activity.currentStreak);
      stats.bestStreak = Math.max(stats.bestStreak, activity.bestStreak);
      if (activity.completionHistory.length > 0 && activity.completionHistory[0].completed) {
        stats.completedActivities++;
      } else {
        stats.pendingActivities++;
      }
    } else if (activity.type === 'todo') {
      if (activity.status === 'completed') {
        stats.completedActivities++;
      } else {
        stats.pendingActivities++;
      }
    } else if (activity.type === 'project') {
      if (activity.status === 'completed') {
        stats.completedActivities++;
      } else {
        stats.pendingActivities++;
      }
    }
  });
  
  // Calculate completion rate
  if (activities.length > 0) {
    stats.completionRate = (stats.completedActivities / activities.length) * 100;
  }
  
  return stats;
} 