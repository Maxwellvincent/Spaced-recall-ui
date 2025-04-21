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