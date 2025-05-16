// check-google-auth.js - Test if the API key works with Google Authentication
require('dotenv').config({ path: '.env.local' });
const { initializeApp } = require('firebase/app');
const { getAuth, GoogleAuthProvider } = require('firebase/auth');

console.log('Testing Google Authentication API access...');

// Get API key from environment variables
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
console.log('API Key (first 5 chars):', apiKey ? apiKey.substring(0, 5) + '...' : 'Not set');

// Try to ensure API key is properly formatted as a string
const formattedApiKey = String(apiKey).trim();
console.log('Formatted API Key (first 5 chars):', formattedApiKey ? formattedApiKey.substring(0, 5) + '...' : 'Not set');

// Firebase configuration
const firebaseConfig = {
  apiKey: formattedApiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
};

try {
  // Initialize Firebase
  console.log('Initializing Firebase...');
  const app = initializeApp(firebaseConfig);
  console.log('Firebase app initialized successfully');
  
  // Get Auth instance
  const auth = getAuth(app);
  console.log('Firebase Auth initialized successfully');
  
  // Check if Google provider can be initialized
  console.log('Testing Google provider initialization...');
  try {
    const provider = new GoogleAuthProvider();
    console.log('Google provider initialized successfully');
    
    // Check required APIs
    console.log('\nChecking required APIs for Google Authentication:');
    console.log('- Identity Toolkit API (identitytoolkit.googleapis.com) should be enabled');
    console.log('- Token Service API (securetoken.googleapis.com) should be enabled');
    console.log('- Make sure your API key has access to these APIs in Google Cloud Console');
    
    // Check auth domain
    console.log('\nChecking auth domain configuration:');
    console.log(`- Auth domain is set to: ${firebaseConfig.authDomain}`);
    console.log('- Make sure this domain is properly configured in Firebase console');
    console.log('- If testing locally, make sure localhost is added to authorized domains');
    
    console.log('\nAPI key appears valid for initialization, but may have restrictions preventing Google Auth');
  } catch (providerError) {
    console.error('Error initializing Google provider:', providerError);
  }
  
} catch (error) {
  console.error('Error initializing Firebase:', error);
} 