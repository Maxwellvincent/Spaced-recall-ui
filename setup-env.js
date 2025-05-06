// setup-env.js - Script to set up environment variables before build
const fs = require('fs');
const path = require('path');

console.log('Setting up environment variables...');

// Create a .env.local file with environment variables
const envContent = `
NEXT_PUBLIC_FIREBASE_API_KEY=replace_with_your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=replace_with_your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=replace_with_your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=replace_with_your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=replace_with_your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=replace_with_your_app_id
FIREBASE_PROJECT_ID=replace_with_your_project_id
FIREBASE_CLIENT_EMAIL=replace_with_your_client_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nreplace_with_your_private_key\\n-----END PRIVATE KEY-----\\n"
NEXT_DISABLE_PRERENDER=true
NEXT_SKIP_INITIAL_SETUP=1
NEXT_PUBLIC_BUILD_ENV=vercel
`;

// Write the .env.local file
fs.writeFileSync(path.join(process.cwd(), '.env.local'), envContent);
console.log('.env.local file created');

// Also create a .env file for safety
fs.writeFileSync(path.join(process.cwd(), '.env'), envContent);
console.log('.env file created');

console.log('Environment setup complete'); 