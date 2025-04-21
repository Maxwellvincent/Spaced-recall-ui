export interface StudyPhase {
  type: 'initial' | 'consolidation' | 'mastery';
  xpEarned: number;
  status: 'completed' | 'in-progress';
  activities: {
    type: 'video' | 'book' | 'recall' | 'mindmap' | 'questions' | 'teaching';
    xp: number;
    completed: boolean;
    notes?: string;
  }[];
}

export interface StudySession {
  date: string;
  duration: number;
  rating: number;
  notes?: string;
  nextReviewDate: string;
  phase: StudyPhase;
  totalXpEarned: number;
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
  studySessions?: StudySession[];
  fsrsParams?: {
    stability: number;
    difficulty: number;
    retrievability: number;
    lastReview: string;
  };
  currentPhase?: 'initial' | 'consolidation' | 'mastery';
  xp: number;
  level: number;
  framework?: StudyFramework;
  aiPrompts?: AIPrompt[];
  resources?: StudyResource[];
  mindmap?: {
    nodes: {
      id: string;
      label: string;
      x: number;
      y: number;
    }[];
    edges: {
      from: string;
      to: string;
      label?: string;
    }[];
  };
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
  prompt: string;
  userAnswer?: string;
  aiFeedback?: string;
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