export interface CoreConcept {
  name: string;
  description: string;
}

export interface Topic {
  name: string;
  description: string;
  coreConcepts: string[];
  branch?: string;
  recommendedResources?: string[];
  estimatedStudyHours: number;
  isHabitBased?: boolean;
}

export interface SubjectStructure {
  name: string;
  description: string;
  topics: Topic[];
  totalEstimatedHours: number;
  recommendedOrder?: string[];
  prerequisites?: string[];
  createdAt?: string;
  updatedAt?: string;
  userId?: string;
}

export interface SubjectProgress {
  totalXP: number;
  averageMastery: number;
  completedTopics: number;
  totalTopics: number;
  lastStudied?: string;
  streak?: number;
}

export interface AISubjectHelperProps {
  onStructureGenerated: (structure: SubjectStructure) => void;
  onError: (error: string) => void;
}

export interface Subject {
  id: string;
  name: string;
  description?: string;
  domainId: string;
  // topics?: string[]; // Remove or comment out, topics are now in their own collection
  createdAt: string;
  // Add any other fields as needed
} 