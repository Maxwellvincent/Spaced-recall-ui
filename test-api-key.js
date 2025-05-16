// test-api-key.js - Test if the Firebase API key is valid
require('dotenv').config({ path: '.env.local' });
const { initializeApp } = require('firebase/app');
const { getAuth, signInAnonymously } = require('firebase/auth');

console.log('Testing Firebase API key validity...');

// Get API key from environment variables
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
console.log('API Key (first 5 chars):', apiKey ? apiKey.substring(0, 5) + '...' : 'Not set');

// Firebase configuration
const firebaseConfig = {
  apiKey: apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
};

try {
  // Initialize Firebase
  console.log('Initializing Firebase with config:', {
    apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 5)}...` : "Not set",
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId
  });
  
  const app = initializeApp(firebaseConfig);
  console.log('Firebase app initialized successfully');
  
  // Test authentication with anonymous sign-in
  const auth = getAuth(app);
  console.log('Testing API key with anonymous sign-in...');
  
  signInAnonymously(auth)
    .then(() => {
      console.log('API key is valid! Anonymous sign-in successful.');
    })
    .catch((error) => {
      console.error('API key validation failed:', error.code, error.message);
    });
} catch (error) {
  console.error('Error initializing Firebase:', error);
} 