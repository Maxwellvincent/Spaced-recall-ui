import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';

export interface TokenBalance {
  balance: number;
  lastThemeChange: string; // ISO date string
  currentTheme: string;
  themeUsageTime: Record<string, number>; // theme -> minutes used
}

// Theme costs in tokens
export const THEME_COSTS = {
  dbz: 1000,
  hogwarts: 1000,
  naruto: 1000,
  classic: 0 // Classic theme is free
};

// Token earning rates
export const TOKEN_RATES = {
  DAILY_STUDY: 10, // Tokens per day of study
  STREAK_BONUS: 5, // Additional tokens per day for maintaining streak
  THEME_USAGE: 2, // Tokens per hour using the same theme
  MASTERY_MILESTONE: 50, // Tokens for reaching new mastery levels
  PERFECT_SESSION: 20, // Tokens for perfect study sessions
};

// Minimum time between theme changes (in days)
export const THEME_CHANGE_COOLDOWN = 14;

export async function getUserTokenBalance(userId: string): Promise<TokenBalance> {
  const userDoc = await getDoc(doc(db, 'users', userId));
  const data = userDoc.data();
  
  return {
    balance: data?.tokens || 0,
    lastThemeChange: data?.lastThemeChange || new Date(0).toISOString(),
    currentTheme: data?.currentTheme || 'classic',
    themeUsageTime: data?.themeUsageTime || {}
  };
}

export async function canChangeTheme(userId: string, newTheme: string): Promise<{
  canChange: boolean;
  reason?: string;
  requiredTokens: number;
  currentBalance: number;
  cooldownDays: number;
}> {
  const tokenBalance = await getUserTokenBalance(userId);
  const now = new Date();
  const lastChange = new Date(tokenBalance.lastThemeChange);
  const daysSinceChange = Math.floor((now.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24));
  
  const requiredTokens = THEME_COSTS[newTheme] || 0;
  const cooldownDays = Math.max(0, THEME_CHANGE_COOLDOWN - daysSinceChange);

  if (newTheme === tokenBalance.currentTheme) {
    return {
      canChange: false,
      reason: 'Already using this theme',
      requiredTokens,
      currentBalance: tokenBalance.balance,
      cooldownDays
    };
  }

  if (cooldownDays > 0) {
    return {
      canChange: false,
      reason: `Must wait ${cooldownDays} more days before changing themes`,
      requiredTokens,
      currentBalance: tokenBalance.balance,
      cooldownDays
    };
  }

  if (tokenBalance.balance < requiredTokens) {
    return {
      canChange: false,
      reason: `Need ${requiredTokens - tokenBalance.balance} more tokens`,
      requiredTokens,
      currentBalance: tokenBalance.balance,
      cooldownDays
    };
  }

  return {
    canChange: true,
    requiredTokens,
    currentBalance: tokenBalance.balance,
    cooldownDays: 0
  };
}

export async function changeTheme(userId: string, newTheme: string): Promise<boolean> {
  const check = await canChangeTheme(userId, newTheme);
  if (!check.canChange) return false;

  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    tokens: increment(-check.requiredTokens),
    currentTheme: newTheme,
    lastThemeChange: new Date().toISOString()
  });

  return true;
}

export async function awardTokens(userId: string, amount: number, reason: string): Promise<void> {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    tokens: increment(amount),
    tokenHistory: {
      amount,
      reason,
      timestamp: new Date().toISOString()
    }
  });
}

export async function updateThemeUsageTime(userId: string, theme: string, minutes: number): Promise<void> {
  const userRef = doc(db, 'users', userId);
  const tokenBalance = await getUserTokenBalance(userId);
  
  // Award tokens for theme usage
  const hoursUsed = Math.floor(minutes / 60);
  const tokensEarned = hoursUsed * TOKEN_RATES.THEME_USAGE;
  
  if (tokensEarned > 0) {
    await awardTokens(userId, tokensEarned, `Used ${theme} theme for ${hoursUsed} hours`);
  }

  // Update theme usage time
  await updateDoc(userRef, {
    [`themeUsageTime.${theme}`]: increment(minutes)
  });
} 