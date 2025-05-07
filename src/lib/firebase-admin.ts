import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Track initialization status
let firebaseAdminInitialized = false;
let adminFirestore = null;
let adminAuth = null;

// Initialize Firebase Admin SDK for server-side operations
export async function initializeFirebaseAdmin() {
  // Return if already initialized
  if (firebaseAdminInitialized) {
    return { db: adminFirestore, auth: adminAuth };
  }

  try {
    // Check if Firebase Admin is already initialized
    if (getApps().length > 0) {
      console.log('Firebase Admin already initialized');
      firebaseAdminInitialized = true;
      return { db: getFirestore(), auth: getAuth() };
    }

    // Get service account credentials
    let serviceAccount;
    
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      // Use environment variable if available
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        console.log('Using Firebase service account from environment variable');
      } catch (parseError) {
        console.error('Failed to parse Firebase service account from environment variable:', parseError);
        throw new Error('Invalid service account JSON in environment variable');
      }
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // Use credentials file path if available
      console.log('Using Firebase service account from credentials file');
      serviceAccount = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    } else {
      // Use default service account file
      try {
        serviceAccount = require('../../service-account.json');
        console.log('Using Firebase service account from service-account.json file');
      } catch (fileError) {
        console.error('Failed to load service-account.json:', fileError);
        throw new Error('No Firebase service account credentials available');
      }
    }

    // Initialize the app
    const app = initializeApp({
      credential: cert(serviceAccount),
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || undefined,
    });
    
    console.log('Firebase Admin initialized successfully');
    
    // Initialize Firestore
    adminFirestore = getFirestore();
    adminAuth = getAuth();
    
    console.log('Firestore (Admin) initialized');
    firebaseAdminInitialized = true;
    
    return { db: adminFirestore, auth: adminAuth };
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    throw error;
  }
}

// Helper function to get Firestore instance
export async function getAdminFirestore() {
  const { db } = await initializeFirebaseAdmin();
  return db;
}

// Helper function to get Auth instance
export async function getAdminAuth() {
  const { auth } = await initializeFirebaseAdmin();
  return auth;
} 