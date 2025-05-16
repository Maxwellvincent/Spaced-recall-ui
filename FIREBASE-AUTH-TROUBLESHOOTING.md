# Firebase Authentication Troubleshooting Guide

## Fixing "auth/configuration-not-found" Error

If you're encountering the `auth/configuration-not-found` error when trying to use Firebase Authentication, follow these steps to resolve the issue:

## Quick Fix

Run the fix script to automatically update your Firebase configuration:

```bash
node fix-auth-config-error.js
```

Then restart your Next.js development server:

```bash
npm run dev
```

## Manual Fix Steps

If the quick fix doesn't resolve the issue, follow these manual steps:

### 1. Check Firebase Project Configuration

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project (e.g., `spacedrecallapp-e142c`)
3. Go to **Authentication** > **Sign-in method**
4. Make sure at least one sign-in provider (e.g., Google, Email/Password) is enabled
5. For Google authentication, make sure you've completed the OAuth consent screen setup in Google Cloud Console

### 2. Add Authorized Domains

1. In the Firebase Console, go to **Authentication** > **Settings** > **Authorized domains**
2. Make sure `localhost` is in the list of authorized domains
3. If not, click **Add domain** and add `localhost`

### 3. Check API Key Configuration

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Navigate to **APIs & Services** > **Credentials**
4. Find your API key and check its restrictions
5. Make sure the following APIs are enabled:
   - Identity Toolkit API (identitytoolkit.googleapis.com)
   - Token Service API (securetoken.googleapis.com)
6. If the API key has domain restrictions, make sure your development domain is allowed

### 4. Update Environment Variables

Make sure your `.env.local` file has the correct Firebase configuration:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 5. Update Fallback Configuration

Make sure the fallback configuration in `src/lib/firebase-config-values.js` matches your Firebase project:

```javascript
export const firebaseConfig = {
  apiKey: "your_api_key",
  authDomain: "your_project_id.firebaseapp.com",
  projectId: "your_project_id",
  storageBucket: "your_project_id.appspot.com",
  messagingSenderId: "your_messaging_sender_id",
  appId: "your_app_id"
};
```

## Testing Your Configuration

After making these changes, you can test your Firebase configuration with:

```bash
node check-auth-config.js
```

If the test is successful, restart your Next.js development server:

```bash
npm run dev
```

## Still Having Issues?

If you're still encountering the `auth/configuration-not-found` error, try these additional steps:

1. Create a new API key in the Google Cloud Console
2. Update your `.env.local` file with the new API key
3. Run `node update-firebase-config.js your_new_api_key` to update your configuration
4. Clear your browser cache and cookies
5. Restart your development server

If the issue persists, check the browser console for more detailed error messages that might help identify the specific problem. 