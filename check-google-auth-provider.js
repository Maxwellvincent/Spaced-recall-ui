// check-google-auth-provider.js - Check Google Authentication provider configuration
require('dotenv').config({ path: '.env.local' });
const { initializeApp } = require('firebase/app');
const { getAuth, GoogleAuthProvider } = require('firebase/auth');

console.log('Checking Google Authentication provider configuration...');

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

console.log('\nFirebase configuration:');
console.log(JSON.stringify(firebaseConfig, (key, value) => {
  // Mask API key for security
  if (key === 'apiKey' && value) {
    return value.substring(0, 5) + '...';
  }
  return value;
}, 2));

try {
  // Initialize Firebase
  console.log('\nInitializing Firebase...');
  const app = initializeApp(firebaseConfig);
  console.log('Firebase app initialized successfully');
  
  // Initialize Auth
  console.log('\nInitializing Auth...');
  const auth = getAuth(app);
  console.log('Auth object created successfully');
  console.log('Auth config:', JSON.stringify({
    apiKey: auth.config.apiKey ? auth.config.apiKey.substring(0, 5) + '...' : 'Not set',
    authDomain: auth.config.authDomain,
    projectId: auth.tenantId || 'default'
  }, null, 2));
  
  // Check Google provider
  console.log('\nChecking Google Authentication provider...');
  try {
    const googleProvider = new GoogleAuthProvider();
    console.log('Google provider created successfully');
    
    // Add scopes
    googleProvider.addScope('email');
    googleProvider.addScope('profile');
    console.log('Added scopes: email, profile');
    
    console.log('\nGoogle provider configuration:');
    console.log('- Provider ID:', googleProvider.providerId);
    console.log('- Scopes:', googleProvider.scopes);
    
    console.log('\nGoogle Authentication provider appears to be properly configured.');
    console.log('However, this does not guarantee that Google Sign-In is enabled in the Firebase console.');
    
    console.log('\nRecommendations:');
    console.log('1. Go to Firebase console (https://console.firebase.google.com)');
    console.log('2. Select your project:', projectId);
    console.log('3. Go to Authentication > Sign-in method');
    console.log('4. Make sure Google is enabled as a sign-in provider');
    console.log('5. Verify that you have configured the OAuth consent screen in Google Cloud Console');
    console.log('6. Make sure localhost is added to authorized domains in Firebase Authentication settings');
    
  } catch (providerError) {
    console.error('Error creating Google provider:', providerError);
  }
  
} catch (error) {
  console.error('Error initializing Firebase:', error);
} 