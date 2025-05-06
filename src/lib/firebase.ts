// src/lib/firebase.ts
"use client";

import { type FirebaseApp } from "firebase/app";
import { type Firestore } from "firebase/firestore";
import { type Auth } from "firebase/auth";

// Define local variables that will be initialized lazily
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

// Only initialize Firebase in browser environment
if (typeof window !== 'undefined') {
  const initFirebase = async () => {
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
    auth = getAuth(app);
    db = getFirestore(app);
  };

  // Initialize Firebase immediately
  initFirebase().catch(console.error);
}

// Export function getters rather than direct instances
// This ensures the values are only accessed after initialization
export function getFirebaseAuth() {
  if (typeof window === 'undefined') {
    throw new Error("Firebase Auth can only be used in the browser");
  }
  return auth;
}

export function getFirebaseDb() {
  if (typeof window === 'undefined') {
    throw new Error("Firebase Firestore can only be used in the browser");
  }
  return db;
}

export { auth, db }; // For backward compatibility
