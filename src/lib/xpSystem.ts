"use client";

// Function to generate custom theme using GPT
export async function generateCustomTheme(
  preferences: {
    interests: string[];
    favoriteBooks?: string[];
    favoriteMovies?: string[];
    learningStyle?: string;
  }
): Promise<ThemeConfig> {
  const prompt = `Create a learning theme based on these preferences:
    Interests: ${preferences.interests.join(', ')}
    ${preferences.favoriteBooks ? `Favorite Books: ${preferences.favoriteBooks.join(', ')}` : ''}
    ${preferences.favoriteMovies ? `Favorite Movies: ${preferences.favoriteMovies.join(', ')}` : ''}
    ${preferences.learningStyle ? `Learning Style: ${preferences.learningStyle}` : ''}

    Generate a theme with:
    1. A unique name
    2. A brief description
    3. 5 avatar levels with names, descriptions, and image paths
    4. An XP multiplier (between 1.0 and 1.5)
    
    Format the response as a JSON object matching the ThemeConfig interface.`;
  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        model: "gpt-4",
        maxTokens: 1000
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate theme');
    }

    const data = await response.json();
    const themeConfig = JSON.parse(data.content);
    return themeConfig;
  } catch (error) {
    console.error("Error generating custom theme:", error);
    return defaultThemes.neutral;
  }
}

// Available rewards for the loyalty system
export const AVAILABLE_REWARDS: Reward[] = [
  {
    id: 'theme_discount',
    name: 'Theme Discount',
    description: '50% off your next theme purchase',
    cost: 500,
    type: 'theme'
  },
  {
    id: 'xp_boost',
    name: 'XP Boost',
    description: '2x XP for your next 5 study sessions',
    cost: 300,
    type: 'points'
  },
  {
    id: 'gift_card_5',
    name: '$5 Gift Card',
    description: '$5 gift card for the app store of your choice',
    cost: 1000,
    type: 'giftCard',
    value: 5
  },
  {
    id: 'gift_card_10',
    name: '$10 Gift Card',
    description: '$10 gift card for the app store of your choice',
    cost: 2000,
    type: 'giftCard',
    value: 10
  }
];

// Base XP thresholds that can be modified by theme
export const baseXPThresholds = [
  0, 50, 100, 150, 200,     // Level 1–5
  300, 400, 500, 600, 700,  // Level 6–10
  900, 1100, 1300, 1500,    // Level 11–14
  1800, 2200, 2700, 3300,   // Level 15–18
  4000, 5000, 6200          // Level 19–21+
];

// Theme configurations
export interface ThemeConfig {
  name: string;
  description: string;
  xpMultiplier: number;
  avatarLevels: AvatarLevel[];
  customFeatures?: {
    [key: string]: any;
  };
}

export interface AvatarLevel {
  level: number;
  name: string;
  image: string;
  description: string;
}

// Default themes
export const defaultThemes: { [key: string]: ThemeConfig } = {
  neutral: {
    name: "Neutral",
    description: "A clean, professional theme focused on learning progression",
    xpMultiplier: 1,
    avatarLevels: [
      { level: 1, name: "Newbie", image: "/avatars/neutral/newbie.png", description: "Just starting your learning journey" },
      { level: 5, name: "Learner", image: "/avatars/neutral/learner.png", description: "Making steady progress" },
      { level: 10, name: "Mentor", image: "/avatars/neutral/mentor.png", description: "Sharing knowledge with others" },
      { level: 15, name: "Master", image: "/avatars/neutral/master.png", description: "Deep understanding of subjects" },
      { level: 20, name: "Grandmaster", image: "/avatars/neutral/grandmaster.png", description: "Expert in multiple fields" }
    ]
  },
  fantasy: {
    name: "Fantasy",
    description: "Magical journey through learning realms",
    xpMultiplier: 1.1,
    avatarLevels: [
      { level: 1, name: "Apprentice", image: "/avatars/fantasy/apprentice.png", description: "Beginning your magical studies" },
      { level: 5, name: "Mage", image: "/avatars/fantasy/mage.png", description: "Mastering basic spells" },
      { level: 10, name: "Archmage", image: "/avatars/fantasy/archmage.png", description: "Commanding powerful magic" },
      { level: 15, name: "Wizard", image: "/avatars/fantasy/wizard.png", description: "Creating new spells" },
      { level: 20, name: "Sorcerer Supreme", image: "/avatars/fantasy/supreme.png", description: "Master of all magical arts" }
    ]
  },
  scifi: {
    name: "Sci-Fi",
    description: "Space exploration and technological advancement",
    xpMultiplier: 1.2,
    avatarLevels: [
      { level: 1, name: "Cadet", image: "/avatars/scifi/cadet.png", description: "Starting space academy" },
      { level: 5, name: "Officer", image: "/avatars/scifi/officer.png", description: "Commanding small vessels" },
      { level: 10, name: "Captain", image: "/avatars/scifi/captain.png", description: "Leading space missions" },
      { level: 15, name: "Admiral", image: "/avatars/scifi/admiral.png", description: "Fleet commander" },
      { level: 20, name: "Fleet Admiral", image: "/avatars/scifi/fleet-admiral.png", description: "Supreme commander of all fleets" }
    ]
  }
};

