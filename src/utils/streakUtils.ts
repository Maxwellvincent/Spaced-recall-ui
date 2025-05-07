/**
 * Utility functions for calculating and managing streaks
 */

/**
 * Calculate streak based on last activity date
 * 
 * @param lastActivityDate ISO string of the last activity date
 * @param currentStreak Current streak count
 * @returns Updated streak count
 */
export function calculateStreak(lastActivityDate: string | null, currentStreak: number = 0): number {
  console.log("StreakUtils: Calculating streak with inputs:", { 
    lastActivityDate, 
    currentStreak,
    currentDate: new Date().toISOString()
  });
  
  if (!lastActivityDate) {
    console.log("StreakUtils: No last activity date, returning 1");
    return 1; // First login
  }
  
  const now = new Date();
  const lastActivity = new Date(lastActivityDate);
  
  // Reset hours to compare dates only
  now.setHours(0, 0, 0, 0);
  lastActivity.setHours(0, 0, 0, 0);
  
  // Calculate days between dates
  const diffTime = now.getTime() - lastActivity.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  console.log("StreakUtils: Days since last activity:", {
    now: now.toISOString(),
    lastActivity: lastActivity.toISOString(),
    diffDays
  });
  
  // If logged in today already, streak stays the same
  if (diffDays === 0) {
    console.log(`StreakUtils: Already logged in today, streak unchanged at ${currentStreak}`);
    return currentStreak;
  }
  // If logged in yesterday, increment streak
  else if (diffDays === 1) {
    const newStreak = currentStreak + 1;
    console.log(`StreakUtils: Consecutive login, incrementing streak to ${newStreak}`);
    return newStreak;
  }
  // If missed a day or more, reset streak to 1
  else {
    console.log(`StreakUtils: Login streak broken (${diffDays} days gap), resetting to 1`);
    return 1;
  }
}

/**
 * Check if a streak milestone has been reached
 * 
 * @param previousStreak Previous streak count
 * @param currentStreak Current streak count
 * @param milestones Array of milestone values to check
 * @returns The milestone reached, or null if none
 */
export function checkStreakMilestone(
  previousStreak: number, 
  currentStreak: number, 
  milestones: number[] = [3, 7, 14, 30, 60, 90, 180, 365]
): number | null {
  // Find the first milestone that was crossed
  for (const milestone of milestones) {
    if (previousStreak < milestone && currentStreak >= milestone) {
      return milestone;
    }
  }
  return null;
}

/**
 * Calculate rewards for a streak milestone
 * 
 * @param milestone The milestone reached
 * @returns Reward object with XP and tokens
 */
export function calculateStreakRewards(milestone: number): { xp: number, tokens: number } {
  // Define rewards based on milestone
  switch (milestone) {
    case 3:
      return { xp: 50, tokens: 5 };
    case 7:
      return { xp: 100, tokens: 10 };
    case 14:
      return { xp: 250, tokens: 25 };
    case 30:
      return { xp: 500, tokens: 50 };
    case 60:
      return { xp: 1000, tokens: 100 };
    case 90:
      return { xp: 2500, tokens: 250 };
    case 180:
      return { xp: 5000, tokens: 500 };
    case 365:
      return { xp: 10000, tokens: 1000 };
    default:
      return { xp: 0, tokens: 0 };
  }
} 