"use client";

import { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { getFirebaseAuth, getFirebaseDb } from './firebase';
import { doc, getDoc, setDoc, updateDoc, increment, collection } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { User } from 'firebase/auth';
import { calculateStreak, checkStreakMilestone, calculateStreakRewards } from '@/utils/streakUtils';

interface CalendarEvent {
  title: string;
  description?: string;
  startDate: string;
  durationMinutes?: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  userInitialized: boolean;
  initiateCalendarAdd: (eventDetails: CalendarEvent) => Promise<void>;
  initiateCalendarSync: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create a stable auth instance outside of component render cycles
let authInstance: any = null;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userState, setUserState] = useState<User | null>(null);
  const [loadingState, setLoadingState] = useState(true);
  const [userInitialized, setUserInitialized] = useState(false);
  const router = useRouter();
  
  // Initialize Firebase Auth only once in the browser
  useEffect(() => {
    // Skip if not in browser
    if (typeof window === 'undefined') {
      setLoadingState(false);
      return;
    }
    
    let unsubscribe = () => {};
    
    try {
      // Only initialize auth once
      if (!authInstance) {
        authInstance = getFirebaseAuth();
      }
      
      // Set up auth state listener
      unsubscribe = authInstance.onAuthStateChanged(
        (user: User | null) => {
          setUserState(user);
          setLoadingState(false);
          
          // If user is authenticated, check/create their database record
          if (user) {
            ensureUserExists(user);
          } else {
            setUserInitialized(false);
          }
        },
        (error: any) => {
          setLoadingState(false);
          setUserInitialized(false);
        }
      );
    } catch (error) {
      setLoadingState(false);
      setUserInitialized(false);
    }
    
    // Clean up subscription
    return () => {
      unsubscribe();
    };
  }, []);

  // Ensure the user exists in Firestore
  const ensureUserExists = async (user: User) => {
    try {
      const db = getFirebaseDb();
      
      // Test Firestore connection with a simple operation
      try {
      } catch (firestoreError) {
      }
      
      const userRef = doc(db, 'users', user.uid);
      
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        // Create a new user record
        const userData = {
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0] || 'User',
          photoURL: user.photoURL || null,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          subjects: {},
          theme: 'Classic',
          tokens: 100, // Starting tokens
          xp: 0,
          totalXP: 0,
          currentStreak: 1, // Initialize streak
          highestStreak: 1, // Initialize highest streak
        };
        
        try {
          await setDoc(userRef, userData);
        } catch (setDocError) {
        }
      } else {
        const userData = userDoc.data();
        const now = new Date();
        
        // Get current streak or default to 0
        const currentStreak = userData.currentStreak ?? 0;
        const highestStreak = userData.highestStreak ?? 0;
        
        // Calculate new streak using utility function
        const newStreak = calculateStreak(userData.lastLogin, currentStreak);
        
        // Update highest streak if current streak is higher
        const newHighestStreak = Math.max(newStreak, highestStreak);
        
        // Check if a milestone was reached
        const milestone = checkStreakMilestone(currentStreak, newStreak);
        
        // Update user document with new streak and last login time
        try {
          await updateDoc(userRef, {
            lastLogin: now.toISOString(),
            currentStreak: newStreak,
            highestStreak: newHighestStreak
          });
        } catch (updateError) {
        }
        
        // If a milestone was reached, award XP and tokens
        if (milestone) {
          const rewards = calculateStreakRewards(milestone);
          
          // Update user with rewards
          try {
            await updateDoc(userRef, {
              totalXP: increment(rewards.xp),
              tokens: increment(rewards.tokens),
              streakMilestones: {
                [milestone]: now.toISOString()
              }
            });
            
            // Show toast notification about milestone
            toast.success(`🎉 ${milestone} day streak achieved! +${rewards.xp} XP, +${rewards.tokens} tokens`);
          } catch (rewardsError) {
          }
        }
      }
      
      // Mark user as initialized
      setUserInitialized(true);
    } catch (error) {
      // Still mark as initialized to prevent infinite loops
      setUserInitialized(true);
    }
  };

  const initiateCalendarAdd = async (eventDetails: CalendarEvent) => {
    // Set cookie with event details (expires in 5 minutes)
    document.cookie = `pending_calendar_add=${JSON.stringify(eventDetails)}; path=/; max-age=300`;
    // Redirect to Google Calendar auth
    window.location.href = '/api/auth/google/calendar?redirect=/dashboard';
  };

  const initiateCalendarSync = async () => {
    document.cookie = 'pending_calendar_sync=true; path=/; max-age=300';
    window.location.href = '/api/auth/google/calendar?redirect=/dashboard';
  };

  useEffect(() => {
    if (!userState || loadingState || typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const pendingAdd = params.get('pendingAdd');
    const pendingSync = params.get('pendingSync');
    const error = params.get('error');

    if (error) {
      toast.error(decodeURIComponent(error));
      // Clean up error from URL
      router.replace(window.location.pathname);
      return;
    }

    const processCalendarEvent = async (eventDetails: CalendarEvent) => {
      try {
        const response = await fetch('/api/calendar/add-event', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventDetails),
        });

        if (!response.ok) {
          throw new Error('Failed to add event to calendar');
        }

        const result = await response.json();
        toast.success('Event added to calendar successfully');
        
        // Update user's calendar sync status in Firestore
        const db = getFirebaseDb();
        const userRef = doc(db, 'users', userState.uid);
        await updateDoc(userRef, {
          calendarSynced: true,
          lastCalendarSync: new Date().toISOString(),
        });
      } catch (error) {
        toast.error('Failed to add event to calendar');
      }
    };

    const handleCalendarSync = async () => {
      try {
        // Update user's calendar sync status
        const db = getFirebaseDb();
        const userRef = doc(db, 'users', userState.uid);
        await updateDoc(userRef, {
          calendarSynced: true,
          lastCalendarSync: new Date().toISOString(),
        });
        toast.success('Calendar sync completed');
      } catch (error) {
        toast.error('Failed to sync calendar');
      }
    };

    if (pendingAdd) {
      const eventDetails = JSON.parse(decodeURIComponent(pendingAdd));
      processCalendarEvent(eventDetails);
      // Clean up pendingAdd from URL
      router.replace(window.location.pathname);
    }

    if (pendingSync) {
      handleCalendarSync();
      // Clean up pendingSync from URL
      router.replace(window.location.pathname);
    }
  }, [userState, loadingState, router]);

  // Create a stable context value to prevent unnecessary re-renders
  const value = {
    user: userState,
    loading: loadingState,
    userInitialized,
    initiateCalendarAdd,
    initiateCalendarSync,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}