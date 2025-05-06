import { differenceInDays, addDays, isBefore } from 'date-fns';
import type { Subject } from '@/types/study';

interface FSRSState {
  stability: number;
  difficulty: number;
  retrievability: number;
}

interface FSRSResult {
  nextReview: Date;
  stability: number;
  difficulty: number;
  retrievability: number;
}

type StudyStyle = 'visual' | 'auditory' | 'reading' | 'kinesthetic' | 'mixed';

const INITIAL_STABILITY = 1;
const INITIAL_DIFFICULTY = 0.3;
const MIN_STABILITY = 0.1;
const MAX_STABILITY = 100;
const MIN_DIFFICULTY = 0.1;
const MAX_DIFFICULTY = 10;

const STUDY_STYLE_MULTIPLIERS: Record<StudyStyle, number> = {
  visual: 1.2,    // Visual learners benefit from more frequent reviews
  auditory: 1.1,  // Auditory learners need slightly more frequent reviews
  reading: 1.0,   // Reading/writing learners follow standard intervals
  kinesthetic: 0.9, // Kinesthetic learners can handle longer intervals
  mixed: 1.0      // Mixed style follows standard intervals
};

interface FSRSParameters {
  requestRetention: number;
  maximumInterval: number;
  w: [number, number, number, number];
  defaultFactor: number;
}

interface ReviewLog {
  rating: 1 | 2 | 3 | 4; // 1: Again, 2: Hard, 3: Good, 4: Easy
  interval: number;
  factor: number;
  date: string;
}

const DEFAULT_PARAMETERS: FSRSParameters = {
  requestRetention: 0.9,
  maximumInterval: 36500,
  w: [1, 1, 5, 8], // weights for different difficulty ratings
  defaultFactor: 2.5,
};

interface ExamPreparationConfig {
  daysUntilExam: number;
  masteryLevel: number;
  isWeakArea: boolean;
  lastReviewPerformance?: number; // 1-4 rating from last review
  reviewCount: number; // number of times reviewed
}

// Add these constants at the top with other constants
const WEAK_AREA_THRESHOLD = 60; // Mastery level below this is considered weak
const CRITICAL_EXAM_PERIOD = 7; // Days before exam when review frequency increases dramatically
const HIGH_PRIORITY_PERIOD = 14; // Days before exam when weak areas need more attention
const EXAM_PREP_PERIOD = 30; // Days before exam when schedule adjustments begin

export class FSRS {
  private static calculateRetrievability(stability: number, elapsedDays: number): number {
    return Math.exp(Math.log(0.9) * elapsedDays / stability);
  }

  private static calculateNextReview(
    stability: number,
    targetRetrievability: number,
    studyStyle: StudyStyle
  ): number {
    const baseDays = Math.ceil(stability * Math.log(targetRetrievability) / Math.log(0.9));
    return Math.ceil(baseDays * STUDY_STYLE_MULTIPLIERS[studyStyle]);
  }

  private static updateStability(
    oldStability: number,
    difficulty: number,
    performance: number,
    studyStyle: StudyStyle
  ): number {
    const performanceFactor = Math.max(0.1, Math.min(1, performance));
    const difficultyFactor = Math.max(0.1, Math.min(1, 1 - difficulty));
    const styleFactor = STUDY_STYLE_MULTIPLIERS[studyStyle];
    
    let newStability = oldStability * (1 + (performanceFactor * difficultyFactor * styleFactor));
    return Math.max(MIN_STABILITY, Math.min(MAX_STABILITY, newStability));
  }

  private static updateDifficulty(
    oldDifficulty: number,
    performance: number,
    studyStyle: StudyStyle
  ): number {
    const performanceFactor = Math.max(0.1, Math.min(1, performance));
    const styleFactor = STUDY_STYLE_MULTIPLIERS[studyStyle];
    
    let newDifficulty = oldDifficulty + (0.1 - (5 - performanceFactor) * (0.08 + (5 - performanceFactor) * 0.02)) * styleFactor;
    return Math.max(MIN_DIFFICULTY, Math.min(MAX_DIFFICULTY, newDifficulty));
  }

  public static calculateNextReviewDate(
    lastReview: Date,
    stability: number,
    difficulty: number,
    performance: number,
    studyStyle: StudyStyle = 'mixed'
  ): FSRSResult {
    const elapsedDays = (Date.now() - lastReview.getTime()) / (1000 * 60 * 60 * 24);
    const retrievability = this.calculateRetrievability(stability, elapsedDays);

    const newStability = this.updateStability(stability, difficulty, performance, studyStyle);
    const newDifficulty = this.updateDifficulty(difficulty, performance, studyStyle);
    
    const daysUntilNextReview = this.calculateNextReview(newStability, 0.9, studyStyle);
    const nextReview = new Date(Date.now() + daysUntilNextReview * 24 * 60 * 60 * 1000);

    return {
      nextReview,
      stability: newStability,
      difficulty: newDifficulty,
      retrievability
    };
  }

