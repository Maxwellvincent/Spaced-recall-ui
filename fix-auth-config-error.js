// fix-auth-config-error.js - Fix the auth/configuration-not-found error
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getAuth, onAuthStateChanged } = require('firebase/auth');

console.log('Fixing auth/configuration-not-found error...');

// Get API key from environment variables
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

console.log('Current configuration:');
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

// Fix 1: Update the firebase-config-values.js file
const updateFirebaseConfigValues = () => {
  const configPath = path.join(__dirname, 'src', 'lib', 'firebase-config-values.js');
  
  if (!fs.existsSync(configPath)) {
    console.log('Creating firebase-config-values.js file...');
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } else {
    console.log('Updating firebase-config-values.js file...');
  }
  
  const configContent = `// firebase-config-values.js - Fallback Firebase configuration
// This file serves as a fallback if environment variables are not loaded correctly

export const firebaseConfig = {
  apiKey: "${apiKey}",
  authDomain: "${authDomain}",
  projectId: "${projectId}",
  storageBucket: "${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`}",
  messagingSenderId: "${process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || ''}",
  appId: "${process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ''}"
};
`;
  
  fs.writeFileSync(configPath, configContent);
  console.log('Firebase config values updated successfully!');
};

// Fix 2: Check if the auth domain is properly set
const checkAuthDomain = () => {
  if (!authDomain || authDomain.includes('replace_with_your_')) {
    console.error('Auth domain is not properly set!');
    console.log('Updating auth domain to default format...');
    
    // Update .env.local file
    const envPath = path.join(__dirname, '.env.local');
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      
      // Replace auth domain or add it if it doesn't exist
      if (envContent.includes('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=')) {
        envContent = envContent.replace(
          /NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=.*/,
          `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${projectId}.firebaseapp.com`
        );
      } else {
        envContent += `\nNEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${projectId}.firebaseapp.com`;
      }
      
      fs.writeFileSync(envPath, envContent);
      console.log('Auth domain updated in .env.local file!');
    }
  } else {
    console.log('Auth domain is properly set.');
  }
};

// Fix 3: Create a test for the auth/configuration-not-found error
const testAuthConfig = async () => {
  try {
    console.log('\nTesting Firebase configuration...');
    const app = initializeApp(firebaseConfig);
    console.log('Firebase app initialized successfully');
    
    const auth = getAuth(app);
    console.log('Auth object created successfully');
    
    return new Promise((resolve) => {
      console.log('Testing auth state changes...');
      const unsubscribe = onAuthStateChanged(auth, 
        (user) => {
          if (user) {
            console.log('User is signed in:', user.uid);
          } else {
            console.log('No user is signed in, but auth state change listener is working');
          }
          unsubscribe();
          resolve(true);
        }, 
        (error) => {
          console.error('Auth state change error:', error.code, error.message);
          if (error.code === 'auth/configuration-not-found') {
            console.log('\nFIREBASE AUTH CONFIGURATION ISSUE DETECTED:');
            console.log('Please follow these steps to fix the issue:');
            console.log('1. Go to the Firebase console (https://console.firebase.google.com)');
            console.log('2. Select your project:', projectId);
            console.log('3. Go to Authentication > Sign-in method');
            console.log('4. Make sure at least one sign-in provider is enabled');
            console.log('5. Go to Authentication > Settings > Authorized domains');
            console.log('6. Make sure localhost is in the list of authorized domains');
          }
          unsubscribe();
          resolve(false);
        }
      );
    });
  } catch (error) {
    console.error('Error testing Firebase configuration:', error);
    return false;
  }
};

// Apply fixes
const applyFixes = async () => {
  // Fix 1: Update firebase-config-values.js
  updateFirebaseConfigValues();
  
  // Fix 2: Check auth domain
  checkAuthDomain();
  
  // Fix 3: Test configuration
  const testResult = await testAuthConfig();
  
  if (testResult) {
    console.log('\nFixes applied successfully!');
    console.log('The auth/configuration-not-found error should be resolved.');
    console.log('Please restart your Next.js development server.');
  } else {
    console.log('\nSome issues may still need to be fixed manually.');
    console.log('Please check the Firebase console and make sure your project is properly configured.');
  }
};

// Run the fixes
applyFixes(); 