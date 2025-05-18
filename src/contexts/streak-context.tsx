"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import { directUpdateStreak } from '@/components/DirectStreakUpdater';
import { calculateStreak } from '@/utils/streakUtils';

interface StreakContextType {
  streak: number;
  highestStreak: number;
  loading: boolean;
  error: Error | null;
  refreshStreak: () => Promise<void>;
  forceUpdate: (newStreak: number, newHighestStreak?: number) => Promise<boolean>;
}

const StreakContext = createContext<StreakContextType | undefined>(undefined);

export function StreakProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [streak, setStreak] = useState(0);
  const [highestStreak, setHighestStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchStreak = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const db = getFirebaseDb();
      if (!db) {
        throw new Error("Failed to get Firestore instance");
      }
      
      const userRef = doc(db, 'users', user.uid);
      let userDoc;
      
      try {
        userDoc = await getDoc(userRef);
      } catch (docError) {
        throw new Error(`Failed to fetch user document: ${docError instanceof Error ? docError.message : 'Unknown error'}`);
      }
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Ensure streak values are numbers
        const currentStreak = typeof userData.currentStreak === 'number' ? userData.currentStreak : 0;
        const highestStreak = typeof userData.highestStreak === 'number' ? userData.highestStreak : 0;
        
        // Calculate if streak should be updated based on last login
        const lastLogin = userData.lastLogin;
        const now = new Date();
        const lastLoginDate = lastLogin ? new Date(lastLogin) : null;
        
        // Only automatically update if we haven't refreshed in the last minute
        // This prevents multiple updates during page navigation
        if (!lastRefresh || (now.getTime() - lastRefresh.getTime() > 60000)) {
          const calculatedStreak = calculateStreak(lastLogin, currentStreak);
          
          if (calculatedStreak !== currentStreak) {
            // Update the streak in Firestore
            const newHighestStreak = Math.max(highestStreak, calculatedStreak);
            
            try {
              const success = await directUpdateStreak(
                user.uid,
                calculatedStreak,
                newHighestStreak
              );
              
              if (success) {
                setStreak(calculatedStreak);
                setHighestStreak(newHighestStreak);
                setLastRefresh(new Date());
                setError(null);
                setLoading(false);
                return;
              }
            } catch (updateError) {
              // Continue to use the values from the database
            }
          }
        }
        
        setStreak(currentStreak);
        setHighestStreak(highestStreak);
        setError(null); // Clear any previous errors
      } else {
        // Set default values for new users
        setStreak(1); // Start with 1 for new users
        setHighestStreak(1);
        
        // Create initial streak for new user
        try {
          await directUpdateStreak(user.uid, 1, 1);
        } catch (initError) {
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch login streak'));
      // Don't reset streak values on error to maintain UI consistency
    } finally {
      setLoading(false);
    }
  };

  const refreshStreak = async () => {
    if (!user) {
      return;
    }
    
    try {
      setLastRefresh(new Date());
      
      // Try direct update first (most reliable)
      try {
        const success = await directUpdateStreak(
          user.uid,
          Math.max(1, streak),
          Math.max(1, highestStreak, streak)
        );
        
        if (success) {
          // Refetch streak data
          await fetchStreak();
          return;
        }
      } catch (directError) {
        // Continue to server API
      }
      
      // Try server-side API next
      try {
        // Call API to update streak in database
        const response = await fetch('/api/update-streak', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: user.uid,
            streak: Math.max(1, streak),
            highestStreak: Math.max(1, highestStreak, streak)
          })
        });
        
        let responseData;
        try {
          responseData = await response.json();
        } catch (parseError) {
          const text = await response.text();
          throw new Error(`Failed to parse API response: ${text.substring(0, 100)}...`);
        }
        
        if (response.ok) {
          // Refetch streak data
          await fetchStreak();
          return;
        } else {
          throw new Error(`Failed to refresh streak via server API: ${responseData.error || 'Unknown API error'}`);
        }
      } catch (serverApiError) {
        console.log("StreakContext: Trying client-side API update as fallback");
        
        // Try client-side API as last resort
        try {
          const response = await fetch('/api/client-update-streak', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              userId: user.uid,
              streak: Math.max(1, streak),
              highestStreak: Math.max(1, highestStreak, streak)
            })
          });
          
          let responseData;
          try {
            responseData = await response.json();
          } catch (parseError) {
            const text = await response.text();
            throw new Error(`Failed to parse client API response: ${text.substring(0, 100)}...`);
          }
          
          if (response.ok) {
            // Refetch streak data
            await fetchStreak();
            return;
          } else {
            throw new Error(`Failed to refresh streak via client API: ${responseData.error || 'Unknown API error'}`);
          }
        } catch (clientApiError) {
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to refresh streak'));
    }
  };
  
  // Force update streak to specific values (for admin/debug purposes)
  const forceUpdate = async (newStreak: number, newHighestStreak?: number): Promise<boolean> => {
    if (!user) {
      return false;
    }
    
    try {
      // Ensure highest streak is at least as high as current streak
      const finalHighestStreak = newHighestStreak !== undefined 
        ? Math.max(newHighestStreak, newStreak) 
        : Math.max(highestStreak, newStreak);
      
      // Try direct update
      const success = await directUpdateStreak(
        user.uid,
        newStreak,
        finalHighestStreak
      );
      
      if (success) {
        // Update local state
        setStreak(newStreak);
        setHighestStreak(finalHighestStreak);
        setLastRefresh(new Date());
        
        return true;
      } else {
        return false;
      }
    } catch (err) {
      return false;
    }
  };

  // Fetch streak data when user changes
  useEffect(() => {
    if (user?.uid) {
      fetchStreak();
    } else {
      // Reset state when user is not available
      setStreak(0);
      setHighestStreak(0);
      setLoading(false);
    }
  }, [user?.uid]); // Use user.uid instead of user to prevent unnecessary refetches

  const value = {
    streak,
    highestStreak,
    loading,
    error,
    refreshStreak,
    forceUpdate
  };

  return (
    <StreakContext.Provider value={value}>
      {children}
    </StreakContext.Provider>
  );
}

export function useLoginStreak() {
  const context = useContext(StreakContext);
  if (context === undefined) {
    throw new Error('useLoginStreak must be used within a StreakProvider');
  }
  return context;
} 