  public static getInitialState(): FSRSState {
    return {
      stability: INITIAL_STABILITY,
      difficulty: INITIAL_DIFFICULTY,
      retrievability: 1
    };
  }

  public static getStudyStyleMultiplier(studyStyle: StudyStyle): number {
    return STUDY_STYLE_MULTIPLIERS[studyStyle];
  }
}

export function calculateNextReview(
  lastReview: ReviewLog | null,
  rating: 1 | 2 | 3 | 4,
  masteryLevel: number,
  params: Partial<FSRSParameters> = {},
  examConfig?: {
    examDate?: Date;
    isWeakArea?: boolean;
    reviewCount?: number;
  }
): { interval: number; factor: number } {
  const result = calculateBaseNextReview(lastReview, rating, masteryLevel, params);

  if (examConfig?.examDate) {
    const daysUntilExam = differenceInDays(examConfig.examDate, new Date());
    
    if (daysUntilExam <= EXAM_PREP_PERIOD) {
      const examInterval = calculateExamReviewInterval({
        daysUntilExam,
        masteryLevel,
        isWeakArea: examConfig.isWeakArea || false,
        lastReviewPerformance: rating,
        reviewCount: examConfig.reviewCount || 0
      });

      // Use the more frequent of the two intervals
      result.interval = Math.min(result.interval, examInterval);
    }
  }

  return result;
}

function calculateBaseNextReview(
  lastReview: ReviewLog | null,
  rating: 1 | 2 | 3 | 4,
  masteryLevel: number,
  params: Partial<FSRSParameters> = {}
): { interval: number; factor: number } {
  const p = { ...DEFAULT_PARAMETERS, ...params };
  
  if (!lastReview) {
    const baseInterval = rating === 1 ? 1 : rating === 2 ? 2 : rating === 3 ? 4 : 6;
    return {
      interval: baseInterval,
      factor: p.defaultFactor
    };
  }

  const difficultyAdjustment = (rating - 3) * 0.15;
  let newFactor = Math.max(1.3, lastReview.factor + difficultyAdjustment);

  let interval: number;
  if (rating === 1) {
    interval = 1;
    newFactor = Math.max(1.3, newFactor * 0.8);
  } else {
    const masteryBonus = Math.max(0, (masteryLevel - 50) / 100);
    const weight = p.w[rating - 1];
    interval = Math.round(lastReview.interval * newFactor * weight * (1 + masteryBonus));
  }

  interval = Math.min(p.maximumInterval, Math.max(1, interval));

  return {
    interval,
    factor: newFactor
  };
}

function calculateExamReviewInterval(config: ExamPreparationConfig): number {
  const { daysUntilExam, masteryLevel, isWeakArea, lastReviewPerformance = 3, reviewCount } = config;
  
  // Base interval calculation
  let interval: number;
  
  if (daysUntilExam <= CRITICAL_EXAM_PERIOD) {
    // Critical period - very frequent reviews
    if (isWeakArea) {
      interval = masteryLevel < 30 ? 1 : masteryLevel < 50 ? 2 : 3;
    } else {
      interval = masteryLevel < 50 ? 2 : 3;
    }
  } else if (daysUntilExam <= HIGH_PRIORITY_PERIOD) {
    // High priority period - focus on weak areas
    if (isWeakArea) {
      interval = masteryLevel < 40 ? 2 : 3;
    } else {
      interval = Math.max(3, Math.floor(masteryLevel / 20));
    }
  } else {
    // Regular exam prep period
    if (isWeakArea) {
      interval = Math.max(3, Math.floor(masteryLevel / 15));
    } else {
      interval = Math.max(4, Math.floor(masteryLevel / 10));
    }
  }

  // Adjust based on review performance and count
  if (lastReviewPerformance <= 2) {
    interval = Math.max(1, interval - 1); // Reduce interval for poor performance
  }
  if (reviewCount >= 3 && lastReviewPerformance >= 3) {
    interval = Math.min(interval + 1, Math.floor(daysUntilExam / 3)); // Increase interval for consistent good performance
  }

  // Ensure minimum reviews before exam
  const minimumReviews = isWeakArea ? 5 : 3;
  const maxInterval = Math.floor(daysUntilExam / minimumReviews);
  
  return Math.min(interval, maxInterval);
}

