import { NextResponse } from 'next/server';
import { NotionSyncOptions } from '@/types/sync';
import { syncWithNotion } from '@/utils/notionSyncUtils';
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
    
    // Parse request body
    const options: NotionSyncOptions = await request.json();
    
    // Validate required fields
    if (!options.subjectId) {
      return NextResponse.json({ error: 'Subject ID is required' }, { status: 400 });
    }
    
    if (!options.direction) {
      return NextResponse.json({ error: 'Sync direction is required' }, { status: 400 });
    }
    
    if (!options.conflictResolution) {
      return NextResponse.json({ error: 'Conflict resolution strategy is required' }, { status: 400 });
    }
    
    // Verify the subject belongs to the user
    const db = initializeFirebaseAdmin();
    const subjectDoc = await db.collection('subjects').doc(options.subjectId).get();
    
    if (!subjectDoc.exists) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }
    
    const subject = subjectDoc.data();
    
    if (subject.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized access to subject' }, { status: 403 });
    }
    
    // Perform sync
    const result = await syncWithNotion(options.subjectId, options, userId);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error syncing with Notion:', error);
    return NextResponse.json({ error: 'Failed to sync with Notion' }, { status: 500 });
  }
} 