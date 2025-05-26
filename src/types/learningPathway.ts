export interface LearningPathway {
  id: string;
  name: string;
  description?: string;
  domainIds: string[];
  subjectIds: string[];
  topicIds: string[];
  userIds: string[]; // Users enrolled in this pathway
  createdAt: string;
  // Optionally, add progress tracking fields
  // progressByUser?: { [userId: string]: number };
} 