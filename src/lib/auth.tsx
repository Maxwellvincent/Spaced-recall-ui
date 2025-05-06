"use client";

import { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { getFirebaseAuth, getFirebaseDb } from './firebase';
import { doc, updateDoc } from 'firebase/firestore';
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
  initiateCalendarAdd: (eventDetails: CalendarEvent) => Promise<void>;
  initiateCalendarSync: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authInitialized, setAuthInitialized] = useState(false);
  const [userState, setUserState] = useState<User | null>(null);
  const [loadingState, setLoadingState] = useState(true);
  const router = useRouter();
  
  // Initialize Firebase Auth only in the browser
  useEffect(() => {
    // Skip if not in browser
    if (typeof window === 'undefined') {
      setLoadingState(false);
      return;
    }
    
    try {
      const auth = getFirebaseAuth();
      
      const unsubscribe = auth.onAuthStateChanged(
        (user) => {
          setUserState(user);
          setLoadingState(false);
          setAuthInitialized(true);
        },
        (error) => {
          console.error("Auth state change error:", error);
          setLoadingState(false);
          setAuthInitialized(true);
        }
      );
      
      return () => unsubscribe();
    } catch (error) {
      console.error("Error initializing Firebase Auth:", error);
      setLoadingState(false);
    }
  }, []);

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

  const value = {
    user: userState,
    loading: loadingState,
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