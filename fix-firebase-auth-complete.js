// fix-firebase-auth-complete.js - Comprehensive fix for Firebase auth issues
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getAuth, GoogleAuthProvider } = require('firebase/auth');
const fetch = require('node-fetch');

console.log('Running comprehensive Firebase authentication fix...');

// Get environment variables
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

console.log('Current configuration:');
console.log('API Key (first 5 chars):', apiKey ? apiKey.substring(0, 5) + '...' : 'Not set');
console.log('Auth Domain:', authDomain);
console.log('Project ID:', projectId);

// Fix 1: Update .env.local file with proper configuration
const updateEnvFile = () => {
  console.log('\nChecking and updating .env.local file...');
  
  const envPath = path.join(__dirname, '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('.env.local file not found!');
    return false;
  }
  
  let envContent = fs.readFileSync(envPath, 'utf8');
  let updated = false;
  
  // Make sure auth domain is correct
  if (projectId && (!authDomain || !authDomain.includes(projectId))) {
    console.log('Fixing auth domain...');
    const correctAuthDomain = `${projectId}.firebaseapp.com`;
    
    if (envContent.includes('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=')) {
      envContent = envContent.replace(
        /NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=.*/,
        `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${correctAuthDomain}`
      );
    } else {
      envContent += `\nNEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${correctAuthDomain}`;
    }
    updated = true;
  }
  
  // Make sure storage bucket is correct
  if (projectId && !envContent.includes(`NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${projectId}.appspot.com`)) {
    console.log('Fixing storage bucket...');
    const correctStorageBucket = `${projectId}.appspot.com`;
    
    if (envContent.includes('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=')) {
      envContent = envContent.replace(
        /NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=.*/,
        `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${correctStorageBucket}`
      );
    } else {
      envContent += `\nNEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${correctStorageBucket}`;
    }
    updated = true;
  }
  
  if (updated) {
    fs.writeFileSync(envPath, envContent);
    console.log('.env.local file updated successfully!');
  } else {
    console.log('.env.local file looks good!');
  }
  
  return true;
};

