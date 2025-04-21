interface FSRSState {
  stability: number;
  difficulty: number;
  retrievability: number;
}

interface Scheduling {
  scheduledDate: Date;
  stability: number;
  difficulty: number;
  retrievability: number;
}

interface StudyPhase {
  type: 'initial' | 'consolidation' | 'mastery';
  status: 'in-progress' | 'completed';
  xpEarned: number;
  activities: {
    type: 'video' | 'book' | 'recall' | 'mindmap' | 'questions' | 'teaching';
    completed: boolean;
    xp: number;
    notes?: string;
  }[];
}

interface StudySession {
  date: string;
  duration: number;
  rating: number;
  notes?: string;
  nextReviewDate: string;
  phase: StudyPhase;
  totalXpEarned: number;
  testingSandwich?: {
    preQuestions: number; // Score on initial questions
    postQuestions: number; // Score after read/recall
  };
}

interface Topic {
  name: string;
  description: string;
  masteryLevel: number;
  lastStudied: string;
  totalStudyTime: number;
  examScore?: number;
  weakAreas?: string[];
  concepts?: Topic[];
  studySessions?: StudySession[];
  currentPhase: 'initial' | 'consolidation' | 'mastery';
  fsrsParams?: {
    stability: number;
    difficulty: number;
    retrievability: number;
    lastReview: string;
  };
  resourceType?: 'easy' | 'medium' | 'hard'; // Type of resource being used
}

const XP_REWARDS = {
  initial: {
    video: 50,
    book: 50,
    recall: 100,
  },
  consolidation: {
    mindmap: 150,
    questions: 100,
  },
  mastery: {
    questions: 200,
    teaching: 300,
  }
};

const SPACING_INTERVALS = {
  initial: 1, // 1 day
  consolidation: 3, // 3 days
  mastery: 7, // 7 days
};

export class SpacedRepetition {
  private static readonly MIN_STABILITY = 0.1;
  private static readonly MAX_STABILITY = 100;
  private static readonly MIN_DIFFICULTY = 0.1;
  private static readonly MAX_DIFFICULTY = 10;
  private static readonly FORGETTING_CURVE = 0.5;

  static repeat(state: FSRSState, now: Date, rating: number): Scheduling {
    // Update difficulty based on rating (1-5)
    const difficulty = this.updateDifficulty(state.difficulty, rating);
    
    // Calculate stability based on rating and current stability
    const stability = this.updateStability(state.stability, difficulty, rating);
    
    // Calculate retrievability
    const retrievability = this.calculateRetrievability(stability, now, state.lastReview);
    
    // Calculate next review date based on phase
    const scheduledDate = this.calculateNextReviewDate(stability, retrievability, now);
    
    return {
      scheduledDate,
      stability,
      difficulty,
      retrievability
    };
  }

  private static updateDifficulty(currentDifficulty: number, rating: number): number {
    // Rating 1-5, where 1 is hardest and 5 is easiest
    const ratingFactor = (6 - rating) / 5; // Convert to 1-0.2 scale
    const newDifficulty = currentDifficulty + (ratingFactor - 0.5) * 0.1;
    return Math.max(
      this.MIN_DIFFICULTY,
      Math.min(this.MAX_DIFFICULTY, newDifficulty)
    );
  }

  private static updateStability(currentStability: number, difficulty: number, rating: number): number {
    // Higher ratings increase stability more
    const ratingFactor = rating / 5; // Convert to 0.2-1 scale
    const difficultyFactor = 1 / difficulty;
    const newStability = currentStability * (1 + ratingFactor * difficultyFactor);
    return Math.max(
      this.MIN_STABILITY,
      Math.min(this.MAX_STABILITY, newStability)
    );
  }

  private static calculateRetrievability(stability: number, now: Date, lastReview: Date): number {
    const hoursSinceLastReview = (now.getTime() - lastReview.getTime()) / (1000 * 60 * 60);
    return Math.exp(-hoursSinceLastReview / (stability * 24));
  }

  private static calculateNextReviewDate(stability: number, retrievability: number, now: Date): Date {
    // Target retrievability (when to review next)
    const targetRetrievability = 0.9;
    
    // Calculate hours until next review
    const hoursUntilNextReview = -Math.log(targetRetrievability) * stability * 24;
    
    // Add hours to current date
    const nextReview = new Date(now);
    nextReview.setHours(nextReview.getHours() + hoursUntilNextReview);
    
    return nextReview;
  }

  static calculateXp(phase: StudyPhase): number {
    return phase.activities.reduce((total, activity) => {
      if (activity.completed) {
        return total + activity.xp;
      }
      return total;
    }, 0);
  }

  static getNextPhase(currentPhase: 'initial' | 'consolidation' | 'mastery'): 'initial' | 'consolidation' | 'mastery' {
    switch (currentPhase) {
      case 'initial':
        return 'consolidation';
      case 'consolidation':
        return 'mastery';
      case 'mastery':
        return 'mastery'; // Stay in mastery phase
    }
  }

  static createInitialPhase(): StudyPhase {
    return {
      type: 'initial',
      status: 'in-progress',
      xpEarned: 0,
      activities: [
        { type: 'video', completed: false, xp: XP_REWARDS.initial.video },
        { type: 'book', completed: false, xp: XP_REWARDS.initial.book },
        { type: 'recall', completed: false, xp: XP_REWARDS.initial.recall }
      ]
    };
  }

  static createConsolidationPhase(): StudyPhase {
    return {
      type: 'consolidation',
      status: 'in-progress',
      xpEarned: 0,
      activities: [
        { type: 'mindmap', completed: false, xp: XP_REWARDS.consolidation.mindmap },
        { type: 'questions', completed: false, xp: XP_REWARDS.consolidation.questions }
      ]
    };
  }

  static createMasteryPhase(): StudyPhase {
    return {
      type: 'mastery',
      status: 'in-progress',
      xpEarned: 0,
      activities: [
        { type: 'questions', completed: false, xp: XP_REWARDS.mastery.questions },
        { type: 'teaching', completed: false, xp: XP_REWARDS.mastery.teaching }
      ]
    };
  }

  static isPhaseComplete(phase: StudyPhase): boolean {
    return phase.activities.every(activity => activity.completed);
  }

  static updateActivity(phase: StudyPhase, activityType: string, completed: boolean, notes?: string): StudyPhase {
    const updatedActivities = phase.activities.map(activity => {
      if (activity.type === activityType) {
        return { ...activity, completed, notes };
      }
      return activity;
    });

    const xpEarned = this.calculateXp({ ...phase, activities: updatedActivities });
    const status = this.isPhaseComplete({ ...phase, activities: updatedActivities }) ? 'completed' : 'in-progress';

    return {
      ...phase,
      activities: updatedActivities,
      xpEarned,
      status
    };
  }

  static getSpacingInterval(phase: 'initial' | 'consolidation' | 'mastery'): number {
    return SPACING_INTERVALS[phase];
  }
} 