import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export async function logUserActivity(userId: string, activity: {
  type: string;
  detail: string;
  [key: string]: any;
}) {
  if (!userId) return;
  const activityData = {
    ...activity,
    userId,
    date: new Date().toISOString(), // or use serverTimestamp() if you want Firestore server time
  };
  // Write to global collection
  await addDoc(collection(db, "activities"), activityData);
  // Write to user subcollection
  await addDoc(collection(db, "users", userId, "activity"), activityData);
} 