// Fix 2: Update firebase-config-values.js
const updateFirebaseConfigValues = () => {
  console.log('\nUpdating firebase-config-values.js...');
  
  const configPath = path.join(__dirname, 'src', 'lib', 'firebase-config-values.js');
  
  // Create directory if it doesn't exist
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const configContent = `// firebase-config-values.js - Fallback Firebase configuration
// This file serves as a fallback if environment variables are not loaded correctly

export const firebaseConfig = {
  apiKey: "${apiKey}",
  authDomain: "${authDomain || `${projectId}.firebaseapp.com`}",
  projectId: "${projectId}",
  storageBucket: "${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`}",
  messagingSenderId: "${process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || ''}",
  appId: "${process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ''}"
};
`;
  
  fs.writeFileSync(configPath, configContent);
  console.log('Firebase config values updated successfully!');
};

// Fix 3: Fix Firebase initialization in src/lib/firebase.ts
const checkAndFixFirebaseInitialization = () => {
  console.log('\nChecking Firebase initialization code...');
  
  const firebasePath = path.join(__dirname, 'src', 'lib', 'firebase.ts');
  if (!fs.existsSync(firebasePath)) {
    console.log('Firebase initialization file not found at expected location.');
    return;
  }
  
  let firebaseContent = fs.readFileSync(firebasePath, 'utf8');
  let updated = false;
  
  // Check for common issues in the Firebase initialization code
  if (firebaseContent.includes('apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,') && 
      !firebaseContent.includes('apiKey: String(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),')) {
    console.log('Fixing API key casting in Firebase initialization...');
    firebaseContent = firebaseContent.replace(
      'apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,',
      'apiKey: String(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),'
    );
    updated = true;
  }
  
  if (updated) {
    fs.writeFileSync(firebasePath, firebaseContent);
    console.log('Firebase initialization code updated successfully!');
  } else {
    console.log('Firebase initialization code looks good!');
  }
};

// Fix 4: Test Firebase configuration
const testFirebaseConfig = async () => {
  console.log('\nTesting Firebase configuration...');
  
  try {
    // Create Firebase configuration
    const firebaseConfig = {
      apiKey: apiKey,
      authDomain: authDomain || `${projectId}.firebaseapp.com`,
      projectId: projectId,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ''
    };
    
    // Initialize Firebase
    console.log('Initializing Firebase...');
    const app = initializeApp(firebaseConfig);
    console.log('Firebase app initialized successfully');
    
    // Initialize Auth
    const auth = getAuth(app);
    console.log('Auth object created successfully');
    
    // Test Google provider
    const provider = new GoogleAuthProvider();
    console.log('Google provider created successfully');
    
    // Test Identity Toolkit API
    console.log('\nTesting Identity Toolkit API access...');
    
    // Make sure API key is properly formatted as a string
    const formattedApiKey = String(apiKey).trim();
    
    // Construct the URL for testing
    const url = `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getProjectConfig?key=${formattedApiKey}`;
    console.log('Testing URL:', url.replace(formattedApiKey, formattedApiKey.substring(0, 5) + '...'));
    
    try {
      const response = await fetch(url);
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Identity Toolkit API test successful!');
        return true;
      } else {
        const errorText = await response.text();
        console.error('Identity Toolkit API test failed:', errorText);
        
        if (errorText.includes('API key not valid')) {
          console.log('\nAPI KEY ISSUE DETECTED:');
          console.log('1. Your API key may be invalid or restricted');
          console.log('2. Make sure the Identity Toolkit API is enabled for your project');
          console.log('3. Create a new API key in the Google Cloud Console and update your .env.local file');
        }
        
        return false;
      }
    } catch (fetchError) {
      console.error('Network error testing Identity Toolkit API:', fetchError);
      return false;
    }
  } catch (error) {
    console.error('Error testing Firebase configuration:', error);
    return false;
  }
};

// Fix 5: Create a clean .env.local if needed
const createCleanEnvFile = () => {
  console.log('\nChecking if we need to create a clean .env.local file...');
  
  const envPath = path.join(__dirname, '.env.local');
  if (!fs.existsSync(envPath) || !apiKey || !projectId) {
    console.log('Creating a template .env.local file...');
    
    const envContent = `# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=replace_with_your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${projectId ? `${projectId}.firebaseapp.com` : 'replace_with_your_auth_domain'}
NEXT_PUBLIC_FIREBASE_PROJECT_ID=${projectId || 'replace_with_your_project_id'}
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${projectId ? `${projectId}.appspot.com` : 'replace_with_your_storage_bucket'}
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=replace_with_your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=replace_with_your_app_id

# Optional settings
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false
`;
    
    fs.writeFileSync(envPath, envContent);
    console.log('Template .env.local file created. Please update it with your Firebase configuration.');
    return true;
  }
  
  return false;
};

// Run all fixes
const runAllFixes = async () => {
  console.log('Running all fixes...');
  
  // Fix 1: Update .env.local file
  const envUpdated = updateEnvFile();
  
  // Fix 2: Update firebase-config-values.js
  updateFirebaseConfigValues();
  
  // Fix 3: Fix Firebase initialization code
  checkAndFixFirebaseInitialization();
  
  // Fix 4: Test Firebase configuration
  const testResult = await testFirebaseConfig();
  
  // Fix 5: Create clean .env.local if needed
  if (!envUpdated) {
    createCleanEnvFile();
  }
  
  console.log('\n=== FIX SUMMARY ===');
  if (testResult) {
    console.log('✅ Firebase configuration appears to be valid!');
    console.log('Please restart your Next.js development server:');
    console.log('npm run dev');
  } else {
    console.log('⚠️ Some issues still need to be fixed manually:');
    console.log('1. Make sure Google Sign-In is enabled in Firebase Console');
    console.log('2. Verify that localhost is added to authorized domains');
    console.log('3. Check that your API key is valid and has access to the Identity Toolkit API');
    console.log('4. Consider creating a new API key in Google Cloud Console');
    console.log('5. After making changes, restart your Next.js development server');
  }
};

// Run all fixes
runAllFixes(); 