// Activity types and their base XP multipliers
export const activityTypes = {
  backtesting: { name: 'Backtesting', baseXp: 50, factors: ['complexity', 'duration'] },
  paperTrading: { name: 'Paper Trading', baseXp: 40, factors: ['risk', 'duration'] },
  technicalAnalysis: { name: 'Technical Analysis', baseXp: 45, factors: ['depth', 'duration'] },
  fundamentalAnalysis: { name: 'Fundamental Analysis', baseXp: 45, factors: ['depth', 'duration'] },
  riskManagement: { name: 'Risk Management', baseXp: 35, factors: ['complexity', 'duration'] },
  tradingPsychology: { name: 'Trading Psychology', baseXp: 30, factors: ['reflection', 'duration'] },
  marketAnalysis: { name: 'Market Analysis', baseXp: 40, factors: ['depth', 'duration'] },
  strategyDevelopment: { name: 'Strategy Development', baseXp: 50, factors: ['complexity', 'duration'] },
  tradeJournaling: { name: 'Trade Journaling', baseXp: 25, factors: ['reflection', 'duration'] },
  study: { name: 'Study Session', baseXp: 30, factors: ['difficulty', 'duration'] },
  review: { name: 'Review Session', baseXp: 25, factors: ['difficulty', 'duration'] },
  practice: { name: 'Practice Session', baseXp: 35, factors: ['difficulty', 'duration'] },
};

export const difficultyLevels = {
  easy: { name: 'Easy', multiplier: 0.8 },
  medium: { name: 'Medium', multiplier: 1.0 },
  hard: { name: 'Hard', multiplier: 1.3 },
  expert: { name: 'Expert', multiplier: 1.6 },
};

export const calculateSessionXP = ({
  activityType,
  difficulty,
  duration,
  currentLevel = 1,
}: {
  activityType: keyof typeof activityTypes;
  difficulty: keyof typeof difficultyLevels;
  duration: number;
  currentLevel?: number;
}): { xp: number; masteryGained: number } => {
  const activity = activityTypes[activityType];
  const difficultyMultiplier = difficultyLevels[difficulty].multiplier;
  
  // Base XP calculation
  let baseXp = activity.baseXp;
  
  // Duration factor (XP per 30 minutes, with diminishing returns)
  const durationMultiplier = Math.pow(duration / 30, 0.8); // Diminishing returns for longer sessions
  
  // Level bonus (small bonus for higher levels to encourage progression)
  const levelMultiplier = 1 + (Math.log10(currentLevel) * 0.1);
  
  // Calculate final XP
  const totalXp = Math.round(
    baseXp * difficultyMultiplier * durationMultiplier * levelMultiplier
  );
  
  // Calculate mastery gained (based on difficulty and duration)
  // More difficult sessions give more mastery, but with diminishing returns
  const masteryGained = Math.min(
    20, // Cap mastery gain at 20% per session
    Math.round(
      (difficultyMultiplier * Math.sqrt(duration / 30) * 5) // Base mastery gain
    )
  );
  
  return {
    xp: totalXp,
    masteryGained,
  };
};

// Get current level based on XP
export function getLevelFromXP(xp: number, theme: ThemeConfig): number {
  const adjustedXP = xp / theme.xpMultiplier;
  for (let i = 0; i < baseXPThresholds.length; i++) {
    if (adjustedXP < baseXPThresholds[i]) {
      return i;
    }
  }
  return baseXPThresholds.length;
}

// Get progress to next level
export function getProgressToNextLevel(xp: number, theme: ThemeConfig): {
  currentXP: number;
  neededXP: number;
  percent: number;
} {
  const adjustedXP = xp / theme.xpMultiplier;
  const currentLevel = getLevelFromXP(xp, theme);
  const currentThreshold = baseXPThresholds[currentLevel - 1] || 0;
  const nextThreshold = baseXPThresholds[currentLevel] || baseXPThresholds[baseXPThresholds.length - 1];
  
  const currentLevelXP = adjustedXP - currentThreshold;
  const neededXP = nextThreshold - currentThreshold;
  const percent = Math.min(100, Math.round((currentLevelXP / neededXP) * 100));

  return {
    currentXP: Math.round(currentLevelXP),
    neededXP: Math.round(neededXP),
    percent
  };
}

// Get avatar for current level
export function getAvatarForLevel(theme: ThemeConfig, level: number): AvatarLevel {
  return theme.avatarLevels.reduce((prev, curr) => {
    return (level >= curr.level && curr.level > prev.level) ? curr : prev;
  });
}

// Get list of available themes
export function getAvailableThemes(): ThemeConfig[] {
  return Object.values(defaultThemes);
}

// Theme loyalty system
export interface ThemeLoyalty {
  themeName: string;
  startDate: Date;
  totalDays: number;
  streakDays: number;
  lastActiveDate: Date;
  loyaltyPoints: number;
  stars: number;
}