function generateReviewRecommendations(daysUntilExam: number, weakAreas: { name: string; masteryLevel: number; type: string }[]) {
  const recommendations = [];

  if (daysUntilExam <= CRITICAL_EXAM_PERIOD) {
    recommendations.push({
      priority: 'Immediate',
      items: weakAreas.filter(area => area.masteryLevel < 40),
      frequency: 'Daily review required'
    });
  }

  if (daysUntilExam <= HIGH_PRIORITY_PERIOD) {
    recommendations.push({
      priority: 'High',
      items: weakAreas.filter(area => area.masteryLevel >= 40 && area.masteryLevel < 60),
      frequency: 'Review every 2-3 days'
    });
  }

  recommendations.push({
    priority: 'Normal',
    items: weakAreas.filter(area => area.masteryLevel >= 60),
    frequency: `Review every ${daysUntilExam <= HIGH_PRIORITY_PERIOD ? '3-4' : '4-5'} days`
  });

  return recommendations;
}

function generateExamPrepMessage(daysUntilExam: number, weakAreas: { name: string; masteryLevel: number; type: string }[]): string {
  if (daysUntilExam <= CRITICAL_EXAM_PERIOD) {
    return `Critical exam preparation period! Focus on ${weakAreas.length} weak areas with daily reviews.`;
  } else if (daysUntilExam <= HIGH_PRIORITY_PERIOD) {
    return `High priority review period. Increase focus on weak areas with reviews every 2-3 days.`;
  } else {
    return `Exam preparation mode active. Maintaining regular review schedule with emphasis on weak areas.`;
  }
}

export function calculateRetentionScore(
  interval: number,
  rating: 1 | 2 | 3 | 4,
  params: Partial<FSRSParameters> = {}
): number {
  const p = { ...DEFAULT_PARAMETERS, ...params };
  
  // Calculate retention based on interval and rating
  const baseRetention = Math.exp(-interval / (p.w[rating - 1] * 100));
  return Math.round((1 - baseRetention) * 100);
}

export function suggestInitialInterval(masteryLevel: number, examDate?: Date) {
  // Base interval calculation based on mastery
  let interval = Math.max(1, Math.floor(masteryLevel / 20)); // 1-5 days based on mastery

  // If there's an exam date, adjust the initial interval
  if (examDate) {
    const daysUntilExam = differenceInDays(examDate, new Date());
    if (daysUntilExam > 0) {
      // Ensure we get enough reviews before the exam
      const desiredReviews = masteryLevel < 50 ? 5 : 3;
      interval = Math.min(interval, Math.floor(daysUntilExam / desiredReviews));
    }
  }

  return Math.max(1, interval); // Ensure minimum 1 day interval
}

export function getRatingDescription(rating: 1 | 2 | 3 | 4): string {
  switch (rating) {
    case 1: return "Again - Complete blackout";
    case 2: return "Hard - Significant effort to remember";
    case 3: return "Good - Some effort, but remembered";
    case 4: return "Easy - Perfect recall";
  }
}

export function adjustReviewSchedule(subject: Subject) {
  if (!subject.examMode?.isActive || !subject.examMode?.scheduledDate || subject.examMode?.isSuspended) {
    return null;
  }

  const examDate = new Date(subject.examMode.scheduledDate);
  const now = new Date();
  const daysUntilExam = differenceInDays(examDate, now);

  // Get weak topics and concepts
  const weakAreas = subject.topics.flatMap(topic => {
    const items: { name: string; masteryLevel: number; type: 'topic' | 'concept' }[] = [];
    
    if (topic.masteryLevel < WEAK_AREA_THRESHOLD) {
      items.push({ name: topic.name, masteryLevel: topic.masteryLevel, type: 'topic' });
    }
    
    topic.concepts?.forEach(concept => {
      if (concept.masteryLevel < WEAK_AREA_THRESHOLD) {
        items.push({ name: concept.name, masteryLevel: concept.masteryLevel, type: 'concept' });
      }
    });
    
    return items;
  });

  // Sort weak areas by mastery level (ascending)
  weakAreas.sort((a, b) => a.masteryLevel - b.masteryLevel);

  if (daysUntilExam <= EXAM_PREP_PERIOD) {
    const reviewPlan = {
      increasedFrequency: true,
      weakAreas,
      reviewIntervals: {
        critical: calculateExamReviewInterval({ 
          daysUntilExam, 
          masteryLevel: 0, 
          isWeakArea: true,
          reviewCount: 0
        }),
        weak: calculateExamReviewInterval({ 
          daysUntilExam, 
          masteryLevel: 50, 
          isWeakArea: true,
          reviewCount: 0
        }),
        normal: calculateExamReviewInterval({ 
          daysUntilExam, 
          masteryLevel: 80, 
          isWeakArea: false,
          reviewCount: 0
        })
      },
      recommendations: generateReviewRecommendations(daysUntilExam, weakAreas),
      message: generateExamPrepMessage(daysUntilExam, weakAreas)
    };

    return reviewPlan;
  }

  return null;
} 