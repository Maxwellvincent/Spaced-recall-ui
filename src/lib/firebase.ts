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

// If we're in a build, log this for debugging
if (shouldDisableFirebase) {
  console.log('Firebase: Running in build environment - Firebase will be disabled during build only');
}

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
    console.error(`Firebase: Missing or invalid environment variables: ${missingVars.join(', ')}`);
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
  console.log("Firebase: Using fallback configuration from firebase-config-values.js");
  return fallbackConfig;
};

// Get the Firebase configuration
const firebaseConfig = getFirebaseConfig();

// Log Firebase configuration for debugging (without exposing full API key)
console.log("Firebase Config:", {
  apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 5)}...` : "Not set",
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  source: validateFirebaseConfig() ? "environment variables" : "fallback config"
});

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
    console.log("Firebase: Skipping initialization - Server:", isServer, "App exists:", app !== null, "Should disable:", shouldDisableFirebase);
    return;
  }

  try {
    console.log("Firebase: Initializing Firebase synchronously");

    // Check if we have a valid configuration
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      console.error("Firebase: Invalid configuration. Using mock objects.");
      return;
    }

    // Initialize Firebase if it hasn't been initialized yet
    if (!getApps().length) {
      console.log("Firebase: No apps initialized, creating new app with config:", {
        apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 5)}...` : "Not set",
        authDomain: firebaseConfig.authDomain,
        projectId: firebaseConfig.projectId
      });
      app = initializeApp(firebaseConfig);
    } else {
      console.log("Firebase: App already initialized, getting existing app");
      app = getApps()[0];
    }
    
    _auth = getAuth(app);
    _db = getFirestore(app);
    
    // Connect to emulators if needed
    if (useEmulators && typeof window !== 'undefined') {
      console.log("Firebase: Connecting to emulators");
      connectAuthEmulator(_auth, 'http://localhost:9099');
      connectFirestoreEmulator(_db, 'localhost', 8080);
    }
    
    console.log("Firebase: Initialized synchronously in browser", { 
      app: app ? "Initialized" : "Failed", 
      auth: _auth ? "Initialized" : "Failed",
      db: _db ? "Initialized" : "Failed"
    });
  } catch (err) {
    console.error("Firebase: Error initializing Firebase synchronously:", err);
  }
};

// Try to initialize Firebase synchronously for immediate use
if (typeof window !== 'undefined' && !shouldDisableFirebase) {
  console.log("Firebase: Attempting immediate initialization");
  initFirebaseSync();
}

// Safely get Firebase Auth instance
export function getFirebaseAuth(): Auth {
  if (isServer) {
    console.log("Firebase: Returning mock Auth for server environment");
    return mockAuth as unknown as Auth;
  }
  
  // Initialize Firebase if it hasn't been initialized yet
  if (!_auth) {
    console.log("Firebase: Auth not initialized, attempting initialization");
    // We need to initialize Firebase synchronously here
    if (typeof window !== 'undefined' && app === null && !shouldDisableFirebase) {
      initFirebaseSync();
    }
    
    // If still not initialized, return mock
    if (!_auth) {
      console.warn("Firebase: Auth was accessed before initialization! Returning mock.");
      return mockAuth as unknown as Auth;
    }
  }
  
  return _auth;
}

// Safely get Firebase Firestore instance
export function getFirebaseDb(): Firestore {
  if (isServer) {
    console.log("Firebase: Returning mock Firestore for server environment");
    return mockFirestore as unknown as Firestore;
  }
  
  // Initialize Firebase if it hasn't been initialized yet
  if (!_db) {
    console.log("Firebase: Firestore not initialized, attempting initialization");
    // We need to initialize Firebase synchronously here
    if (typeof window !== 'undefined' && app === null && !shouldDisableFirebase) {
      initFirebaseSync();
    }
    
    // If still not initialized, return mock
    if (!_db) {
      console.warn("Firebase: Firestore was accessed before initialization! Returning mock.");
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
  console.log("Firebase: Ensuring initialization completed");
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
