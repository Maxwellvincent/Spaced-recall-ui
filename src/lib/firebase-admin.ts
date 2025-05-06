import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin
export function initializeFirebaseAdmin() {
  if (getApps().length === 0) {
    try {
      // Check if we have all the required environment variables
      if (!process.env.FIREBASE_PROJECT_ID || 
          !process.env.FIREBASE_CLIENT_EMAIL || 
          !process.env.FIREBASE_PRIVATE_KEY) {
        console.warn("Firebase Admin SDK environment variables are missing");
        return null;
      }

      // Initialize the app with credentials
      const app = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // The private key comes as a string with "\n" characters
          // We need to replace them with actual newlines
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });

      console.log("Firebase Admin initialized successfully");
      return app;
    } catch (error) {
      console.error("Error initializing Firebase Admin:", error);
      return null;
    }
  }

  return getApps()[0];
}

// Get Firestore instance
export function getAdminFirestore() {
  const app = initializeFirebaseAdmin();
  if (!app) return null;
  
  return getFirestore(app);
}

// Get Auth instance
export function getAdminAuth() {
  const app = initializeFirebaseAdmin();
  if (!app) return null;
  
  return getAuth(app);
}

// Initialize Firebase Admin on module load for server components
const app = initializeFirebaseAdmin();
export const adminDb = app ? getFirestore(app) : null;
export const adminAuth = app ? getAuth(app) : null; 