import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebaseAdmin } from '@/lib/firebaseAdmin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(request: NextRequest) {
  try {
    // Get the session to verify the user
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse the request body
    const connection = await request.json();
    
    // Verify that the authenticated user is saving their own data
    if (session.user.id !== connection.userId) {
      return NextResponse.json({ error: 'Unauthorized access to user data' }, { status: 403 });
    }

    // Initialize Firebase Admin and get the Firestore instance
    const db = initializeFirebaseAdmin();
    
    // Add timestamp fields
    const now = new Date();
    const connectionWithTimestamps = {
      ...connection,
      createdAt: now,
      updatedAt: now,
    };
    
    // Save the connection to Firestore
    const docRef = await db.collection('notionConnections').add(connectionWithTimestamps);
    
    return NextResponse.json({
      id: docRef.id,
      success: true
    });
  } catch (error) {
    console.error('Error in save-connection API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 