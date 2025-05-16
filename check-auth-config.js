// check-auth-config.js - Check for auth/configuration-not-found error
require('dotenv').config({ path: '.env.local' });
const { initializeApp } = require('firebase/app');
const { getAuth, onAuthStateChanged } = require('firebase/auth');

console.log('Checking Firebase auth configuration for auth/configuration-not-found error...');

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
  console.log('\nInitializing Auth...');
  const auth = getAuth(app);
  console.log('Auth object created successfully');
  
  // Listen for auth state changes to verify auth configuration
  console.log('\nTesting auth state changes (this will detect auth/configuration-not-found)...');
  const unsubscribe = onAuthStateChanged(auth, 
    (user) => {
      if (user) {
        console.log('User is signed in:', user.uid);
      } else {
        console.log('No user is signed in, but auth state change listener is working');
        console.log('This indicates the Firebase project is properly configured for authentication');
      }
      unsubscribe();
    }, 
    (error) => {
      console.error('\nAUTH ERROR:', error.code, error.message);
      
      if (error.code === 'auth/configuration-not-found') {
        console.log('\nFIREBASE AUTH CONFIGURATION ISSUE DETECTED:');
        console.log('The "auth/configuration-not-found" error indicates a problem with your Firebase project configuration.');
        console.log('\nPossible causes:');
        console.log('1. Authentication is not enabled in the Firebase console');
        console.log('2. The Firebase project may have been deleted or does not exist');
        console.log('3. The API key may be invalid or restricted');
        console.log('4. The auth domain is incorrect or not properly configured');
        
        console.log('\nRecommended solutions:');
        console.log('1. Go to the Firebase console (https://console.firebase.google.com)');
        console.log('2. Select your project: ' + projectId);
        console.log('3. Go to Authentication > Sign-in method');
        console.log('4. Make sure at least one sign-in provider is enabled');
        console.log('5. Go to Authentication > Settings > Authorized domains');
        console.log('6. Make sure localhost is in the list of authorized domains');
        console.log('7. Verify that your API key is valid and has the necessary permissions');
      }
    }
  );

  // Keep the script running for a few seconds to allow the auth state change to be detected
  console.log('Waiting for auth state change events...');
  setTimeout(() => {
    console.log('\nCheck complete. If no errors were reported, your Firebase auth configuration is valid.');
    process.exit(0);
  }, 5000);

} catch (error) {
  console.error('Error initializing Firebase:', error);
} 