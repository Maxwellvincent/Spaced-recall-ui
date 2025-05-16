# Enable Firebase Authentication - Step by Step Guide

## Issue: "auth/configuration-not-found" Error

This error occurs because Firebase Authentication is not properly configured for your project. Follow these steps to fix it:

## Step 1: Access Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `spacedrecallapp-e142c`
3. If the project doesn't exist, you'll need to create a new one with the same name or update your configuration files

## Step 2: Enable Authentication

1. In the Firebase Console, click on **Authentication** in the left sidebar
2. Click on the **Get Started** button if you haven't set up Authentication yet
3. If you've already set up Authentication, click on the **Sign-in method** tab

## Step 3: Enable Google Sign-in Method

1. In the **Sign-in method** tab, find **Google** in the list of providers
2. Click on the pencil icon to edit the Google provider
3. Toggle the **Enable** switch to ON
4. Enter a **Project support email** (your email address)
5. Click **Save**

## Step 4: Configure Authorized Domains

1. Still in Authentication, click on the **Settings** tab
2. Scroll down to the **Authorized domains** section
3. Make sure `localhost` is in the list
4. If not, click **Add domain** and add `localhost`
5. Click **Add**

## Step 5: Set Up OAuth Consent Screen

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Make sure your project (`spacedrecallapp-e142c`) is selected
3. Navigate to **APIs & Services** > **OAuth consent screen**
4. Select **External** user type (unless you have a Google Workspace)
5. Fill in the required information:
   - App name: Spaced Recall
   - User support email: Your email address
   - Developer contact information: Your email address
6. Click **Save and Continue**
7. Under **Scopes**, add the following scopes:
   - `email`
   - `profile`
8. Click **Save and Continue**
9. Under **Test users**, add your email address
10. Click **Save and Continue**
11. Review your settings and click **Back to Dashboard**

## Step 6: Enable Required APIs

1. In Google Cloud Console, go to **APIs & Services** > **Library**
2. Search for and enable these APIs:
   - **Identity Toolkit API**
   - **Token Service API**

## Step 7: Check API Key Configuration

1. In Google Cloud Console, go to **APIs & Services** > **Credentials**
2. Find your API key in the list
3. Click on the pencil icon to edit it
4. Make sure it has access to the Identity Toolkit API
5. If you're having issues, consider creating a new API key:
   - Click **Create Credentials** > **API key**
   - Copy the new key
   - Update your `.env.local` file with the new key

## Step 8: Update Your Local Configuration

1. Open your `.env.local` file
2. Make sure the Firebase configuration is correct:

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=spacedrecallapp-e142c.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=spacedrecallapp-e142c
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=spacedrecallapp-e142c.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

3. Run the update script to apply your changes:

```bash
node fix-auth-config-error.js
```

## Step 9: Restart Your Application

1. Stop your Next.js development server if it's running
2. Clear your browser cache (or use incognito mode)
3. Restart your Next.js server:

```bash
npm run dev
```

## Still Having Issues?

If you're still seeing the "auth/configuration-not-found" error:

1. Check the Firebase Console for any error messages or warnings
2. Verify that your project ID matches exactly what's in Firebase
3. Try creating a new API key and updating your configuration
4. Make sure you've completed all the OAuth consent screen steps
5. Check that you've enabled the Identity Toolkit API
6. Try using a different browser or incognito mode to rule out cache issues

## Need More Help?

If you're still experiencing issues after following these steps, please:

1. Run the diagnostic script again to see if the issue has changed:

```bash
node fix-configuration-not-found.js
```

2. Check the browser console for more detailed error messages
3. Look at the Firebase Authentication logs in the Firebase Console 