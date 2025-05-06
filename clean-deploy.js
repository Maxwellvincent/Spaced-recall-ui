// clean-deploy.js - Clean deployment script that removes temporary files
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting clean deployment...');

// Files to temporarily rename during deployment
const filesToRename = [
  '.env',
  '.env.local',
  'vercel.json',
  'setup-env.js',
  'deploy.js',
  'deploy-with-env.js',
  'direct-deploy.js',
  'override-deploy.js',
  'vercel-build.js',
  'vercel-override.json'
];

// Keep track of renamed files to restore them later
const renamedFiles = [];

try {
  // Rename files to avoid conflicts
  console.log('Temporarily renaming files...');
  filesToRename.forEach(file => {
    if (fs.existsSync(file)) {
      const backupName = `${file}.backup`;
      fs.renameSync(file, backupName);
      renamedFiles.push(file);
      console.log(`Renamed ${file} to ${backupName}`);
    }
  });

  // Create a minimal vercel.json
  console.log('Creating minimal vercel.json...');
  const minimalConfig = {
    buildCommand: "next build"
  };
  fs.writeFileSync('vercel.json', JSON.stringify(minimalConfig, null, 2));

  // Environment variables to pass directly to the CLI
  const envVars = {
    NEXT_PUBLIC_FIREBASE_API_KEY: 'AIzaSyBHeQv1dm5yZh4tlmkDTznQqcO9cgsDwIk',
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'spacedrecallapp-e142c.firebaseapp.com',
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'spacedrecallapp-e142c',
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'spacedrecallapp-e142c.firebasestorage.app',
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '1034168752304',
    NEXT_PUBLIC_FIREBASE_APP_ID: '1:1034168752304:web:363d6db135bc02aa4b0375',
    NEXT_DISABLE_PRERENDER: 'true'
  };

  // Build the environment variable arguments
  const envArgs = Object.entries(envVars)
    .map(([key, value]) => `-e ${key}="${value}"`)
    .join(' ');

  // Deploy with --force to override any existing configuration
  console.log('Deploying with clean configuration...');
  const deployCommand = `vercel deploy --prod --yes --force ${envArgs}`;
  console.log(`Running command: ${deployCommand}`);
  execSync(deployCommand, { stdio: 'inherit' });

  console.log('Deployment successful!');
} catch (error) {
  console.error('Deployment failed:', error.message);
} finally {
  // Clean up temporary vercel.json
  if (!renamedFiles.includes('vercel.json') && fs.existsSync('vercel.json')) {
    fs.unlinkSync('vercel.json');
    console.log('Removed temporary vercel.json');
  }

  // Restore renamed files
  console.log('Restoring renamed files...');
  renamedFiles.forEach(file => {
    const backupName = `${file}.backup`;
    if (fs.existsSync(backupName)) {
      fs.renameSync(backupName, file);
      console.log(`Restored ${file}`);
    }
  });
} 