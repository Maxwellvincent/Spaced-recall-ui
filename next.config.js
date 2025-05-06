/** @type {import('next').NextConfig} */
const nextConfig = {
  // Force dynamic rendering for all pages
  output: 'standalone',
  distDir: '.next',
  
  // Skip type checking and linting during build
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Disable static optimization
  experimental: {
    serverComponentsExternalPackages: ['firebase-admin'],
  },
  
  // Set a timeout for static page generation
  staticPageGenerationTimeout: 120,
  
  // Webpack configuration to handle client-side fallbacks
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        child_process: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    NEXT_DISABLE_PRERENDER: '1',
    NEXT_SKIP_INITIAL_SETUP: '1',
  },
  
  // Force all pages to be server-side rendered
  reactStrictMode: true,
  swcMinify: true,
};

module.exports = nextConfig; 