import { Timestamp } from 'firebase/firestore';

export type WorkItemType = 'task' | 'implementation' | 'improvement' | 'tool';

// XP calculation rules for different work types
export const XP_RULES = {
  task: {
    base: 150,  // Combined previous base + completion
    priority: {
      low: 25,
      medium: 50,
      high: 100
    }
  },
  implementation: {
    base: 300,  // Combined previous base + completion
    impact: {
      minor: 50,
      moderate: 100,
      major: 200
    },
    withTechnicalDetails: 50
  },
  improvement: {
    base: 225,  // Combined previous base + completion
    impact: {
      minor: 25,
      moderate: 75,
      major: 150
    },
    withTechnicalDetails: 50
  },
  tool: {
    base: 300,  // Combined previous base + completion
    impact: {
      minor: 50,
      moderate: 100,
      major: 200
    },
    withTechnicalDetails: 50
  }
} as const;

export interface ProjectWorkItem {
  id: string;
  type: WorkItemType;
  title: string;
  description: string;
  status: 'not-started' | 'in-progress' | 'completed';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
  // XP tracking
  potentialXP: number;  // Calculated potential XP to be awarded on completion
  xpAwarded: boolean;   // Whether XP has been awarded
  // For tasks
  dueDate?: Timestamp;
  priority?: 'low' | 'medium' | 'high';
  // For implementations/improvements
  category?: 'feature' | 'enhancement' | 'tool' | 'documentation' | 'refactor';
  impact?: 'minor' | 'moderate' | 'major';
  relatedTasks?: string[]; // IDs of related tasks if any
  technicalDetails?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'on-hold';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
  workItems: ProjectWorkItem[];
  totalXPEarned: number;
} 