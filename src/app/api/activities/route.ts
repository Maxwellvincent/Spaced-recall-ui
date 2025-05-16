import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getFirebaseDb } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, query, where, setDoc, updateDoc, deleteDoc, addDoc } from "firebase/firestore";
import { Activity, Habit, Todo, Project } from "@/types/activities";
import { calculateActivityStats } from "@/utils/activityUtils";
import { v4 as uuidv4 } from "uuid";

// GET /api/activities - Get all activities for the current user
export async function GET(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession();
    if (!session?.user?.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.uid;
    const type = request.nextUrl.searchParams.get("type");
    const db = getFirebaseDb();

    // Query activities collection
    const activitiesRef = collection(db, "activities");
    let q;

    if (type && ["habit", "todo", "project"].includes(type)) {
      q = query(activitiesRef, where("userId", "==", userId), where("type", "==", type));
    } else {
      q = query(activitiesRef, where("userId", "==", userId));
    }

    const snapshot = await getDocs(q);
    const activities: Activity[] = [];

    snapshot.forEach((doc) => {
      activities.push({ id: doc.id, ...doc.data() } as Activity);
    });

    // Calculate stats
    const stats = calculateActivityStats(activities);

    return NextResponse.json({ activities, stats });
  } catch (error) {
    console.error("Error fetching activities:", error);
    return NextResponse.json({ error: "Failed to fetch activities" }, { status: 500 });
  }
}

// POST /api/activities - Create a new activity
export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession();
    if (!session?.user?.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.uid;
    const data = await request.json();
    
    if (!data.type || !["habit", "todo", "project"].includes(data.type)) {
      return NextResponse.json({ error: "Invalid activity type" }, { status: 400 });
    }

    if (!data.name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Create activity with common fields
    const activityBase = {
      id: uuidv4(),
      userId,
      createdAt: new Date().toISOString(),
      xp: 0,
      completedCount: 0,
      streak: 0,
      ...data,
    };

    // Add type-specific defaults
    let activity: Activity;
    
    switch (data.type) {
      case "habit":
        activity = {
          ...activityBase,
          type: "habit",
          frequency: data.frequency || "daily",
          difficulty: data.difficulty || "medium",
          completionHistory: [],
          currentStreak: 0,
          bestStreak: 0,
        } as Habit;
        break;
        
      case "todo":
        activity = {
          ...activityBase,
          type: "todo",
          status: "pending",
          priority: data.priority || "medium",
          difficulty: data.difficulty || "medium",
          subtasks: data.subtasks || [],
        } as Todo;
        break;
        
      case "project":
        activity = {
          ...activityBase,
          type: "project",
          status: "planning",
          priority: data.priority || "medium",
          progress: 0,
          todos: [],
          milestones: data.milestones || [],
        } as Project;
        break;
        
      default:
        return NextResponse.json({ error: "Invalid activity type" }, { status: 400 });
    }

    // Save to Firestore
    const db = getFirebaseDb();
    const activityRef = doc(db, "activities", activity.id);
    await setDoc(activityRef, activity);

    return NextResponse.json({ activity });
  } catch (error) {
    console.error("Error creating activity:", error);
    return NextResponse.json({ error: "Failed to create activity" }, { status: 500 });
  }
}

// PATCH /api/activities - Update an activity
export async function PATCH(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession();
    if (!session?.user?.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.uid;
    const data = await request.json();
    
    if (!data.id) {
      return NextResponse.json({ error: "Activity ID is required" }, { status: 400 });
    }

    // Get the existing activity
    const db = getFirebaseDb();
    const activityRef = doc(db, "activities", data.id);
    const activityDoc = await getDoc(activityRef);

    if (!activityDoc.exists()) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    const existingActivity = activityDoc.data() as Activity;
    
    // Verify ownership
    if (existingActivity.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Update fields (excluding certain protected fields)
    const protectedFields = ["id", "userId", "type", "createdAt"];
    const updates = Object.entries(data)
      .filter(([key]) => !protectedFields.includes(key))
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

    await updateDoc(activityRef, updates);

    // Get updated activity
    const updatedDoc = await getDoc(activityRef);
    const updatedActivity = { id: updatedDoc.id, ...updatedDoc.data() } as Activity;

    return NextResponse.json({ activity: updatedActivity });
  } catch (error) {
    console.error("Error updating activity:", error);
    return NextResponse.json({ error: "Failed to update activity" }, { status: 500 });
  }
}

// DELETE /api/activities?id=xxx - Delete an activity
export async function DELETE(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession();
    if (!session?.user?.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.uid;
    const activityId = request.nextUrl.searchParams.get("id");
    
    if (!activityId) {
      return NextResponse.json({ error: "Activity ID is required" }, { status: 400 });
    }

    // Get the existing activity
    const db = getFirebaseDb();
    const activityRef = doc(db, "activities", activityId);
    const activityDoc = await getDoc(activityRef);

    if (!activityDoc.exists()) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    const existingActivity = activityDoc.data() as Activity;
    
    // Verify ownership
    if (existingActivity.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Delete the activity
    await deleteDoc(activityRef);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting activity:", error);
    return NextResponse.json({ error: "Failed to delete activity" }, { status: 500 });
  }
} 