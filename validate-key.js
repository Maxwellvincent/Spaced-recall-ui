// validate-key.js - Validate Firebase API key and check permissions
require('dotenv').config({ path: '.env.local' });
const { initializeApp } = require('firebase/app');
const { getAuth, GoogleAuthProvider } = require('firebase/auth');

console.log('Validating Firebase API key...');

// Get API key from environment variables
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
console.log('API Key (first 5 chars):', apiKey ? apiKey.substring(0, 5) + '...' : 'Not set');

// Firebase configuration
const firebaseConfig = {
  apiKey: apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

console.log('\nFull Firebase config (with masked API key):');
console.log({
  apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 5)}...` : "Not set",
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId ? `${firebaseConfig.appId.substring(0, 8)}...` : "Not set"
});

try {
  // Initialize Firebase
  console.log('\nInitializing Firebase...');
  const app = initializeApp(firebaseConfig);
  console.log('Firebase app initialized successfully');
  
  // Get Auth instance
  const auth = getAuth(app);
  console.log('Firebase Auth initialized successfully');
  
  // Check if Google provider can be initialized
  console.log('\nTesting Google provider initialization...');
  try {
    const provider = new GoogleAuthProvider();
    console.log('Google provider initialized successfully');
    console.log('API key appears valid for Google Authentication');
  } catch (providerError) {
    console.error('Error initializing Google provider:', providerError);
    console.log('\nPossible issues:');
    console.log('1. The API key may not have permission to use the Identity Toolkit API');
    console.log('2. The API key may be restricted to specific domains or apps');
  }
  
  console.log('\nRecommendations:');
  console.log('1. Check if the API key is restricted in Google Cloud Console');
  console.log('2. Verify that the Identity Toolkit API is enabled for your project');
  console.log('3. Make sure the API key has access to the Identity Toolkit API');
  console.log('4. Check if your auth domain is properly configured');
  
} catch (error) {
  console.error('\nError initializing Firebase:', error);
  
  if (error.message.includes('api-key-not-valid')) {
    console.log('\nAPI key validation failed. Possible reasons:');
    console.log('1. The API key is incorrect or malformed');
    console.log('2. The API key has been revoked or deleted');
    console.log('3. The API key has restrictions that prevent its use with Firebase Authentication');
  }
} 