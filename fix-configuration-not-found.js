// fix-configuration-not-found.js - Fix for Firebase CONFIGURATION_NOT_FOUND error
require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');
const { initializeApp } = require('firebase/app');
const { getAuth, GoogleAuthProvider } = require('firebase/auth');

console.log('Diagnosing CONFIGURATION_NOT_FOUND error...');

// Get environment variables
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

console.log('Current configuration:');
console.log('API Key (first 5 chars):', apiKey ? apiKey.substring(0, 5) + '...' : 'Not set');
console.log('Auth Domain:', authDomain);
console.log('Project ID:', projectId);

// Test Firebase project configuration
const testProjectConfiguration = async () => {
  console.log('\nTesting Firebase project configuration...');
  
  try {
    // Initialize Firebase
    const firebaseConfig = {
      apiKey: apiKey,
      authDomain: authDomain,
      projectId: projectId
    };
    
    console.log('Initializing Firebase with config:', firebaseConfig);
    const app = initializeApp(firebaseConfig);
    console.log('Firebase app initialized successfully');
    
    // Test Identity Toolkit API
    console.log('\nTesting Identity Toolkit API with project config...');
    const url = `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/config?key=${apiKey}`;
    console.log('Testing URL:', url.replace(apiKey, apiKey.substring(0, 5) + '...'));
    
    try {
      const response = await fetch(url);
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Project configuration found:', data);
        return { success: true, data };
      } else {
        const errorText = await response.text();
        console.error('Project configuration test failed:', errorText);
        return { success: false, error: errorText };
      }
    } catch (fetchError) {
      console.error('Network error testing project configuration:', fetchError);
      return { success: false, error: fetchError.message };
    }
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    return { success: false, error: error.message };
  }
};

// Test if the project exists in Firebase
const testProjectExists = async () => {
  console.log('\nTesting if Firebase project exists...');
  
  try {
    const url = `https://firebase.googleapis.com/v1beta1/projects/${projectId}`;
    console.log('Testing URL:', url);
    
    try {
      const response = await fetch(url);
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Project exists:', data.projectId);
        return { success: true, data };
      } else {
        const errorText = await response.text();
        console.error('Project existence test failed:', errorText);
        return { success: false, error: errorText };
      }
    } catch (fetchError) {
      console.error('Network error testing project existence:', fetchError);
      return { success: false, error: fetchError.message };
    }
  } catch (error) {
    console.error('Error testing project existence:', error);
    return { success: false, error: error.message };
  }
};

// Test if Authentication is enabled for the project
const testAuthenticationEnabled = async () => {
  console.log('\nTesting if Authentication is enabled for the project...');
  
  try {
    // Initialize Firebase
    const firebaseConfig = {
      apiKey: apiKey,
      authDomain: authDomain,
      projectId: projectId
    };
    
    const app = initializeApp(firebaseConfig, 'auth-test-app');
    const auth = getAuth(app);
    
    // Try to create a Google provider
    const provider = new GoogleAuthProvider();
    console.log('Google provider created successfully');
    
    return { success: true };
  } catch (error) {
    console.error('Error testing Authentication:', error);
    return { success: false, error: error.message };
  }
};

// Run all tests and provide detailed recommendations
const runDiagnostics = async () => {
  console.log('\nRunning diagnostics for CONFIGURATION_NOT_FOUND error...');
  
  // Test 1: Project Configuration
  const configResult = await testProjectConfiguration();
  
  // Test 2: Project Existence
  const projectResult = await testProjectExists();
  
  // Test 3: Authentication Enabled
  const authResult = await testAuthenticationEnabled();
  
  console.log('\n=== DIAGNOSTIC RESULTS ===');
  console.log('Project Configuration Test:', configResult.success ? '✅ Passed' : '❌ Failed');
  console.log('Project Existence Test:', projectResult.success ? '✅ Passed' : '❌ Failed');
  console.log('Authentication Enabled Test:', authResult.success ? '✅ Passed' : '❌ Failed');
  
  console.log('\n=== RECOMMENDATIONS ===');
  if (!configResult.success) {
    console.log('1. CONFIGURATION_NOT_FOUND typically means:');
    console.log('   - The Firebase project does not exist');
    console.log('   - Authentication is not enabled for the project');
    console.log('   - The project ID or API key is incorrect');
    console.log('   - The project may have been deleted');
    
    console.log('\n2. To fix this issue:');
    console.log('   a. Go to Firebase Console: https://console.firebase.google.com/');
    console.log(`   b. Verify that project "${projectId}" exists`);
    console.log('   c. If it exists, go to Authentication > Get Started');
    console.log('   d. Enable at least one sign-in method (Email/Password or Google)');
    console.log('   e. For Google Sign-In, complete the OAuth consent screen setup');
    console.log('   f. Go to Authentication > Settings > Authorized domains');
    console.log('   g. Add "localhost" to the list of authorized domains');
    
    console.log('\n3. Check API key configuration:');
    console.log('   a. Go to Google Cloud Console: https://console.cloud.google.com/');
    console.log(`   b. Select your project: "${projectId}"`);
    console.log('   c. Navigate to APIs & Services > Credentials');
    console.log('   d. Find your API key and check its restrictions');
    console.log('   e. Make sure the Identity Toolkit API is enabled');
    console.log('   f. Create a new API key if needed');
    
    console.log('\n4. If the project does not exist:');
    console.log('   a. Create a new Firebase project');
    console.log('   b. Enable Authentication');
    console.log('   c. Update your .env.local file with the new project details');
  } else {
    console.log('Your Firebase project configuration appears to be valid.');
    console.log('Make sure:');
    console.log('1. Google Sign-In is enabled in Firebase Console');
    console.log('2. localhost is added to authorized domains');
    console.log('3. Your API key has access to the Identity Toolkit API');
  }
  
  console.log('\nAfter making these changes, restart your Next.js development server:');
  console.log('npm run dev');
};

// Run diagnostics
runDiagnostics(); 