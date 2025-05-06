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

// Only initialize Firebase in browser environment and not during build
if (!isServer) {
  const initFirebase = async () => {
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

  // Initialize Firebase immediately in the browser
  initFirebase().catch(console.error);
}

// Safe getters that work in both environments
export function getFirebaseAuth(): Auth {
  if (isServer) {
    console.log("Returning mock auth for server environment");
    return mockAuth as unknown as Auth;
  }
  
  if (!_auth) {
    console.warn("Auth was accessed before initialization!");
    return mockAuth as unknown as Auth;
  }
  
  return _auth;
}

export function getFirebaseDb(): Firestore {
  if (isServer) {
    console.log("Returning mock firestore for server environment");
    return mockFirestore as unknown as Firestore;
  }
  
  if (!_db) {
    console.warn("Firestore was accessed before initialization!");
    return mockFirestore as unknown as Firestore;
  }
  
  return _db;
}

// For backward compatibility, export the same objects but ensure they're safe in SSR
export const auth = isServer 
  ? (mockAuth as unknown as Auth) 
  : (_auth || mockAuth as unknown as Auth);

export const db = isServer 
  ? (mockFirestore as unknown as Firestore) 
  : (_db || mockFirestore as unknown as Firestore);
