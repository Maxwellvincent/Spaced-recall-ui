import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Check if we're on the server side
const isServer = typeof window === 'undefined';

const firebaseAdminConfig = {
  credential: isServer ? cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }) : undefined, // This will be undefined on the client side
};

export function initializeFirebaseAdmin() {
  // Only initialize on the server side
  if (!isServer) {
    console.error('Firebase Admin SDK should only be used on the server side');
    throw new Error('Firebase Admin SDK cannot be used on the client side');
  }

  if (!getApps().length) {
    initializeApp(firebaseAdminConfig);
  }
  return getFirestore();
} 