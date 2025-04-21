import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const themeConfig = JSON.parse(response.choices[0].message.content);
    return themeConfig;
  } catch (error) {
    console.error("Error generating custom theme:", error);
    return defaultThemes.neutral;
  }
}

// Activity types and their base XP multipliers
export const activityTypes = {
  study: {
    name: 'Study Session',
    baseMultiplier: 1,
    factors: ['duration', 'difficulty', 'focus']
  },
  reading: {
    name: 'Reading',
    baseMultiplier: 1.2,
    factors: ['bookLength', 'gradeLevel', 'comprehension']
  },
  quiz: {
    name: 'Quiz',
    baseMultiplier: 1.5,
    factors: ['difficulty', 'performance', 'timeTaken']
  },
  project: {
    name: 'Project',
    baseMultiplier: 2,
    factors: ['complexity', 'quality', 'originality']
  },
  practice: {
    name: 'Practice Problems',
    baseMultiplier: 1.3,
    factors: ['difficulty', 'accuracy', 'speed']
  },
  discussion: {
    name: 'Group Discussion',
    baseMultiplier: 1.4,
    factors: ['participation', 'quality', 'peerLearning']
  },
  teaching: {
    name: 'Teaching Others',
    baseMultiplier: 1.8,
    factors: ['clarity', 'engagement', 'effectiveness']
  },
  research: {
    name: 'Research',
    baseMultiplier: 1.6,
    factors: ['depth', 'sources', 'originality']
  }
};

// Enhanced XP calculation with more factors
export function calculateXP(activity: {
  type: keyof typeof activityTypes;
  duration: number;
  difficulty: number;
  // Common factors
  focus?: number;        // 0-100
  performance?: number;  // 0-100
  quality?: number;      // 0-100
  // Reading specific
  bookLength?: number;   // pages
  gradeLevel?: number;   // 1-12
  comprehension?: number; // 0-100
  // Quiz specific
  timeTaken?: number;    // minutes
  // Project specific
  complexity?: number;   // 1-10
  originality?: number;  // 0-100
  // Practice specific
  accuracy?: number;     // 0-100
  speed?: number;        // problems per hour
  // Discussion specific
  participation?: number; // 0-100
  peerLearning?: number;  // 0-100
  // Teaching specific
  clarity?: number;      // 0-100
  engagement?: number;   // 0-100
  effectiveness?: number; // 0-100
  // Research specific
  depth?: number;        // 1-10
  sources?: number;      // number of sources
}): number {
  const typeConfig = activityTypes[activity.type];
  let baseXP = 0;

  // Calculate base XP based on activity type
  switch (activity.type) {
    case 'study':
      baseXP = activity.duration * (activity.difficulty / 10) * (activity.focus || 50) / 50;
      break;
    case 'reading':
      if (activity.bookLength && activity.gradeLevel) {
        baseXP = (activity.bookLength / 100) * 
                 (activity.gradeLevel / 10) * 
                 (activity.difficulty / 10) * 
                 (activity.comprehension || 50) / 50;
      }
      break;
    case 'quiz':
      baseXP = 50 * 
               (activity.difficulty / 10) * 
               (activity.performance || 50) / 50 * 
               (activity.timeTaken ? 60 / activity.timeTaken : 1);
      break;
    case 'project':
      baseXP = 100 * 
               (activity.complexity || 5) * 
               (activity.quality || 50) / 50 * 
               (activity.originality || 50) / 50;
      break;
    case 'practice':
      baseXP = 30 * 
               (activity.difficulty / 10) * 
               (activity.accuracy || 50) / 50 * 
               (activity.speed || 10) / 10;
      break;
    case 'discussion':
      baseXP = 40 * 
               (activity.participation || 50) / 50 * 
               (activity.quality || 50) / 50 * 
               (activity.peerLearning || 50) / 50;
      break;
    case 'teaching':
      baseXP = 60 * 
               (activity.clarity || 50) / 50 * 
               (activity.engagement || 50) / 50 * 
               (activity.effectiveness || 50) / 50;
      break;
    case 'research':
      baseXP = 80 * 
               (activity.depth || 5) * 
               (activity.sources || 5) / 5 * 
               (activity.originality || 50) / 50;
      break;
  }

  // Apply activity type multiplier
  baseXP *= typeConfig.baseMultiplier;

  // Apply theme multiplier (if provided)
  if (activity.theme) {
    baseXP *= activity.theme.xpMultiplier;
  }

  // Round to nearest integer
  return Math.round(baseXP);
}

// Get level from XP with theme multiplier
export function getLevelFromXP(xp: number, theme: ThemeConfig): number {
  const adjustedXP = xp / theme.xpMultiplier;
  for (let i = baseXPThresholds.length - 1; i >= 0; i--) {
    if (adjustedXP >= baseXPThresholds[i]) return i + 1;
  }
  return 1;
}

