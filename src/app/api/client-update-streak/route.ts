import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseDb } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  console.log("Client API: update-streak endpoint called");
  
  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
      console.log("Client API: Request body parsed:", body);
    } catch (parseError) {
      console.error("Client API: Error parsing request body:", parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    const { userId, streak, highestStreak } = body;
    
    // Validate userId
    if (!userId) {
      console.error("Client API: Missing userId in request");
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    console.log(`Client API: Processing streak update for user ${userId}`);
    
    // Get Firestore instance
    const db = getFirebaseDb();
    if (!db) {
      console.error("Client API: Failed to get Firestore instance");
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }
    
    // Get user document
    const userRef = doc(db, 'users', userId);
    let userDoc;
    
    try {
      userDoc = await getDoc(userRef);
      console.log(`Client API: User document exists: ${userDoc.exists()}`);
    } catch (docError) {
      console.error("Client API: Error fetching user document:", docError);
      return NextResponse.json(
        { error: 'Failed to fetch user document' },
        { status: 500 }
      );
    }
    
    if (!userDoc.exists()) {
      console.error(`Client API: User not found with ID ${userId}`);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Prepare update data
    const updateData = {
      lastLogin: new Date().toISOString()
    };
    
    // Only update streak if provided
    if (typeof streak === 'number') {
      updateData.currentStreak = streak;
    }
    
    // Only update highest streak if provided
    if (typeof highestStreak === 'number') {
      updateData.highestStreak = highestStreak;
    } else if (typeof streak === 'number') {
      // If only streak is provided, ensure highestStreak is at least as high
      const currentHighest = userDoc.data().highestStreak || 0;
      updateData.highestStreak = Math.max(currentHighest, streak);
    }
    
    console.log("Client API: Updating user document with data:", updateData);
    
    // Update the user document
    try {
      await updateDoc(userRef, updateData);
      console.log("Client API: User document updated successfully");
    } catch (updateError) {
      console.error("Client API: Error updating user document:", updateError);
      return NextResponse.json(
        { error: 'Failed to update user document' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Streak updated successfully',
      updatedFields: updateData
    });
    
  } catch (error) {
    console.error('Client API: Unhandled error in update-streak:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update streak' },
      { status: 500 }
    );
  }
} 