// src/lib/firebase.ts
"use client";

import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, Auth, connectAuthEmulator } from "firebase/auth";
import { firebaseConfig as fallbackConfig } from "./firebase-config-values";

// Define local variables that will be initialized lazily
let app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;

// Determine if we're in the browser or server
const isServer = typeof window === 'undefined';
const isBuildTime = process.env.NODE_ENV === 'production' && isServer;

// We only want to disable Firebase during build time, not during runtime in production
const shouldDisableFirebase = isBuildTime;

// Check if we should use Firebase emulators (for local development)
const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';

// Validate Firebase configuration
const validateFirebaseConfig = () => {
  const requiredVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID'
  ];
  
  // Check if all required variables are present and not empty
  const missingVars = requiredVars.filter(varName => {
    const value = process.env[varName];
    return !value || value.includes('replace_with_your_');
  });
  
  if (missingVars.length > 0) {
    return false;
  }
  
  return true;
};

// Get Firebase configuration - Try environment variables first, then fallback
const getFirebaseConfig = () => {
  // Check if environment variables are available
  if (validateFirebaseConfig()) {
    return {
      apiKey: String(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.appspot.com`,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
    };
  }
  
  // Use fallback configuration if environment variables are not available
  return fallbackConfig;
};

// Get the Firebase configuration
const firebaseConfig = getFirebaseConfig();

// Mock objects for SSR to prevent errors
// These provide the minimal structure to prevent errors but don't actually do anything
const mockFirestore = {
  collection: () => ({
    doc: () => ({
      get: () => Promise.resolve({ exists: false, data: () => ({}) }),
      set: () => Promise.resolve(),
      update: () => Promise.resolve(),
      delete: () => Promise.resolve(),
    }),
    where: () => ({
      get: () => Promise.resolve({ docs: [] }),
    }),
    add: () => Promise.resolve({ id: 'mock-id' }),
  }),
  doc: () => ({
    get: () => Promise.resolve({ exists: false, data: () => ({}) }),
    set: () => Promise.resolve(),
    update: () => Promise.resolve(),
    delete: () => Promise.resolve(),
  }),
};

const mockAuth = {
  currentUser: null,
  onAuthStateChanged: (fn: (user: any) => void) => {
    fn(null);
    return () => {};
  },
  signInWithEmailAndPassword: () => Promise.resolve({ user: null }),
  createUserWithEmailAndPassword: () => Promise.resolve({ user: null }),
  signOut: () => Promise.resolve(),
};

// Synchronously initialize Firebase in browser environment
const initFirebaseSync = () => {
  if (isServer || app !== null || shouldDisableFirebase) {
    return;
  }

  try {
    // Check if we have a valid configuration
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      return;
    }

    // Initialize Firebase if it hasn't been initialized yet
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }
    
    _auth = getAuth(app);
    _db = getFirestore(app);
    
    // Connect to emulators if needed
    if (useEmulators && typeof window !== 'undefined') {
      connectAuthEmulator(_auth, 'http://localhost:9099');
      connectFirestoreEmulator(_db, 'localhost', 8080);
    }
  } catch (err) {
  }
};

// Try to initialize Firebase synchronously for immediate use
if (typeof window !== 'undefined' && !shouldDisableFirebase) {
  initFirebaseSync();
}

// Safely get Firebase Auth instance
export function getFirebaseAuth(): Auth {
  if (isServer) {
    return mockAuth as unknown as Auth;
  }
  
  // Initialize Firebase if it hasn't been initialized yet
  if (!_auth) {
    // We need to initialize Firebase synchronously here
    if (typeof window !== 'undefined' && app === null && !shouldDisableFirebase) {
      initFirebaseSync();
    }
    
    // If still not initialized, return mock
    if (!_auth) {
      return mockAuth as unknown as Auth;
    }
  }
  
  return _auth;
}

// Safely get Firebase Firestore instance
export function getFirebaseDb(): Firestore {
  if (isServer) {
    return mockFirestore as unknown as Firestore;
  }
  
  // Initialize Firebase if it hasn't been initialized yet
  if (!_db) {
    // We need to initialize Firebase synchronously here
    if (typeof window !== 'undefined' && app === null && !shouldDisableFirebase) {
      initFirebaseSync();
    }
    
    // If still not initialized, return mock
    if (!_db) {
      return mockFirestore as unknown as Firestore;
    }
  }
  
  return _db;
}

// Instead of exporting the raw db and auth objects, export functions that safely get them
export const db = getFirebaseDb();
export const auth = getFirebaseAuth();

// Also initialize Firebase asynchronously for future operations
if (typeof window !== 'undefined' && !shouldDisableFirebase) {
  initFirebaseSync();
}

// Export a function to check if Firebase is properly initialized
export function isFirebaseInitialized(): boolean {
  return app !== null && _auth !== null && _db !== null;
}

// Export a function to manually initialize Firebase
export function initializeFirebase(): boolean {
  if (app !== null && _auth !== null && _db !== null) {
    return true; // Already initialized
  }
  
  if (isServer || shouldDisableFirebase) {
    return false; // Can't initialize in server or during build
  }
  
  initFirebaseSync();
  return isFirebaseInitialized();
}