// Get progress to next level
export function getProgressToNextLevel(xp: number, theme: ThemeConfig): {
  currentXP: number;
  neededXP: number;
  percent: number;
} {
  const adjustedXP = xp / theme.xpMultiplier;
  const level = getLevelFromXP(xp, theme);
  const currentLevelXP = baseXPThresholds[level - 1] || 0;
  const nextLevelXP = baseXPThresholds[level] || baseXPThresholds[baseXPThresholds.length - 1];
  const earned = adjustedXP - currentLevelXP;
  const required = nextLevelXP - currentLevelXP;
  const percent = Math.min(100, Math.round((earned / required) * 100));

  return {
    currentXP: Math.round(earned * theme.xpMultiplier),
    neededXP: Math.round(required * theme.xpMultiplier),
    percent
  };
}

// Get avatar for current level
export function getAvatarForLevel(theme: ThemeConfig, level: number): AvatarLevel {
  return theme.avatarLevels.reduce((acc, avatar) => 
    level >= avatar.level ? avatar : acc, theme.avatarLevels[0]
  );
}

// Get available themes
export function getAvailableThemes(): ThemeConfig[] {
  return Object.values(defaultThemes);
}

// Loyalty and rewards system
export interface ThemeLoyalty {
  themeName: string;
  startDate: Date;
  totalDays: number;
  streakDays: number;
  lastActiveDate: Date;
  loyaltyPoints: number;
  stars: number;
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  cost: number;
  type: 'theme' | 'points' | 'giftCard';
  value?: number; // For gift cards
}

// Base loyalty calculations
const LOYALTY_MULTIPLIERS = {
  daily: 1,
  weekly: 5,
  monthly: 20,
  yearly: 100
};

const STREAK_BONUSES = {
  7: 1.2,    // 20% bonus for 7-day streak
  30: 1.5,   // 50% bonus for 30-day streak
  90: 2,     // 100% bonus for 90-day streak
  365: 3     // 200% bonus for 1-year streak
};

// Calculate loyalty points based on activity
export function calculateLoyaltyPoints(activity: {
  type: keyof typeof activityTypes;
  xp: number;
  theme: ThemeConfig;
  loyalty: ThemeLoyalty;
}): number {
  const basePoints = activity.xp / 10; // 1 point per 10 XP
  let multiplier = 1;

  // Apply streak bonus
  for (const [days, bonus] of Object.entries(STREAK_BONUSES)) {
    if (activity.loyalty.streakDays >= Number(days)) {
      multiplier = bonus;
    }
  }

  // Apply theme loyalty bonus
  const themeLoyaltyBonus = 1 + (activity.loyalty.totalDays / 365) * 0.5; // Up to 50% bonus for year-long loyalty

  return Math.round(basePoints * multiplier * themeLoyaltyBonus);
}

// Calculate stars based on loyalty
export function calculateStars(loyalty: ThemeLoyalty): number {
  const baseStars = Math.floor(loyalty.totalDays / 30); // 1 star per month
  const streakBonus = Math.floor(loyalty.streakDays / 90); // Extra star per 90-day streak
  return baseStars + streakBonus;
}

// Available rewards
export const AVAILABLE_REWARDS: Reward[] = [
  {
    id: 'theme-switch',
    name: 'Theme Switch',
    description: 'Switch to a new theme while keeping your progress',
    cost: 1000,
    type: 'theme'
  },
  {
    id: 'xp-boost',
    name: 'XP Boost',
    description: 'Get 50% more XP for 24 hours',
    cost: 500,
    type: 'points'
  },
  {
    id: 'gift-card-5',
    name: '$5 Gift Card',
    description: 'Redeem for a $5 gift card',
    cost: 5000,
    type: 'giftCard',
    value: 5
  },
  {
    id: 'gift-card-10',
    name: '$10 Gift Card',
    description: 'Redeem for a $10 gift card',
    cost: 9000,
    type: 'giftCard',
    value: 10
  }
];

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

  // Reset streak if more than 1 day has passed
  const streakDays = daysSinceLastActive <= 1 
    ? currentLoyalty.streakDays + 1 
    : 1;

  // Calculate total days
  const startDate = new Date(currentLoyalty.startDate);
  const totalDays = Math.floor(
    (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    ...currentLoyalty,
    themeName: newTheme || currentLoyalty.themeName,
    startDate: newTheme ? today : currentLoyalty.startDate,
    totalDays: newTheme ? 1 : totalDays,
    streakDays,
    lastActiveDate: today,
    stars: calculateStars({ ...currentLoyalty, totalDays, streakDays })
  };
}

// Redeem reward
export function redeemReward(
  loyalty: ThemeLoyalty,
  reward: Reward
): { success: boolean; newLoyalty: ThemeLoyalty; message: string } {
  if (loyalty.loyaltyPoints < reward.cost) {
    return {
      success: false,
      newLoyalty: loyalty,
      message: 'Not enough loyalty points'
    };
  }

  const newLoyalty = {
    ...loyalty,
    loyaltyPoints: loyalty.loyaltyPoints - reward.cost
  };

  let message = 'Reward redeemed successfully!';
  if (reward.type === 'theme') {
    message = 'Theme switch available!';
  } else if (reward.type === 'giftCard') {
    message = `$${reward.value} gift card code sent to your email!`;
  }

  return {
    success: true,
    newLoyalty,
    message
  };
} 