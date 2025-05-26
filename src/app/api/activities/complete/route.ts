import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { Activity, Habit, Todo, Project, BookReadingHabit } from "@/types/activities";
import { completeHabit, completeTodo, updateProjectProgress, completeProjectMilestone, recordReadingSession } from "@/utils/activityUtils";
import { calculateStreak } from "@/utils/streakUtils";
import { getAuth as getAdminAuth } from "firebase-admin/auth";

// POST /api/activities/complete - Complete an activity and update user XP/streaks
export async function POST(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];

    // Verify token using Firebase Admin SDK
    let decodedToken;
    try {
      decodedToken = await getAdminAuth().verifyIdToken(token);
    } catch (err) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const userId = decodedToken.uid;

    const data = await request.json();
    if (!data.activityId) {
      return NextResponse.json({ error: "Activity ID is required" }, { status: 400 });
    }

    const db = await getAdminFirestore();
    const activityRef = db.collection("activities").doc(data.activityId);
    const userRef = db.collection("users").doc(userId);

    // Run as a transaction to ensure data consistency
    const result = await db.runTransaction(async (transaction) => {
      // Get the activity
      const activityDoc = await transaction.get(activityRef);
      if (!activityDoc.exists) {
        throw new Error("Activity not found");
      }
      const activity = { id: activityDoc.id, ...activityDoc.data() } as Activity;
      // Verify ownership
      if (activity.userId !== userId) {
        throw new Error("Unauthorized");
      }
      // Get user document to update XP and streaks
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new Error("User not found");
      }
      const userData = userDoc.data();
      // Process activity completion based on type
      let updatedActivity: Activity;
      let xpGained = 0;
      switch (activity.type) {
        case "habit": {
          if ((activity as any).habitSubtype === 'book-reading') {
            if (!data.readingSession) {
              throw new Error("Reading session data is required");
            }
            const result = recordReadingSession(
              activity as BookReadingHabit, 
              data.readingSession
            );
            updatedActivity = result.updatedHabit;
            xpGained = result.xpGained;
          } else {
            const result = completeHabit(activity as Habit);
            updatedActivity = result.updatedHabit;
            xpGained = result.xpGained;
          }
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
            const result = completeProjectMilestone(activity as Project, data.milestoneId);
            updatedActivity = result.updatedProject;
            xpGained = result.xpGained;
          } else if (data.progress !== undefined) {
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
      // Defensive update: only update fields that are defined
      const updateData = Object.fromEntries(
        Object.entries(updatedActivity).filter(([_, v]) => v !== undefined && v !== null)
      );
      // Add completedDates and completionHistory update for habits
      if (activity.type === 'habit') {
        // Get today's local date string (YYYY-MM-DD)
        const now = new Date();
        const localDate = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
        // Defensive: ensure completionHistory is a valid array of objects with date
        let safeHistory = Array.isArray(activity.completionHistory)
          ? activity.completionHistory.filter(h => h && typeof h === 'object' && typeof h.date === 'string')
          : [];
        // Update completedDates
        if (!Array.isArray(activity.completedDates) || !activity.completedDates.includes(localDate)) {
          updateData.completedDates = Array.isArray(activity.completedDates)
            ? [...activity.completedDates, localDate]
            : [localDate];
        }
        // Update completionHistory
        if (!safeHistory.some(h => h.date === localDate && h.completed)) {
          updateData.completionHistory = [
            { date: localDate, completed: true },
            ...safeHistory
          ];
        } else {
          updateData.completionHistory = safeHistory;
        }
      }
      console.log('Updating activity:', updateData);
      transaction.update(activityRef, updateData);
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
    if (typeof activity !== 'undefined') {
      console.error("Error completing activity:", error, {
        activityCompletionHistory: activity.completionHistory
      });
    } else {
      console.error("Error completing activity:", error);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to complete activity" }, 
      { status: 500 }
    );
  }
} 