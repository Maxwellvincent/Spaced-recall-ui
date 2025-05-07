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
      console.log("StreakContext: No user, skipping fetch");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log(`StreakContext: Fetching streak data for user ${user.uid}`);
      
      const db = getFirebaseDb();
      if (!db) {
        throw new Error("Failed to get Firestore instance");
      }
      
      const userRef = doc(db, 'users', user.uid);
      let userDoc;
      
      try {
        userDoc = await getDoc(userRef);
      } catch (docError) {
        console.error("StreakContext: Error fetching user document:", docError);
        throw new Error(`Failed to fetch user document: ${docError instanceof Error ? docError.message : 'Unknown error'}`);
      }
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log("StreakContext: Fetched user data:", {
          currentStreak: userData.currentStreak,
          highestStreak: userData.highestStreak,
          lastLogin: userData.lastLogin
        });
        
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
            console.log(`StreakContext: Streak needs update from ${currentStreak} to ${calculatedStreak}`);
            
            // Update the streak in Firestore
            const newHighestStreak = Math.max(highestStreak, calculatedStreak);
            
            try {
              const success = await directUpdateStreak(
                user.uid,
                calculatedStreak,
                newHighestStreak
              );
              
              if (success) {
                console.log(`StreakContext: Updated streak to ${calculatedStreak} (highest: ${newHighestStreak})`);
                setStreak(calculatedStreak);
                setHighestStreak(newHighestStreak);
                setLastRefresh(new Date());
                setError(null);
                setLoading(false);
                return;
              }
            } catch (updateError) {
              console.error("StreakContext: Error auto-updating streak:", updateError);
              // Continue to use the values from the database
            }
          }
        }
        
        setStreak(currentStreak);
        setHighestStreak(highestStreak);
        setError(null); // Clear any previous errors
      } else {
        console.warn(`StreakContext: User document not found for ID ${user.uid}`);
        // Set default values for new users
        setStreak(1); // Start with 1 for new users
        setHighestStreak(1);
        
        // Create initial streak for new user
        try {
          await directUpdateStreak(user.uid, 1, 1);
          console.log("StreakContext: Initialized streak for new user");
        } catch (initError) {
          console.error("StreakContext: Failed to initialize streak for new user:", initError);
        }
      }
    } catch (err) {
      console.error("StreakContext: Error fetching login streak:", err);
      setError(err instanceof Error ? err : new Error('Failed to fetch login streak'));
      // Don't reset streak values on error to maintain UI consistency
    } finally {
      setLoading(false);
    }
  };

  const refreshStreak = async () => {
    if (!user) {
      console.log("StreakContext: No user, skipping refresh");
      return;
    }
    
    try {
      console.log(`StreakContext: Refreshing streak for user ${user.uid}`);
      setLastRefresh(new Date());
      
      // Try direct update first (most reliable)
      try {
        console.log("StreakContext: Trying direct update");
        
        const success = await directUpdateStreak(
          user.uid,
          Math.max(1, streak),
          Math.max(1, highestStreak, streak)
        );
        
        if (success) {
          console.log("StreakContext: Direct update successful");
          // Refetch streak data
          await fetchStreak();
          return;
        } else {
          console.log("StreakContext: Direct update failed, trying server API");
        }
      } catch (directError) {
        console.error("StreakContext: Direct update error:", directError);
        // Continue to server API
      }
      
      // Try server-side API next
      try {
        console.log("StreakContext: Trying server-side API update");
        
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
          console.error("StreakContext: Failed to parse API response:", parseError);
          const text = await response.text();
          console.error("StreakContext: Raw response:", text);
          throw new Error(`Failed to parse API response: ${text.substring(0, 100)}...`);
        }
        
        if (response.ok) {
          console.log("StreakContext: Streak updated successfully via server API:", responseData);
          // Refetch streak data
          await fetchStreak();
          return;
        } else {
          console.error("StreakContext: Server API error updating streak:", responseData);
          throw new Error(`Failed to refresh streak via server API: ${responseData.error || 'Unknown API error'}`);
        }
      } catch (serverApiError) {
        console.error("StreakContext: Server API error:", serverApiError);
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
            console.error("StreakContext: Failed to parse client API response:", parseError);
            const text = await response.text();
            console.error("StreakContext: Raw client response:", text);
            throw new Error(`Failed to parse client API response: ${text.substring(0, 100)}...`);
          }
          
          if (response.ok) {
            console.log("StreakContext: Streak updated successfully via client API:", responseData);
            // Refetch streak data
            await fetchStreak();
            return;
          } else {
            console.error("StreakContext: Client API error updating streak:", responseData);
            throw new Error(`Failed to refresh streak via client API: ${responseData.error || 'Unknown API error'}`);
          }
        } catch (clientApiError) {
          console.error("StreakContext: All update methods failed:", clientApiError);
          throw clientApiError; // Re-throw to be caught by the outer catch
        }
      }
    } catch (err) {
      console.error("StreakContext: Error refreshing streak:", err);
      setError(err instanceof Error ? err : new Error('Failed to refresh streak'));
    }
  };
  
  // Force update streak to specific values (for admin/debug purposes)
  const forceUpdate = async (newStreak: number, newHighestStreak?: number): Promise<boolean> => {
    if (!user) {
      console.log("StreakContext: No user, skipping force update");
      return false;
    }
    
    try {
      console.log(`StreakContext: Force updating streak to ${newStreak} for user ${user.uid}`);
      
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
        console.log(`StreakContext: Force update successful: ${newStreak} (highest: ${finalHighestStreak})`);
        
        // Update local state
        setStreak(newStreak);
        setHighestStreak(finalHighestStreak);
        setLastRefresh(new Date());
        
        return true;
      } else {
        console.error("StreakContext: Force update failed");
        return false;
      }
    } catch (err) {
      console.error("StreakContext: Error in force update:", err);
      return false;
    }
  };

  // Fetch streak data when user changes
  useEffect(() => {
    console.log("StreakContext: User changed, fetching streak data");
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