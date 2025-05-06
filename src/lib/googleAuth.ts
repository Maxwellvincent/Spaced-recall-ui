import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';

// Use getFirebaseDb() to ensure proper initialization
const db = getFirebaseDb();

export async function checkGoogleCalendarAuth(): Promise<boolean> {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error('User not authenticated');
  }

  // Check if user has Google Calendar tokens in Firestore
  const userDoc = await getDoc(doc(db, 'users', user.uid));
  const userData = userDoc.data();

  return !!(userData?.googleCalendarTokens?.accessToken);
}

export async function initiateGoogleCalendarAuth() {
  // Redirect to the backend endpoint that handles Google OAuth
  const currentUrl = window.location.href;
  const redirectUrl = `/api/auth/google/calendar?redirect=${encodeURIComponent(currentUrl)}`;
  window.location.href = redirectUrl;
} 