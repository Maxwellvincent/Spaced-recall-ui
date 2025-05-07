"use client";

import { useAuth } from '@/lib/auth';
import { getFirebaseDb } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface DirectStreakUpdaterProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function DirectStreakUpdater({ onSuccess, onError }: DirectStreakUpdaterProps) {
  const { user } = useAuth();
  
  const updateStreak = async (streak: number, highestStreak?: number) => {
    if (!user) {
      const error = new Error('No user is authenticated');
      console.error('DirectStreakUpdater:', error);
      onError?.(error);
      return false;
    }
    
    try {
      console.log(`DirectStreakUpdater: Updating streak for user ${user.uid}`);
      
      const db = getFirebaseDb();
      if (!db) {
        throw new Error('Failed to get Firestore instance');
      }
      
      const userRef = doc(db, 'users', user.uid);
      
      // Prepare update data
      const updateData: Record<string, any> = {
        lastLogin: new Date().toISOString(),
        currentStreak: streak
      };
      
      // If highestStreak is provided, use it, otherwise use streak
      if (highestStreak !== undefined) {
        updateData.highestStreak = highestStreak;
      } else {
        updateData.highestStreak = streak;
      }
      
      // Update document
      await updateDoc(userRef, updateData);
      
      console.log('DirectStreakUpdater: Update successful', updateData);
      onSuccess?.();
      return true;
    } catch (error) {
      console.error('DirectStreakUpdater: Error updating streak:', error);
      onError?.(error instanceof Error ? error : new Error('Failed to update streak'));
      return false;
    }
  };
  
  return null; // This component doesn't render anything
}

// Export a function that can be used without rendering the component
export async function directUpdateStreak(
  userId: string, 
  streak: number, 
  highestStreak?: number
): Promise<boolean> {
  try {
    console.log(`directUpdateStreak: Updating streak for user ${userId}`);
    
    const db = getFirebaseDb();
    if (!db) {
      throw new Error('Failed to get Firestore instance');
    }
    
    const userRef = doc(db, 'users', userId);
    
    // Prepare update data
    const updateData: Record<string, any> = {
      lastLogin: new Date().toISOString(),
      currentStreak: streak
    };
    
    // If highestStreak is provided, use it, otherwise use streak
    if (highestStreak !== undefined) {
      updateData.highestStreak = highestStreak;
    } else {
      updateData.highestStreak = streak;
    }
    
    // Update document
    await updateDoc(userRef, updateData);
    
    console.log('directUpdateStreak: Update successful', updateData);
    return true;
  } catch (error) {
    console.error('directUpdateStreak: Error updating streak:', error);
    return false;
  }
} 