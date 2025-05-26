export interface UserPathway {
  pathwayId: string;
  userId: string;
  joinedAt: string;
  completedAt?: string;
  progress?: number; // 0-100%
  xp?: number;
  // Add more fields as needed
} 