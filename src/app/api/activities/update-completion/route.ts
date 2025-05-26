import { NextRequest, NextResponse } from "next/server";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getAdminFirestore, initAdmin } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

initAdmin();

export async function POST(request: NextRequest) {
  try {
    // Auth
    const authHeader = request.headers.get("authorization");
    console.log("[API] Authorization header:", authHeader);
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];
    console.log("[API] Token to verify:", token);
    let decodedToken;
    try {
      decodedToken = await getAdminAuth().verifyIdToken(token);
    } catch (err) {
      console.error("[API] Token verification failed", err);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const userId = decodedToken.uid;

    // Parse body
    let body;
    try {
      body = await request.json();
    } catch (err) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const { habitIds, date } = body;
    if (!habitIds || !Array.isArray(habitIds) || !date) {
      return NextResponse.json({ error: "Missing or invalid parameters" }, { status: 400 });
    }

    const db = await getAdminFirestore();
    const errors = [];
    let totalXpAwarded = 0;
    for (const habitId of habitIds) {
      const habitRef = db.collection("activities").doc(habitId);
      let habitSnap;
      try {
        habitSnap = await habitRef.get();
      } catch (err) {
        errors.push({ habitId, error: "Error fetching habit document" });
        continue;
      }
      if (!habitSnap.exists) {
        errors.push({ habitId, error: "Habit not found" });
        continue;
      }
      const habit = habitSnap.data();
      if (!habit || !habit.userId || habit.userId !== userId) {
        errors.push({ habitId, error: "Unauthorized or missing userId" });
        continue;
      }
      // Defensive: ensure completionHistory is a valid array of objects with date
      let safeHistory = Array.isArray(habit.completionHistory)
        ? habit.completionHistory.filter(h => h && typeof h === 'object' && typeof h.date === 'string')
        : [];
      const alreadyExists = safeHistory.some(h => h.date === date && h.completed);
      try {
        // Add completion if not already exists
        let newHistory = alreadyExists
          ? safeHistory
          : [{ date, completed: true }, ...safeHistory];
        // Calculate streak: consecutive days up to and including 'date'
        const dates = newHistory
          .filter(h => h.completed)
          .map(h => h.date)
          .sort((a, b) => b.localeCompare(a));
        let streak = 1;
        let bestStreak = habit.bestStreak || 1;
        if (dates.length > 1) {
          const target = new Date(date);
          let prev = new Date(date);
          for (let i = 1; i < dates.length; i++) {
            const d = new Date(dates[i]);
            prev.setDate(prev.getDate() - 1);
            if (
              d.getFullYear() === prev.getFullYear() &&
              d.getMonth() === prev.getMonth() &&
              d.getDate() === prev.getDate()
            ) {
              streak++;
              prev = new Date(d);
            } else {
              break;
            }
          }
        }
        if (streak > bestStreak) bestStreak = streak;
        // Award XP
        const xpAwarded = 10 + 5 * (streak - 1);
        totalXpAwarded += xpAwarded;
        // Update habit
        await habitRef.update({
          completedDates: FieldValue.arrayUnion(date),
          completionHistory: newHistory,
          currentStreak: streak,
          bestStreak: bestStreak,
        });
      } catch (err) {
        errors.push({ habitId, error: "Failed to update completion" });
      }
    }
    // Update user XP
    if (totalXpAwarded > 0) {
      const userRef = db.collection("users").doc(userId);
      await userRef.set({ xp: FieldValue.increment(totalXpAwarded) }, { merge: true });
    }
    if (errors.length) {
      return NextResponse.json({ error: "Some completions failed", details: errors }, { status: 207 });
    }
    return NextResponse.json({ success: true, xpAwarded: totalXpAwarded });
  } catch (error) {
    console.error("[API] Error updating habit completion (outer catch):", error, error?.stack);
    return NextResponse.json({ error: "Failed to update habit completion", details: error?.message || String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Auth
    const authHeader = request.headers.get("authorization");
    console.log("[API] Authorization header:", authHeader);
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];
    console.log("[API] Token to verify:", token);
    let decodedToken;
    try {
      decodedToken = await getAdminAuth().verifyIdToken(token);
    } catch (err) {
      console.error("[API] Token verification failed", err);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const userId = decodedToken.uid;

    // Parse body
    let body;
    try {
      body = await request.json();
    } catch (err) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const { habitIds, date } = body;
    if (!habitIds || !Array.isArray(habitIds) || !date) {
      return NextResponse.json({ error: "Missing or invalid parameters" }, { status: 400 });
    }

    const db = await getAdminFirestore();
    const errors = [];
    let totalXpRemoved = 0;
    for (const habitId of habitIds) {
      const habitRef = db.collection("activities").doc(habitId);
      let habitSnap;
      try {
        habitSnap = await habitRef.get();
      } catch (err) {
        errors.push({ habitId, error: "Error fetching habit document" });
        continue;
      }
      if (!habitSnap.exists) {
        errors.push({ habitId, error: "Habit not found" });
        continue;
      }
      const habit = habitSnap.data();
      if (!habit || !habit.userId || habit.userId !== userId) {
        errors.push({ habitId, error: "Unauthorized or missing userId" });
        continue;
      }
      // Defensive: ensure completionHistory is a valid array of objects with date
      let safeHistory = Array.isArray(habit.completionHistory)
        ? habit.completionHistory.filter(h => h && typeof h === 'object' && typeof h.date === 'string')
        : [];
      try {
        // Remove the completion
        let newHistory = safeHistory.filter(h => h.date !== date);
        // Recalculate streak: find the latest streak (consecutive days up to the most recent completion)
        const dates = newHistory
          .filter(h => h.completed)
          .map(h => h.date)
          .sort((a, b) => b.localeCompare(a));
        let streak = 0;
        let bestStreak = 0;
        if (dates.length > 0) {
          let currentStreak = 1;
          bestStreak = 1;
          let prev = new Date(dates[0]);
          for (let i = 1; i < dates.length; i++) {
            const d = new Date(dates[i]);
            prev.setDate(prev.getDate() - 1);
            if (
              d.getFullYear() === prev.getFullYear() &&
              d.getMonth() === prev.getMonth() &&
              d.getDate() === prev.getDate()
            ) {
              currentStreak++;
              if (currentStreak > bestStreak) bestStreak = currentStreak;
              prev = new Date(d);
            } else {
              currentStreak = 1;
              prev = new Date(d);
            }
          }
          streak = currentStreak;
        }
        // Calculate XP to remove: what would have been awarded for the removed date
        // Find the streak that included the removed date
        let removedStreak = 1;
        if (safeHistory.some(h => h.date === date && h.completed)) {
          // Rebuild the streak up to the removed date
          const sortedDates = safeHistory
            .filter(h => h.completed)
            .map(h => h.date)
            .sort(); // ascending
          let idx = sortedDates.indexOf(date);
          if (idx > 0) {
            let prev = new Date(date);
            for (let i = idx - 1; i >= 0; i--) {
              prev.setDate(prev.getDate() - 1);
              const d = new Date(sortedDates[i]);
              if (
                d.getFullYear() === prev.getFullYear() &&
                d.getMonth() === prev.getMonth() &&
                d.getDate() === prev.getDate()
              ) {
                removedStreak++;
                prev = new Date(d);
              } else {
                break;
              }
            }
          }
        }
        const xpToRemove = 10 + 5 * (removedStreak - 1);
        totalXpRemoved += xpToRemove;
        // Update habit
        await habitRef.update({
          completedDates: FieldValue.arrayRemove(date),
          completionHistory: newHistory,
          currentStreak: streak,
          bestStreak: bestStreak,
        });
      } catch (err) {
        errors.push({ habitId, error: "Failed to remove completion" });
      }
    }
    // Subtract XP from user
    if (totalXpRemoved > 0) {
      const userRef = db.collection("users").doc(userId);
      await userRef.set({ xp: FieldValue.increment(-totalXpRemoved) }, { merge: true });
    }
    if (errors.length) {
      return NextResponse.json({ error: "Some removals failed", details: errors }, { status: 207 });
    }
    return NextResponse.json({ success: true, xpRemoved: totalXpRemoved });
  } catch (error) {
    console.error("[API] Error removing habit completion (outer catch):", error, error?.stack);
    return NextResponse.json({ error: "Failed to remove habit completion", details: error?.message || String(error) }, { status: 500 });
  }
} 