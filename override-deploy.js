// override-deploy.js - Deploy using vercel-override.json
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting override deployment...');

// Ensure Vercel CLI is installed
try {
  execSync('vercel --version', { stdio: 'ignore' });
  console.log('Vercel CLI is installed');
} catch (error) {
  console.log('Installing Vercel CLI...');
  execSync('npm install -g vercel', { stdio: 'inherit' });
}

// Rename any existing vercel.json to vercel.json.backup
if (fs.existsSync('vercel.json')) {
  fs.renameSync('vercel.json', 'vercel.json.backup');
  console.log('Renamed existing vercel.json to vercel.json.backup');
}

// Copy vercel-override.json to vercel.json
fs.copyFileSync('vercel-override.json', 'vercel.json');
console.log('Copied vercel-override.json to vercel.json');

// Create a .env.local file with placeholder values
const envContent = `
NEXT_PUBLIC_FIREBASE_API_KEY=placeholder-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=placeholder-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=placeholder-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=placeholder-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=placeholder-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=placeholder-app-id
NEXT_DISABLE_PRERENDER=true
NEXT_SKIP_INITIAL_SETUP=1
NEXT_PUBLIC_BUILD_ENV=vercel
`;

fs.writeFileSync('.env.local', envContent);
console.log('Created .env.local with placeholder values');

// Deploy with environment variables
console.log('Deploying with override configuration...');
try {
  // Build the environment variable arguments
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
  
  const envArgs = Object.entries(envVars)
    .map(([key, value]) => `-e ${key}="${value}"`)
    .join(' ');
  
  // Deploy with --force to override any existing configuration
  const deployCommand = `vercel deploy --prod --yes --force ${envArgs}`;
  console.log(`Running command: ${deployCommand}`);
  execSync(deployCommand, { stdio: 'inherit' });
  
  console.log('Deployment successful!');
} catch (error) {
  console.error('Deployment failed:', error.message);
} finally {
  // Restore original vercel.json if it existed
  if (fs.existsSync('vercel.json.backup')) {
    fs.renameSync('vercel.json.backup', 'vercel.json');
    console.log('Restored original vercel.json');
  } else {
    // Otherwise remove the temporary vercel.json
    fs.unlinkSync('vercel.json');
    console.log('Removed temporary vercel.json');
  }
} 