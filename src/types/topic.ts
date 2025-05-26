export interface Concept {
  name: string;
  description?: string;
  masteryLevel?: number;
  lastStudied?: string;
  nextReview?: string;
  reviewInterval?: number;
}

export interface Topic {
  id: string;
  name: string;
  description?: string;
  subjectId: string;
  domainId: string;
  parentTopicId?: string | null;
  concepts: Concept[];
  // Optionally, you can add subtopics as an array of IDs for normalization
  // subtopicIds?: string[];
  createdAt: string;
  // Add any other fields as needed (e.g., masteryLevel, xp, etc.)
  masteryLevel?: number;
  xp?: number;
  lastStudied?: string;
  nextReview?: string;
  reviewInterval?: number;
  // ...
} 