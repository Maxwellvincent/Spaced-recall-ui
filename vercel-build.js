// vercel-build.js - Special build script for Vercel deployments
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Log with timestamps
const log = (message) => {
  console.log(`[${new Date().toISOString()}] ${message}`);
};

log('Starting Vercel deployment build script');

// Set environment variables to skip prerendering
process.env.NEXT_DISABLE_PRERENDER = 'true';
process.env.NEXT_SKIP_INITIAL_SETUP = '1';
process.env.NODE_ENV = 'production';
process.env.NEXT_PUBLIC_BUILD_ENV = 'vercel';

try {
  // Print environment info for debugging
  log('Environment information:');
  log(`Node version: ${process.version}`);
  log(`VERCEL: ${process.env.VERCEL}`);
  log(`VERCEL_ENV: ${process.env.VERCEL_ENV}`);
  log(`VERCEL_GIT_COMMIT_SHA: ${process.env.VERCEL_GIT_COMMIT_SHA}`);
  log(`VERCEL_GIT_COMMIT_REF: ${process.env.VERCEL_GIT_COMMIT_REF}`);
  
  // Create a special next.config.js for Vercel build
  log('Creating Vercel-specific Next.js config...');
  const configPath = path.join(process.cwd(), 'next.config.js');
  const backupPath = path.join(process.cwd(), 'next.config.backup.js');
  
  // Backup original config
  if (fs.existsSync(configPath)) {
    fs.copyFileSync(configPath, backupPath);
    log('Original config backed up');
  }
  
  // Create Vercel-specific config
  const vercelConfig = `
// Vercel-specific Next.js config
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  distDir: '.next',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['firebase-admin'],
  },
  staticPageGenerationTimeout: 300,
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    NEXT_DISABLE_PRERENDER: '1',
    NEXT_SKIP_INITIAL_SETUP: '1',
    NEXT_PUBLIC_BUILD_ENV: 'vercel',
  },
  // Force all pages to be server-side rendered
  reactStrictMode: true,
  swcMinify: true,
};

module.exports = nextConfig;
  `;
  
  fs.writeFileSync(configPath, vercelConfig);
  log('Vercel-specific config created');
  
  // Run the Next.js build
  log('Running Next.js build with prerendering disabled...');
  execSync('npx next build', {
    stdio: 'inherit',
    env: {
      ...process.env,
      NEXT_DISABLE_PRERENDER: '1',
      NEXT_SKIP_INITIAL_SETUP: '1',
      NEXT_PUBLIC_BUILD_ENV: 'vercel',
      NODE_OPTIONS: '--max_old_space_size=4096'
    }
  });
  
  // Restore original config
  if (fs.existsSync(backupPath)) {
    fs.copyFileSync(backupPath, configPath);
    fs.unlinkSync(backupPath);
    log('Original config restored');
  }
  
  log('Vercel build completed successfully!');
} catch (error) {
  log(`Vercel build error: ${error.message}`);
  
  // Try to restore the config even if build fails
  const configPath = path.join(process.cwd(), 'next.config.js');
  const backupPath = path.join(process.cwd(), 'next.config.backup.js');
  
  if (fs.existsSync(backupPath)) {
    try {
      fs.copyFileSync(backupPath, configPath);
      fs.unlinkSync(backupPath);
      log('Original config restored after error');
    } catch (restoreError) {
      log(`Failed to restore config: ${restoreError.message}`);
    }
  }
  
  process.exit(1);
} 