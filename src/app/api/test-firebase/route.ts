import { NextResponse } from "next/server";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

export async function GET() {
  try {
    // Firebase configuration
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
    };

    // Log sanitized config for debugging
    const sanitizedConfig = {
      apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 5)}...` : "Not set",
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket,
      messagingSenderId: firebaseConfig.messagingSenderId ? "Set" : "Not set",
      appId: firebaseConfig.appId ? "Set" : "Not set",
    };

    // Initialize Firebase
    const app = initializeApp(firebaseConfig, "test-app");
    const db = getFirestore(app);

    // Test collections
    const collections = ["projects", "activities", "users"];
    const results = {};

    // Try to access each collection
    for (const collectionName of collections) {
      try {
        const collectionRef = collection(db, collectionName);
        const snapshot = await getDocs(collectionRef);
        results[collectionName] = {
          success: true,
          count: snapshot.size,
          firstDocId: snapshot.size > 0 ? snapshot.docs[0].id : null
        };
      } catch (error) {
        results[collectionName] = {
          success: false,
          error: error.message
        };
      }
    }

    return NextResponse.json({
      success: true,
      config: sanitizedConfig,
      collections: results
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
} 