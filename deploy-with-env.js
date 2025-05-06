// deploy-with-env.js - Deploy to Vercel with explicit environment variables
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting deployment with explicit environment variables...');

// Create a minimal vercel.json
const vercelConfig = {
  buildCommand: "npm run build-vercel"
};

fs.writeFileSync('vercel.json', JSON.stringify(vercelConfig, null, 2));
console.log('Created minimal vercel.json');

// Placeholder values for environment variables
const envVars = {
  NEXT_PUBLIC_FIREBASE_API_KEY: 'placeholder-api-key',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'placeholder-auth-domain',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'placeholder-project-id',
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'placeholder-storage-bucket',
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: 'placeholder-messaging-sender-id',
  NEXT_PUBLIC_FIREBASE_APP_ID: 'placeholder-app-id',
  NEXT_DISABLE_PRERENDER: 'true',
  NEXT_SKIP_INITIAL_SETUP: '1',
  NEXT_PUBLIC_BUILD_ENV: 'vercel'
};

// Build the environment variable arguments for the Vercel CLI
const envArgs = Object.entries(envVars)
  .map(([key, value]) => `-e ${key}="${value}"`)
  .join(' ');

// Deploy using the Vercel CLI with explicit environment variables
console.log('Deploying to Vercel with explicit environment variables...');
try {
  const deployCommand = `vercel deploy --prod --yes ${envArgs}`;
  console.log(`Running command: ${deployCommand}`);
  execSync(deployCommand, { stdio: 'inherit' });
  console.log('Deployment successful!');
} catch (error) {
  console.error('Deployment failed:', error.message);
  process.exit(1);
} 