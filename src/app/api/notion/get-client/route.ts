import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebaseAdmin } from '@/lib/firebaseAdmin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: NextRequest) {
  try {
    // Get the session to verify the user
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get userId from query params
    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    // Verify that the authenticated user is requesting their own data
    if (session.user.id !== userId) {
      return NextResponse.json({ error: 'Unauthorized access to user data' }, { status: 403 });
    }

    // Initialize Firebase Admin and get the Firestore instance
    const db = initializeFirebaseAdmin();
    
    // Query for the user's Notion connection
    const connectionQuery = await db.collection('notionConnections')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    
    if (connectionQuery.empty) {
      return NextResponse.json({ error: 'No Notion connection found' }, { status: 404 });
    }
    
    const connection = connectionQuery.docs[0].data();
    
    return NextResponse.json({
      accessToken: connection.accessToken,
      workspaceId: connection.workspaceId,
      workspaceName: connection.workspaceName
    });
  } catch (error) {
    console.error('Error in get-client API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 