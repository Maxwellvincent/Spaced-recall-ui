import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { cookies } from 'next/headers';
import { getAuth } from 'firebase-admin/auth';
import { initializeFirebaseAdmin } from '@/lib/firebase-admin';

// Mark route as dynamic to prevent static generation errors
export const dynamic = 'force-dynamic';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.NEXTAUTH_URL + '/api/auth/callback/google'
);

export async function POST(req: Request) {
  try {
    // Get the session cookie to identify the user
    const sessionCookie = cookies().get('__session')?.value;
    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Initialize Firebase Admin and verify the session
    await initializeFirebaseAdmin();
    const decodedClaims = await getAuth().verifySessionCookie(sessionCookie);
    
    if (!decodedClaims.email) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { title, description, startDate, durationMinutes = 30 } = body;

    if (!title || !startDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get the user's access token
    // This would need to be retrieved from your database where you stored it
    // during the Google Calendar authorization flow
    // For now, we'll return an error
    return NextResponse.json(
      { error: 'Calendar integration not fully implemented' },
      { status: 501 }
    );

    // Rest of the implementation would go here...
  } catch (error) {
    console.error('Error adding calendar event:', error);
    return NextResponse.json(
      { error: 'Failed to add event to calendar' },
      { status: 500 }
    );
  }
} 