# Firebase Configuration Setup

This document provides instructions for setting up Firebase configuration for the Spaced Recall UI application.

## Firebase Configuration Issue

The application was experiencing issues with Firebase initialization, showing errors like:
- "Firebase: Invalid configuration. Using mock objects"
- "Cannot read properties of undefined (reading 'create')"

These issues have been resolved by implementing a more robust Firebase initialization process.

## Solution Implemented

1. **Fallback Configuration**: A fallback configuration has been added in `src/lib/firebase-config-values.js` to ensure Firebase can initialize even if environment variables fail to load.

2. **Improved Validation**: The Firebase initialization code now better validates configuration values and gracefully falls back to the hardcoded configuration when needed.

3. **Enhanced Error Handling**: Better error handling has been added to provide clearer messages when Firebase fails to initialize.

4. **Manual Initialization Function**: A new `initializeFirebase()` function has been added that can be called to manually trigger Firebase initialization.

## How to Set Up Firebase Configuration

There are two ways to set up Firebase configuration:

### Option 1: Using Environment Variables (Recommended)

1. Create a `.env.local` file in the project root with the following content:

```
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Optional settings
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false
NEXT_DISABLE_PRERENDER=true
```

2. Replace the placeholder values with your actual Firebase project details.

3. You can run `node check-env.js` to verify that your environment variables are loaded correctly.

### Option 2: Using the Configuration Script

1. Run `node firebase-config.js` to automatically set up the Firebase configuration.

2. This script will:
   - Create a `.env.local` file with the Firebase configuration
   - Create a fallback configuration file at `src/lib/firebase-config-values.js`

## Verifying the Configuration

You can verify that Firebase is initialized correctly by running:

```
node test-firebase.js
```

This script will attempt to initialize Firebase and report any errors.

## Troubleshooting

If you're still experiencing Firebase initialization issues:

1. Check that your Firebase project is properly set up and the configuration values are correct.

2. Verify that the environment variables are being loaded correctly by running `node check-env.js`.

3. Try using the fallback configuration by editing `src/lib/firebase-config-values.js` with your Firebase project details.

4. Look for error messages in the browser console that might provide more details about the initialization failure.

5. Make sure you're not trying to access Firebase services before they're initialized. The application now includes checks to prevent this, but it's good practice to verify that Firebase is initialized before using it.

## Additional Resources

- [Firebase Web Documentation](https://firebase.google.com/docs/web/setup)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables) 