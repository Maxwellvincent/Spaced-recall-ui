# Environment Variables Setup

This document explains how to set up environment variables for this project.

## Required Environment Variables

### Firebase Client SDK Configuration
These variables are needed for client-side Firebase functionality:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### Firebase Admin SDK Configuration
These variables are needed for server-side Firebase operations:

```
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email@your_project_id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour Private Key Here\n-----END PRIVATE KEY-----\n"
```

### Next.js Build Configuration
These variables control how Next.js builds and renders pages:

```
NEXT_DISABLE_PRERENDER=true
NEXT_SKIP_INITIAL_SETUP=1
NEXT_PUBLIC_BUILD_ENV=development
```

## Setting Up Environment Variables

### Local Development
1. Create a `.env.local` file in the root of the project
2. Add the variables listed above with your actual values
3. Restart your development server if it's running

### Vercel Deployment
1. Go to your Vercel project dashboard
2. Navigate to Settings > Environment Variables
3. Add each variable with its corresponding value
4. Make sure to add them to all environments (Production, Preview, Development)

## Important Notes

- Never commit your actual `.env` or `.env.local` files to version control
- The `.env.example` file is a template and should not contain real secrets
- For the `FIREBASE_PRIVATE_KEY`, make sure to include the entire key including the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` parts
- When adding the private key to Vercel, you may need to replace newlines with `\n` characters 