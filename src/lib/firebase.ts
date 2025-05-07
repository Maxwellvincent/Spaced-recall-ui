// src/lib/firebase.ts
"use client";

import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";

// Define local variables that will be initialized lazily
let app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;

// Determine if we're in the browser or server
const isServer = typeof window === 'undefined';
const isBuildTime = process.env.NODE_ENV === 'production' && isServer;

// We only want to disable Firebase during build time, not during runtime in production
const shouldDisableFirebase = isBuildTime;

// If we're in a build, log this for debugging
if (shouldDisableFirebase) {
  console.log('Firebase: Running in build environment - Firebase will be disabled during build only');
}

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
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

    console.log("Firebase: Config loaded, checking if API key is available:", !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY);

    // Initialize Firebase if it hasn't been initialized yet
    app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
    _auth = getAuth(app);
    _db = getFirestore(app);
    console.log("Firebase: Initialized synchronously in browser");
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
  
  console.log("Firebase: Returning real Auth instance");
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
  
  console.log("Firebase: Returning real Firestore instance");
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
