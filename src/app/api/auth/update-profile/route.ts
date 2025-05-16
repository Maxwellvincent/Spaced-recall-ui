import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export async function POST(request: NextRequest) {
  try {
    // Get the current session to verify the user
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the request body
    const { displayName } = await request.json();
    
    if (!displayName) {
      return NextResponse.json({ error: 'Display name is required' }, { status: 400 });
    }
    
    // Find the user by email
    const userRecord = await auth.getUserByEmail(session.user.email);
    
    // Update the user's display name
    await auth.updateUser(userRecord.uid, {
      displayName
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
} 