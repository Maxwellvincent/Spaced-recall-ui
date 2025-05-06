// direct-deploy.js - Script to deploy directly to Vercel using their API
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting direct deployment to Vercel...');

// Ensure Vercel CLI is installed
try {
  execSync('vercel --version', { stdio: 'ignore' });
  console.log('Vercel CLI is installed');
} catch (error) {
  console.log('Installing Vercel CLI...');
  execSync('npm install -g vercel', { stdio: 'inherit' });
}

// Create a vercel.json file that doesn't use secret references
const vercelConfig = {
  buildCommand: "npm run build-vercel"
};

fs.writeFileSync('vercel.json', JSON.stringify(vercelConfig, null, 2));
console.log('Created minimal vercel.json');

// Create a .env file with placeholder values
// You'll need to set the actual environment variables in the Vercel dashboard
const envContent = `
# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=placeholder
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=placeholder
NEXT_PUBLIC_FIREBASE_PROJECT_ID=placeholder
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=placeholder
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=placeholder
NEXT_PUBLIC_FIREBASE_APP_ID=placeholder

# Firebase Admin SDK
FIREBASE_PROJECT_ID=placeholder
FIREBASE_CLIENT_EMAIL=placeholder
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nplaceholder\\n-----END PRIVATE KEY-----\\n"

# Build settings
NEXT_DISABLE_PRERENDER=true
NEXT_SKIP_INITIAL_SETUP=1
NEXT_PUBLIC_BUILD_ENV=vercel
`;

fs.writeFileSync('.env.local', envContent);
console.log('Created .env.local with placeholder values');

// Deploy to Vercel
console.log('Deploying to Vercel...');
try {
  // Use --prod to deploy to production
  // Use --yes to skip confirmation prompts
  execSync('vercel deploy --prod --yes', { stdio: 'inherit' });
  console.log('Deployment successful!');
} catch (error) {
  console.error('Deployment failed:', error.message);
  process.exit(1);
} 