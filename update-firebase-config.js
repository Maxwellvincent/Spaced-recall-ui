// update-firebase-config.js - Update Firebase API key
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

// Get the new API key from command line arguments
const newApiKey = process.argv[2];

if (!newApiKey) {
  console.error('Please provide a new API key as an argument.');
  console.error('Usage: node update-firebase-config.js YOUR_NEW_API_KEY');
  process.exit(1);
}

console.log('Updating Firebase configuration with new API key...');

// Update .env.local file
try {
  const envPath = path.join(__dirname, '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('.env.local file not found!');
    process.exit(1);
  }

  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Replace API key
  envContent = envContent.replace(
    /NEXT_PUBLIC_FIREBASE_API_KEY=.*/,
    `NEXT_PUBLIC_FIREBASE_API_KEY=${newApiKey}`
  );
  
  fs.writeFileSync(envPath, envContent);
  console.log('.env.local file updated successfully!');
} catch (error) {
  console.error('Error updating .env.local file:', error);
  process.exit(1);
}

// Update firebase-config-values.js
try {
  const configPath = path.join(__dirname, 'src', 'lib', 'firebase-config-values.js');
  
  if (!fs.existsSync(configPath)) {
    console.error('firebase-config-values.js file not found!');
    process.exit(1);
  }
  
  let configContent = fs.readFileSync(configPath, 'utf8');
  
  // Replace API key
  configContent = configContent.replace(
    /apiKey: ".*"/,
    `apiKey: "${newApiKey}"`
  );
  
  fs.writeFileSync(configPath, configContent);
  console.log('firebase-config-values.js file updated successfully!');
} catch (error) {
  console.error('Error updating firebase-config-values.js file:', error);
  process.exit(1);
}

// Clean the Next.js cache
try {
  if (fs.existsSync(path.join(__dirname, '.next'))) {
    console.log('Cleaning Next.js cache...');
    fs.rmSync(path.join(__dirname, '.next'), { recursive: true, force: true });
    console.log('Next.js cache cleaned successfully!');
  }
} catch (error) {
  console.error('Error cleaning Next.js cache:', error);
}

console.log('\n=== CONFIGURATION UPDATED ===');
console.log('Firebase API key has been updated to:', newApiKey.substring(0, 5) + '...');
console.log('\nNext steps:');
console.log('1. Make sure your new API key has access to the Identity Toolkit API in Google Cloud Console');
console.log('2. Restart your Next.js development server:');
console.log('   npm run dev');
console.log('3. Visit http://localhost:3000/test-auth to test Google Sign-In'); 