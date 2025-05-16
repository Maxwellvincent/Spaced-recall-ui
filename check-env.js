// check-env.js
// Simple script to verify environment variables are loaded correctly

require('dotenv').config({ path: '.env.local' });

console.log('Checking environment variables:');
console.log('NEXT_PUBLIC_FIREBASE_API_KEY:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'Set (first 5 chars: ' + process.env.NEXT_PUBLIC_FIREBASE_API_KEY.substring(0, 5) + '...)' : 'Not set');
console.log('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'Not set');
console.log('NEXT_PUBLIC_FIREBASE_PROJECT_ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'Not set');
console.log('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:', process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'Not set');
console.log('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:', process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || 'Not set');
console.log('NEXT_PUBLIC_FIREBASE_APP_ID:', process.env.NEXT_PUBLIC_FIREBASE_APP_ID || 'Not set');

// Check if .env.local exists
const fs = require('fs');
const path = require('path');
const envPath = path.join(process.cwd(), '.env.local');

console.log('\nChecking .env.local file:');
if (fs.existsSync(envPath)) {
  console.log('.env.local exists');
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    console.log('Content preview (first 100 chars):', envContent.substring(0, 100) + '...');
  } catch (error) {
    console.error('Error reading .env.local:', error);
  }
} else {
  console.log('.env.local does not exist');
}

// Check fallback config file
const fallbackPath = path.join(process.cwd(), 'src', 'lib', 'firebase-config-values.js');
console.log('\nChecking fallback config file:');
if (fs.existsSync(fallbackPath)) {
  console.log('firebase-config-values.js exists');
} else {
  console.log('firebase-config-values.js does not exist');
} 