// Reward system
export interface Reward {
  id: string;
  name: string;
  description: string;
  cost: number;
  type: 'theme' | 'points' | 'giftCard';
  value?: number; // For gift cards
}

// Calculate loyalty points for an activity
export function calculateLoyaltyPoints(activity: {
  type: keyof typeof activityTypes;
  xp: number;
  theme: ThemeConfig;
  loyalty: ThemeLoyalty;
}): number {
  let points = activity.xp * 0.1; // Base points from XP

  // Streak bonus
  if (activity.loyalty.streakDays >= 7) {
    points *= 1.5; // 50% bonus for week+ streak
  } else if (activity.loyalty.streakDays >= 3) {
    points *= 1.2; // 20% bonus for 3+ day streak
  }

  // Theme duration bonus
  if (activity.loyalty.totalDays >= 30) {
    points *= 1.3; // 30% bonus for month+ loyalty
  }

  return Math.round(points);
}

// Calculate stars based on loyalty metrics
export function calculateStars(loyalty: ThemeLoyalty): number {
  let stars = 0;

  // Days using theme
  if (loyalty.totalDays >= 90) stars += 2;
  else if (loyalty.totalDays >= 30) stars += 1;

  // Streak
  if (loyalty.streakDays >= 30) stars += 3;
  else if (loyalty.streakDays >= 14) stars += 2;
  else if (loyalty.streakDays >= 7) stars += 1;

  // Points
  if (loyalty.loyaltyPoints >= 10000) stars += 3;
  else if (loyalty.loyaltyPoints >= 5000) stars += 2;
  else if (loyalty.loyaltyPoints >= 1000) stars += 1;

  return stars;
}

// Update loyalty status
export function updateLoyaltyStatus(
  currentLoyalty: ThemeLoyalty,
  newTheme?: string
): ThemeLoyalty {
  const today = new Date();
  const lastActive = new Date(currentLoyalty.lastActiveDate);
  const daysSinceLastActive = Math.floor(
    (today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (newTheme && newTheme !== currentLoyalty.themeName) {
    // Switching themes
    return {
      themeName: newTheme,
      startDate: today,
      totalDays: 1,
      streakDays: 1,
      lastActiveDate: today,
      loyaltyPoints: 0,
      stars: 0
    };
  } else {
    // Same theme
  return {
    ...currentLoyalty,
      totalDays: currentLoyalty.totalDays + (daysSinceLastActive > 0 ? 1 : 0),
      streakDays: daysSinceLastActive <= 1 ? currentLoyalty.streakDays + 1 : 1,
    lastActiveDate: today,
      stars: calculateStars(currentLoyalty)
  };
  }
}

// Calculate XP for study sessions, quizzes, etc.
export function calculateXP({
  type,
  duration,
  difficulty,
  performance = 100,
  timeTaken = 0,
  masteryLevel = 'beginner'
}: {
  type: 'study' | 'quiz' | 'practice' | 'review';
  duration: number;
  difficulty: number;
  performance?: number;
  timeTaken?: number;
  masteryLevel?: 'beginner' | 'intermediate' | 'advanced' | 'master';
}): number {
  // Base XP based on activity type
  let baseXP = 0;
  switch (type) {
    case 'study':
      baseXP = 20;
      break;
    case 'quiz':
      baseXP = 30;
      break;
    case 'practice':
      baseXP = 25;
      break;
    case 'review':
      baseXP = 15;
      break;
  }
  
  // Difficulty multiplier (1-10 scale)
  const difficultyMultiplier = 0.8 + (difficulty / 10);
  
  // Duration multiplier (minutes)
  const durationMultiplier = Math.sqrt(duration / 15);
  
  // Performance multiplier (0-100%)
  const performanceMultiplier = 0.5 + (performance / 200);
  
  // Mastery level multiplier
  let masteryMultiplier = 1.0;
  switch (masteryLevel) {
    case 'beginner':
      masteryMultiplier = 1.0;
      break;
    case 'intermediate':
      masteryMultiplier = 0.9;
      break;
    case 'advanced':
      masteryMultiplier = 0.8;
      break;
    case 'master':
      masteryMultiplier = 0.7;
      break;
  }
  
  // Calculate final XP
  const xp = Math.round(
    baseXP * difficultyMultiplier * durationMultiplier * performanceMultiplier * masteryMultiplier
  );
  
  return xp;
}

// Redeem rewards
export function redeemReward(
  loyalty: ThemeLoyalty,
  reward: Reward
): { success: boolean; newLoyalty: ThemeLoyalty; message: string } {
  if (loyalty.loyaltyPoints < reward.cost) {
    return {
      success: false,
      newLoyalty: loyalty,
      message: "Insufficient loyalty points"
    };
  }

  const newLoyalty = {
    ...loyalty,
    loyaltyPoints: loyalty.loyaltyPoints - reward.cost
  };

  return {
    success: true,
    newLoyalty,
    message: `Successfully redeemed ${reward.name}`
  };
} 