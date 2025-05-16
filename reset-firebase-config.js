// reset-firebase-config.js - Complete reset of Firebase configuration
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Performing complete reset of Firebase configuration...');

// Get current configuration
const currentConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

console.log('Current configuration:');
console.log(JSON.stringify(currentConfig, (key, value) => {
  if (key === 'apiKey' && value) {
    return value.substring(0, 5) + '...';
  }
  return value;
}, 2));

// STEP 1: Clean the cache
console.log('\nStep 1: Cleaning Next.js cache...');
try {
  // Delete .next folder
  if (fs.existsSync(path.join(__dirname, '.next'))) {
    console.log('Deleting .next folder...');
    fs.rmSync(path.join(__dirname, '.next'), { recursive: true, force: true });
  }
  
  console.log('Cache cleaned successfully!');
} catch (error) {
  console.error('Error cleaning cache:', error);
}

// STEP 2: Update firebase-config-values.js
console.log('\nStep 2: Updating firebase-config-values.js...');
try {
  const configPath = path.join(__dirname, 'src', 'lib', 'firebase-config-values.js');
  
  // Create directory if it doesn't exist
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const configContent = `// firebase-config-values.js - Fallback Firebase configuration
// This file serves as a fallback if environment variables are not loaded correctly

export const firebaseConfig = {
  apiKey: "${currentConfig.apiKey}",
  authDomain: "${currentConfig.authDomain}",
  projectId: "${currentConfig.projectId}",
  storageBucket: "${currentConfig.storageBucket}",
  messagingSenderId: "${currentConfig.messagingSenderId}",
  appId: "${currentConfig.appId}"
};
`;
  
  fs.writeFileSync(configPath, configContent);
  console.log('Firebase config values updated successfully!');
} catch (error) {
  console.error('Error updating firebase-config-values.js:', error);
}

// STEP 3: Check if login page needs modification
console.log('\nStep 3: Checking login page implementation...');
try {
  const loginPath = path.join(__dirname, 'src', 'app', '(auth)', 'login', 'page.tsx');
  
  if (fs.existsSync(loginPath)) {
    let loginContent = fs.readFileSync(loginPath, 'utf8');
    let updated = false;
    
    // Check for common issues in the login page's Google auth implementation
    if (loginContent.includes('const provider = new GoogleAuthProvider();') && 
        !loginContent.includes('provider.setCustomParameters({')) {
      
      console.log('Updating Google Auth provider configuration in login page...');
      
      // Add custom parameters to Google provider
      loginContent = loginContent.replace(
        'const provider = new GoogleAuthProvider();',
        `const provider = new GoogleAuthProvider();
      // Add custom parameters for proper authentication
      provider.setCustomParameters({
        prompt: 'select_account'
      });`
      );
      
      updated = true;
    }
    
    if (updated) {
      fs.writeFileSync(loginPath, loginContent);
      console.log('Login page updated successfully!');
    } else {
      console.log('Login page looks good, no changes needed.');
    }
  } else {
    console.log('Login page not found at expected location.');
  }
} catch (error) {
  console.error('Error updating login page:', error);
}

// STEP 4: Create a test file to verify configuration
console.log('\nStep 4: Creating test file for Google Sign-In...');
try {
  const testPath = path.join(__dirname, 'src', 'app', 'test-auth', 'page.tsx');
  
  // Create directory if it doesn't exist
  const dir = path.dirname(testPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const testContent = `"use client";

import { useState, useEffect } from "react";
import { 
  GoogleAuthProvider, 
  signInWithPopup,
  getAuth,
  onAuthStateChanged
} from "firebase/auth";
import { initializeApp } from "firebase/app";

export default function TestAuthPage() {
  const [status, setStatus] = useState("Loading...");
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  
  useEffect(() => {
    const firebaseConfig = {
      apiKey: "${currentConfig.apiKey}",
      authDomain: "${currentConfig.authDomain}",
      projectId: "${currentConfig.projectId}",
      storageBucket: "${currentConfig.storageBucket}",
      messagingSenderId: "${currentConfig.messagingSenderId}",
      appId: "${currentConfig.appId}"
    };
    
    try {
      // Initialize Firebase
      const app = initializeApp(firebaseConfig, "test-auth-app");
      const auth = getAuth(app);
      
      setStatus("Firebase initialized");
      
      // Listen for auth state changes
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        if (currentUser) {
          setUser(currentUser);
          setStatus("User is signed in");
        } else {
          setUser(null);
          setStatus("No user is signed in");
        }
      });
      
      return () => unsubscribe();
    } catch (err) {
      setStatus("Firebase initialization failed");
      setError(err.message);
    }
  }, []);
  
  const handleGoogleSignIn = async () => {
    try {
      setStatus("Attempting Google Sign-In...");
      setError("");
      
      // Get a fresh auth instance
      const app = initializeApp({
        apiKey: "${currentConfig.apiKey}",
        authDomain: "${currentConfig.authDomain}",
        projectId: "${currentConfig.projectId}"
      }, "google-sign-in-test");
      
      const auth = getAuth(app);
      
      // Create provider
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      // Sign in
      const result = await signInWithPopup(auth, provider);
      
      // Handle result
      setUser(result.user);
      setStatus("Google Sign-In successful");
    } catch (err) {
      console.error("Google Sign-In error:", err);
      setStatus("Google Sign-In failed");
      setError(err.message);
    }
  };
  
  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-4">Firebase Authentication Test</h1>
      
      <div className="bg-blue-50 p-4 rounded-lg mb-4">
        <h2 className="font-medium">Status: {status}</h2>
        {error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 text-red-700 rounded">
            <p className="font-bold">Error:</p>
            <p>{error}</p>
          </div>
        )}
      </div>
      
      <div className="mb-4">
        <button
          onClick={handleGoogleSignIn}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Sign in with Google
        </button>
      </div>
      
      {user && (
        <div className="bg-green-50 p-4 rounded-lg">
          <h2 className="font-medium mb-2">User Info:</h2>
          <p><strong>Display Name:</strong> {user.displayName}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>UID:</strong> {user.uid}</p>
        </div>
      )}
      
      <div className="mt-8 p-4 bg-yellow-50 rounded-lg">
        <h2 className="font-medium mb-2">Firebase Config:</h2>
        <pre className="whitespace-pre-wrap">
          {JSON.stringify({
            apiKey: "${currentConfig.apiKey}".substring(0, 5) + "...",
            authDomain: "${currentConfig.authDomain}",
            projectId: "${currentConfig.projectId}"
          }, null, 2)}
        </pre>
      </div>
    </div>
  );
}
`;
  
  fs.writeFileSync(testPath, testContent);
  console.log('Test auth page created at /test-auth');
} catch (error) {
  console.error('Error creating test auth page:', error);
}

// STEP 5: Install necessary dependencies
console.log('\nStep 5: Making sure all necessary dependencies are installed...');
try {
  console.log('This may take a moment...');
  execSync('npm install firebase@latest', { stdio: 'inherit' });
  console.log('Dependencies installed successfully!');
} catch (error) {
  console.error('Error installing dependencies:', error);
}

console.log('\n=== RESET COMPLETE ===');
console.log('Configuration has been reset and optimized.');
console.log('\nNext steps:');
console.log('1. Go to the Firebase Console and ensure Google Sign-In is enabled');
console.log('2. Make sure localhost is added to authorized domains');
console.log('3. Restart your Next.js development server:');
console.log('   npm run dev');
console.log('4. Visit http://localhost:3000/test-auth to test Google Sign-In');
console.log('\nIf you still have issues, you may need to create a new API key in Google Cloud Console'); 