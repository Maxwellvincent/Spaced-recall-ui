import { NextResponse } from 'next/server';
import { ObsidianSyncOptions } from '@/types/sync';
import { syncWithObsidian, pushSubjectToObsidian } from '@/utils/obsidianSyncUtils';
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
    
    // For Obsidian, we need to handle multipart form data
    // Check if this is a push-only request (no files uploaded)
    const contentType = headersList.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      // This is a push-only request
      const options: ObsidianSyncOptions = await request.json();
      
      // Validate required fields
      if (!options.subjectId) {
        return NextResponse.json({ error: 'Subject ID is required' }, { status: 400 });
      }
      
      if (options.direction !== 'push') {
        return NextResponse.json({ error: 'JSON requests only support push direction' }, { status: 400 });
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
      
      // Push to Obsidian and get the zip file
      const { syncRecord, zipBuffer } = await pushSubjectToObsidian(
        { id: options.subjectId, ...subject },
        options,
        userId
      );
      
      // Return the zip file
      return new NextResponse(zipBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${subject.name.replace(/[/\\?%*:|"<>]/g, '-')}.zip"`,
        },
      });
    } else {
      // This is a multipart form request (likely with files for pull)
      const formData = await request.formData();
      
      // Get the options
      const optionsJson = formData.get('options') as string;
      
      if (!optionsJson) {
        return NextResponse.json({ error: 'Sync options are required' }, { status: 400 });
      }
      
      const options: ObsidianSyncOptions = JSON.parse(optionsJson);
      
      // Validate required fields
      if (!options.subjectId) {
        return NextResponse.json({ error: 'Subject ID is required' }, { status: 400 });
      }
      
      // Get the uploaded files
      const files = formData.getAll('files') as File[];
      
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
      const result = await syncWithObsidian(options.subjectId, options, userId, files);
      
      return NextResponse.json(result);
    }
  } catch (error) {
    console.error('Error syncing with Obsidian:', error);
    return NextResponse.json({ error: 'Failed to sync with Obsidian' }, { status: 500 });
  }
} 