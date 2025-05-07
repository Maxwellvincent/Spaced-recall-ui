"use client";

import { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { getFirebaseAuth, getFirebaseDb } from './firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { User } from 'firebase/auth';

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
      console.log("Auth: Running on server, skipping auth initialization");
      setLoadingState(false);
      return;
    }
    
    console.log("Auth: Initializing auth in browser");
    let unsubscribe = () => {};
    
    try {
      // Only initialize auth once
      if (!authInstance) {
        console.log("Auth: Getting Firebase auth instance");
        authInstance = getFirebaseAuth();
      }
      
      // Set up auth state listener
      console.log("Auth: Setting up auth state listener");
      unsubscribe = authInstance.onAuthStateChanged(
        (user: User | null) => {
          console.log("Auth: Auth state changed:", user ? `User authenticated: ${user.uid}` : "No user");
          setUserState(user);
          setLoadingState(false);
          
          // If user is authenticated, check/create their database record
          if (user) {
            console.log("Auth: User authenticated, ensuring user exists in database");
            ensureUserExists(user);
          } else {
            console.log("Auth: No user authenticated");
            setUserInitialized(false);
          }
        },
        (error: any) => {
          console.error("Auth: Auth state change error:", error);
          setLoadingState(false);
          setUserInitialized(false);
        }
      );
    } catch (error) {
      console.error("Auth: Error initializing Firebase Auth:", error);
      setLoadingState(false);
      setUserInitialized(false);
    }
    
    // Clean up subscription
    return () => {
      console.log("Auth: Cleaning up auth state listener");
      unsubscribe();
    };
  }, []);

  // Ensure the user exists in Firestore
  const ensureUserExists = async (user: User) => {
    try {
      console.log("Auth: Ensuring user exists in Firestore");
      const db = getFirebaseDb();
      const userRef = doc(db, 'users', user.uid);
      
      console.log("Auth: Fetching user document");
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        console.log("Auth: Creating new user record in Firestore");
        // Create a new user record
        await setDoc(userRef, {
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0] || 'User',
          photoURL: user.photoURL || null,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          subjects: {},
          theme: 'Classic',
          tokens: 100, // Starting tokens
          xp: 0,
        });
        console.log("Auth: User record created successfully");
      } else {
        console.log("Auth: User record exists, updating last login");
        // Update last login time
        await updateDoc(userRef, {
          lastLogin: new Date().toISOString(),
        });
      }
      
      // Mark user as initialized
      console.log("Auth: User initialization complete");
      setUserInitialized(true);
    } catch (error) {
      console.error("Auth: Error ensuring user exists:", error);
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
        console.error('Error processing calendar event:', error);
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
        console.error('Error syncing calendar:', error);
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