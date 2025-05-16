import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getFirebaseDb } from "@/lib/firebase";
import { doc, getDoc, updateDoc, runTransaction } from "firebase/firestore";
import { Activity, Habit, Todo, Project } from "@/types/activities";
import { completeHabit, completeTodo, updateProjectProgress, completeProjectMilestone } from "@/utils/activityUtils";
import { calculateStreak } from "@/utils/streakUtils";

// POST /api/activities/complete - Complete an activity and update user XP/streaks
export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession();
    if (!session?.user?.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.uid;
    const data = await request.json();
    
    if (!data.activityId) {
      return NextResponse.json({ error: "Activity ID is required" }, { status: 400 });
    }

    const db = getFirebaseDb();
    
    // Run as a transaction to ensure data consistency
    const result = await runTransaction(db, async (transaction) => {
      // Get the activity
      const activityRef = doc(db, "activities", data.activityId);
      const activityDoc = await transaction.get(activityRef);
      
      if (!activityDoc.exists()) {
        throw new Error("Activity not found");
      }
      
      const activity = { id: activityDoc.id, ...activityDoc.data() } as Activity;
      
      // Verify ownership
      if (activity.userId !== userId) {
        throw new Error("Unauthorized");
      }
      
      // Get user document to update XP and streaks
      const userRef = doc(db, "users", userId);
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists()) {
        throw new Error("User not found");
      }
      
      const userData = userDoc.data();
      
      // Process activity completion based on type
      let updatedActivity: Activity;
      let xpGained = 0;
      
      switch (activity.type) {
        case "habit": {
          const result = completeHabit(activity as Habit);
          updatedActivity = result.updatedHabit;
          xpGained = result.xpGained;
          break;
        }
        
        case "todo": {
          const result = completeTodo(activity as Todo, data.actualTime);
          updatedActivity = result.updatedTodo;
          xpGained = result.xpGained;
          break;
        }
        
        case "project": {
          if (data.milestoneId) {
            // Complete a milestone
            const result = completeProjectMilestone(activity as Project, data.milestoneId);
            updatedActivity = result.updatedProject;
            xpGained = result.xpGained;
          } else if (data.progress !== undefined) {
            // Update project progress
            const result = updateProjectProgress(activity as Project, data.progress);
            updatedActivity = result.updatedProject;
            xpGained = result.xpGained;
          } else {
            throw new Error("Missing project update parameters");
          }
          break;
        }
        
        default:
          throw new Error("Invalid activity type");
      }
      
      // Update activity in database
      transaction.update(activityRef, updatedActivity);
      
      // Update user XP and streak
      const currentXP = userData.xp || 0;
      const newXP = currentXP + xpGained;
      
      const currentStreak = userData.currentStreak || 0;
      const highestStreak = userData.highestStreak || 0;
      
      // Calculate new streak based on last activity date
      const newStreak = calculateStreak(userData.lastActivityDate, currentStreak);
      const newHighestStreak = Math.max(newStreak, highestStreak);
      
      // Update user document
      transaction.update(userRef, {
        xp: newXP,
        currentStreak: newStreak,
        highestStreak: newHighestStreak,
        lastActivityDate: new Date().toISOString()
      });
      
      return {
        activity: updatedActivity,
        xpGained,
        newTotalXP: newXP,
        streak: newStreak
      };
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error completing activity:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to complete activity" }, 
      { status: 500 }
    );
  }
} 