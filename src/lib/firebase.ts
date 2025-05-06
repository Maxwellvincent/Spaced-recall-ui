// src/lib/firebase.ts
"use client";

import { type FirebaseApp } from "firebase/app";
import { type Firestore } from "firebase/firestore";
import { type Auth } from "firebase/auth";

// Define local variables that will be initialized lazily
let app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;

// Determine if we're in the browser or server
const isServer = typeof window === 'undefined';
const isBuildTime = process.env.NODE_ENV === 'production' && isServer;
const isVercelBuild = process.env.NEXT_PUBLIC_BUILD_ENV === 'vercel';

// If we're in a Vercel build, log this for debugging
if (isVercelBuild) {
  console.log('Running in Vercel build environment - Firebase will be disabled');
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
  onAuthStateChanged: (fn: (user: null) => void) => {
    fn(null);
    return () => {};
  },
  signInWithEmailAndPassword: () => Promise.resolve({ user: null }),
  createUserWithEmailAndPassword: () => Promise.resolve({ user: null }),
  signOut: () => Promise.resolve(),
};

// Only initialize Firebase in browser environment and not during Vercel build
const initFirebase = async () => {
  // Skip initialization if we're not in a browser, if Firebase is already initialized,
  // or if we're in a Vercel build
  if (isServer || app !== null || isVercelBuild) {
    if (isVercelBuild) {
      console.log('Skipping Firebase initialization in Vercel build');
    }
    return;
  }
  
  try {
    const { initializeApp, getApps } = await import("firebase/app");
    const { getFirestore } = await import("firebase/firestore");
    const { getAuth } = await import("firebase/auth");

    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

    // Initialize Firebase if it hasn't been initialized yet
    app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
    _auth = getAuth(app);
    _db = getFirestore(app);
    console.log("Firebase initialized in browser");
  } catch (err) {
    console.error("Error initializing Firebase:", err);
  }
};

// Safely get Firebase Auth instance
export function getFirebaseAuth(): Auth {
  if (isServer || isVercelBuild) {
    console.log("Returning mock auth for server environment or Vercel build");
    return mockAuth as unknown as Auth;
  }
  
  // Initialize Firebase if it hasn't been initialized yet
  if (!_auth) {
    // We need to initialize Firebase synchronously here
    // This is a fallback for when getFirebaseAuth is called before initialization completes
    if (typeof window !== 'undefined' && app === null && !isVercelBuild) {
      initFirebase().catch(console.error);
    }
    console.warn("Auth was accessed before initialization!");
    return mockAuth as unknown as Auth;
  }
  
  return _auth;
}

// Safely get Firebase Firestore instance
export function getFirebaseDb(): Firestore {
  if (isServer || isVercelBuild) {
    console.log("Returning mock firestore for server environment or Vercel build");
    return mockFirestore as unknown as Firestore;
  }
  
  // Initialize Firebase if it hasn't been initialized yet
  if (!_db) {
    // We need to initialize Firebase synchronously here
    if (typeof window !== 'undefined' && app === null && !isVercelBuild) {
      initFirebase().catch(console.error);
    }
    console.warn("Firestore was accessed before initialization!");
    return mockFirestore as unknown as Firestore;
  }
  
  return _db;
}

// For backward compatibility, export objects that are safe in SSR
export const auth = isServer || isVercelBuild
  ? (mockAuth as unknown as Auth) 
  : (_auth || mockAuth as unknown as Auth);

export const db = isServer || isVercelBuild
  ? (mockFirestore as unknown as Firestore) 
  : (_db || mockFirestore as unknown as Firestore);

// Initialize Firebase immediately in the browser (but not during Vercel build)
if (typeof window !== 'undefined' && !isVercelBuild) {
  initFirebase().catch(console.error);
}
