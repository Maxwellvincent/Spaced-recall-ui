import { activityTypes, difficultyLevels } from "@/lib/xpSystem";

export interface StudyPhase {
  name: string;
  description: string;
  completed: boolean;
  score?: number;
}

export interface StudySession {
  id: string;
  date: string;
  duration: number;
  notes?: string;
  xpGained: number;
  masteryGained: number;
  activityType: keyof typeof activityTypes;
  difficulty: keyof typeof difficultyLevels;
}

export interface StudyTopic {
  id: string;
  name: string;
  description: string;
  masteryLevel: number;
  lastStudied: string;
  totalStudyTime: number;
  concepts: StudyTopic[];
  xp: number;
  level: number;
  activities: {
    id: string;
    type: 'video' | 'book' | 'recall' | 'mindmap' | 'questions' | 'teaching';
    status: 'completed' | 'in-progress';
    description: string;
    duration: number;
  }[];
  currentPhase?: 'initial' | 'consolidation' | 'mastery';
  studySessions?: StudySession[];
  framework?: StudyFramework;
}

export interface Topic {
  name: string;
  description: string;
  masteryLevel: number;
  lastStudied: string;
  totalStudyTime: number;
  examScore?: number;
  weakAreas?: string[];
  concepts?: Topic[];
  currentPhase: string;
  studySessions?: StudySession[];
  framework?: StudyFramework;
  mindmap?: {
    nodes: Array<{ id: string; label: string }>;
    edges: Array<{ from: string; to: string }>;
  };
  metrics?: {
    backtestWinRate?: number;
    forwardTestWinRate?: number;
    liveTradeWinRate?: number;
    totalTrades?: number;
    profitFactor?: number;
    averageRR?: number;
  };
  xp: number;
  level: number;
  activities?: {
    id: string;
    type: keyof typeof activityTypes;
    status: 'completed' | 'in-progress';
    description: string;
    duration: number;
    completedAt?: string;
    xpGained?: number;
    masteryGained?: number;
  }[];
}

export interface StudyFramework {
  currentPhase: 'learnRecall' | 'testingEffect' | 'reflectionDiagnosis' | 'integration' | 'teaching';
  progress: {
    learnRecall: number;
    testingEffect: number;
    reflectionDiagnosis: number;
    integration: number;
    teaching: number;
  };
  lastActivityDate: string;
  nextReviewDate: string;
  masteryScore: number;
  retentionScore: number;
  clarityScore: number;
}

export interface AIPrompt {
  topic: string;
  question: string;
  userAnswer: string;
  subject: string;
}

export interface AIResponse {
  isCorrect: boolean;
  aiFeedback: string;
  score?: number;
}

export interface StudyResource {
  type: 'video' | 'book' | 'article';
  title: string;
  url: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: number;
  topics: string[];
}

export interface Subject {
  name: string;
  description: string;
  studyStyle: string;
  customStudyStyle?: string;
  masteryPath: {
    currentLevel: number;
    nextLevel: number;
    progress: number;
  };
  xp: number;
  level: number;
  totalStudyTime: number;
  topics: Topic[];
  sessions: {
    date: string;
    duration: number;
    xpEarned: number;
  }[];
  examMode?: {
    isEnabled: boolean;
    totalScore: number;
    lastAttempt: string;
    weakAreas: string[];
    topicScores: {
      [topicName: string]: {
        score: number;
        lastAttempt: string;
        weakAreas: string[];
      };
    };
  };
}

export interface StudyRecommendation {
  nextActivity: 'video' | 'book' | 'recall' | 'mindmap' | 'questions' | 'teaching';
  reason: string;
  priority: 'high' | 'medium' | 'low';
  estimatedTime: number;
  suggestedResources?: string[];
}

export interface ProgressMetrics {
  totalStudyTime: number;
  videoCount: number;
  bookCount: number;
  recallCount: number;
  mindmapCount: number;
  questionsCount: number;
  teachingCount: number;
  averageRating: number;
  lastReviewDate: string;
  masteryLevel: number;
  xp: number;
  level: number;
} 