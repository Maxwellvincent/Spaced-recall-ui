import { NextResponse } from 'next/server';
import { initializeFirebaseAdmin } from '@/lib/firebaseAdmin';
import { getAuth } from 'firebase-admin/auth';
import { cookies, headers } from 'next/headers';

export async function POST(request: Request) {
  try {
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
      const cookieStore = cookies();
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
    
    // Delete all Notion connections for the user
    const db = initializeFirebaseAdmin();
    const connectionsSnapshot = await db.collection('notionConnections')
      .where('userId', '==', userId)
      .get();
    
    if (!connectionsSnapshot.empty) {
      const batch = db.batch();
      
      connectionsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting from Notion:', error);
    return NextResponse.json({ error: 'Failed to disconnect from Notion' }, { status: 500 });
  }
} 