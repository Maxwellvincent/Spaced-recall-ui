// check-firebase-project.js - Check Firebase project configuration
require('dotenv').config({ path: '.env.local' });
const { initializeApp } = require('firebase/app');
const { getAuth, onAuthStateChanged } = require('firebase/auth');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

console.log('Checking Firebase project configuration...');

// Get API key from environment variables
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

console.log('API Key (first 5 chars):', apiKey ? apiKey.substring(0, 5) + '...' : 'Not set');
console.log('Auth Domain:', authDomain);
console.log('Project ID:', projectId);

// Firebase configuration
const firebaseConfig = {
  apiKey: apiKey,
  authDomain: authDomain,
  projectId: projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

try {
  // Initialize Firebase
  console.log('\nInitializing Firebase...');
  const app = initializeApp(firebaseConfig);
  console.log('Firebase app initialized successfully');
  
  // Initialize Auth
  console.log('\nChecking Auth configuration...');
  const auth = getAuth(app);
  console.log('Auth object created successfully');
  
  // Check auth configuration
  console.log('\nAuth configuration:');
  console.log('- Auth instance:', auth ? 'Valid' : 'Invalid');
  console.log('- Auth domain:', auth.config.authDomain);
  console.log('- API key:', auth.config.apiKey ? auth.config.apiKey.substring(0, 5) + '...' : 'Not set');
  
  // Check if Firebase project exists
  console.log('\nChecking Firestore access...');
  const db = getFirestore(app);
  
  // Try to access Firestore to verify project configuration
  getDocs(collection(db, 'users'))
    .then(() => {
      console.log('Successfully connected to Firestore. Project configuration is valid.');
    })
    .catch((error) => {
      console.error('Error accessing Firestore:', error.code, error.message);
      if (error.code === 'permission-denied') {
        console.log('Permission denied error indicates the project exists but you may need to update security rules.');
      } else if (error.code === 'auth/configuration-not-found') {
        console.log('\nFIREBASE PROJECT CONFIGURATION ISSUE:');
        console.log('1. Make sure your Firebase project exists and is properly set up');
        console.log('2. Verify that the auth domain is correctly configured in Firebase console');
        console.log('3. Check if Authentication is enabled in the Firebase console');
        console.log('4. Make sure you have added localhost to authorized domains in Firebase Authentication settings');
      }
    });
  
  // Listen for auth state changes to verify auth configuration
  console.log('\nChecking auth state changes...');
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log('User is signed in:', user.uid);
    } else {
      console.log('No user is signed in, but auth state change listener is working');
    }
    unsubscribe();
  }, (error) => {
    console.error('Auth state change error:', error.code, error.message);
    if (error.code === 'auth/configuration-not-found') {
      console.log('\nFIREBASE AUTH CONFIGURATION ISSUE:');
      console.log('1. Make sure Authentication is enabled in the Firebase console');
      console.log('2. Verify that you have set up the sign-in methods you want to use');
      console.log('3. Check if your Firebase project is properly configured');
      console.log('4. Make sure localhost is added to authorized domains in Firebase Authentication settings');
    }
  });

} catch (error) {
  console.error('Error initializing Firebase:', error);
} 