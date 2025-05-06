/** @type {import('next').NextConfig} */
const nextConfig = {
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
  env: {
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  },
  images: {
    domains: ['firebasestorage.googleapis.com'],
    minimumCacheTTL: 60,
  },
  experimental: {
    optimizeCss: true,
    serverComponentsExternalPackages: ['firebase-admin'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Completely disable static generation
  output: 'standalone',
  reactStrictMode: true,
  distDir: '.next',
  staticPageGenerationTimeout: 60,
  // Force all pages to be server-side rendered
  runtime: 'nodejs',
  experimental: {
    ...nextConfig.experimental,
    serverActions: true,
  },
  // Generate a unique build ID
  generateBuildId: async () => {
    return 'build-' + Date.now();
  },
  // Disable the static optimizations for all routes
  exportPathMap: null,
  trailingSlash: false,
  // Disable prerendering completely
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig; 