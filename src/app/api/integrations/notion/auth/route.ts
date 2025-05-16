import { NextResponse } from 'next/server';
import { initializeFirebaseAdmin } from '@/lib/firebaseAdmin';
import { saveNotionConnection } from '@/utils/notionClient';
import { getAuth } from 'firebase-admin/auth';
import { cookies, headers } from 'next/headers';

// Notion OAuth configuration
// You'll need to register an integration at https://www.notion.so/my-integrations
const NOTION_CLIENT_ID = process.env.NOTION_CLIENT_ID || '';
const NOTION_CLIENT_SECRET = process.env.NOTION_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.NEXT_PUBLIC_URL ? `${process.env.NEXT_PUBLIC_URL}/api/integrations/notion/auth/callback` : '';

// Initiate Notion OAuth flow
export async function GET(request: Request) {
  try {
    // Generate a random state for CSRF protection
    const state = Math.random().toString(36).substring(2, 15);
    
    // Store the state in a cookie
    const response = NextResponse.redirect(
      `https://api.notion.com/v1/oauth/authorize?client_id=${NOTION_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&state=${state}`
    );
    
    response.cookies.set('notion_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
    });
    
    return response;
  } catch (error) {
    console.error('Error initiating Notion OAuth:', error);
    return NextResponse.json({ error: 'Failed to initiate Notion OAuth' }, { status: 500 });
  }
}

// Handle Notion OAuth callback
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, state } = body;
    
    // Get the state from the cookie
    const cookieStore = cookies();
    const storedState = cookieStore.get('notion_oauth_state')?.value;
    
    // Verify state to prevent CSRF attacks
    if (!storedState || state !== storedState) {
      return NextResponse.json({ error: 'Invalid state parameter' }, { status: 400 });
    }
    
    // Get user ID from authentication
    const headersList = headers();
    const authHeader = headersList.get('authorization');
    let userId = null;
    
    // Check for auth token
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const idToken = authHeader.split('Bearer ')[1];
      try {
        // Verify the Firebase token
        const auth = getAuth();
        const decodedToken = await auth.verifyIdToken(idToken);
        userId = decodedToken.uid;
      } catch (error) {
        console.error('Error verifying token:', error);
        return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
      }
    } 
    
    // If no auth header, try to get from cookies (for session-based auth)
    if (!userId) {
      const sessionCookie = cookieStore.get('session');
      
      if (sessionCookie) {
        try {
          const auth = getAuth();
          const decodedCookie = await auth.verifySessionCookie(sessionCookie.value);
          userId = decodedCookie.uid;
        } catch (error) {
          console.error('Error verifying session cookie:', error);
        }
      }
    }
    
    // If we still don't have a user ID, return unauthorized
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Exchange the code for an access token
    const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${NOTION_CLIENT_ID}:${NOTION_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Notion token exchange error:', errorData);
      return NextResponse.json({ error: 'Failed to exchange code for token' }, { status: 400 });
    }
    
    const tokenData = await tokenResponse.json();
    
    // Save the connection to Firestore
    await saveNotionConnection({
      accessToken: tokenData.access_token,
      workspaceId: tokenData.workspace_id,
      workspaceName: tokenData.workspace_name,
      botId: tokenData.bot_id,
      userId,
    });
    
    // Clear the state cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set('notion_oauth_state', '', { maxAge: 0 });
    
    return response;
  } catch (error) {
    console.error('Error handling Notion OAuth callback:', error);
    return NextResponse.json({ error: 'Failed to complete Notion OAuth' }, { status: 500 });
  }
} 