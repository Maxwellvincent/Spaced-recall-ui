import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { cookies } from 'next/headers';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase-admin/auth';
import { initAdmin } from '@/lib/firebase-admin';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/google/calendar/callback`
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    
    if (!code) {
      throw new Error('No authorization code received');
    }

    // Get tokens from Google
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get the session cookie to identify the user
    const sessionCookie = cookies().get('__session')?.value;
    if (!sessionCookie) {
      throw new Error('No session cookie found');
    }

    // Initialize Firebase Admin and verify the session
    const admin = await initAdmin();
    const decodedClaims = await getAuth().verifySessionCookie(sessionCookie);
    
    // Store tokens in Firestore
    const userRef = doc(db, 'users', decodedClaims.uid);
    await updateDoc(userRef, {
      googleCalendarTokens: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiry: tokens.expiry_date
      },
      updatedAt: new Date().toISOString()
    });

    // Get the redirect URL and pending operations from cookies
    const redirectUrl = cookies().get('calendar_auth_redirect')?.value || '/';
    const pendingAdd = cookies().get('pending_calendar_add')?.value;
    const pendingSync = cookies().get('pending_calendar_sync')?.value;

    // Clean up cookies
    cookies().delete('calendar_auth_redirect');
    cookies().delete('pending_calendar_add');
    cookies().delete('pending_calendar_sync');

    // Construct the redirect URL with pending operations
    let finalRedirectUrl = redirectUrl;
    if (pendingAdd) {
      finalRedirectUrl += `?pendingAdd=${encodeURIComponent(pendingAdd)}`;
    } else if (pendingSync) {
      finalRedirectUrl += `?pendingSync=true`;
    }

    return NextResponse.redirect(new URL(finalRedirectUrl, process.env.NEXT_PUBLIC_BASE_URL));
  } catch (error) {
    console.error('Error in Google Calendar callback:', error);
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent('Failed to authenticate with Google Calendar')}`, 
      process.env.NEXT_PUBLIC_BASE_URL)
    );
  }
} 