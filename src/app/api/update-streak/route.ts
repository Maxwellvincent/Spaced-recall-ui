import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore, initializeFirebaseAdmin } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  console.log("API: update-streak endpoint called");
  
  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
      console.log("API: Request body parsed:", body);
    } catch (parseError) {
      console.error("API: Error parsing request body:", parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    const { userId, streak, highestStreak } = body;
    
    // Validate userId
    if (!userId) {
      console.error("API: Missing userId in request");
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    console.log(`API: Processing streak update for user ${userId}`);
    
    // Initialize Firebase Admin
    let db;
    try {
      const result = await initializeFirebaseAdmin();
      db = result.db;
      if (!db) {
        throw new Error("Failed to get Firestore instance");
      }
      console.log("API: Firebase Admin initialized successfully");
    } catch (initError) {
      console.error("API: Failed to initialize Firebase Admin:", initError);
      return NextResponse.json(
        { error: `Failed to initialize database connection: ${initError.message}` },
        { status: 500 }
      );
    }
    
    // Get user document
    try {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      
      console.log(`API: User document exists: ${userDoc.exists}`);
      
      if (!userDoc.exists) {
        console.error(`API: User not found with ID ${userId}`);
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
        const userData = userDoc.data();
        const currentHighest = userData?.highestStreak || 0;
        updateData.highestStreak = Math.max(currentHighest, streak);
      }
      
      console.log("API: Updating user document with data:", updateData);
      
      // Update the user document
      await userRef.update(updateData);
      console.log("API: User document updated successfully");
      
      return NextResponse.json({
        success: true,
        message: 'Streak updated successfully',
        updatedFields: updateData
      });
      
    } catch (dbError) {
      console.error("API: Database operation failed:", dbError);
      return NextResponse.json(
        { error: `Database operation failed: ${dbError.message}` },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('API: Unhandled error in update-streak:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update streak' },
      { status: 500 }
    );
  }
} 