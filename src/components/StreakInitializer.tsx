"use client";

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useLoginStreak } from '@/hooks/useLoginStreak';

/**
 * StreakInitializer component
 * 
 * This component ensures that login streak data is properly initialized
 * and synchronized across components. It runs on initial load and
 * automatically updates the streak when a user logs in.
 */
export function StreakInitializer() {
  const { user } = useAuth();
  const { refreshStreak, streak, loading } = useLoginStreak();
  
  // Initialize streak on login
  useEffect(() => {
    // Only run when user is available and not during loading
    if (user && !loading) {
      console.log("StreakInitializer: Initializing streak for user", user.uid);
      refreshStreak().catch(err => {
        console.error("StreakInitializer: Failed to initialize streak:", err);
      });
    }
  }, [user?.uid, loading]);
  
  // This component doesn't render anything
  return null;
} 