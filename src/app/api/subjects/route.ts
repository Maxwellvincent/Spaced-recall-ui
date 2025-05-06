import { NextResponse } from "next/server";
import { initializeFirebaseAdmin } from "@/lib/firebaseAdmin";
import { SubjectStructure } from "@/types/subject";
import { FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { cookies, headers } from "next/headers";

export async function POST(request: Request) {
  try {
    // Get the authorization header
    const headersList = headers();
    const authHeader = headersList.get("authorization");
    let userId = null;

    // Check for auth token
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const idToken = authHeader.split("Bearer ")[1];
      try {
        // Verify the Firebase token
        const auth = getAuth();
        const decodedToken = await auth.verifyIdToken(idToken);
        userId = decodedToken.uid;
      } catch (error) {
        console.error("Error verifying token:", error);
        return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 });
      }
    } 
    
    // If no auth header, try to get from cookies (for session-based auth)
    if (!userId) {
      const cookieStore = cookies();
      const sessionCookie = cookieStore.get("session");
      
      if (sessionCookie) {
        try {
          const auth = getAuth();
          const decodedCookie = await auth.verifySessionCookie(sessionCookie.value);
          userId = decodedCookie.uid;
        } catch (error) {
          console.error("Error verifying session cookie:", error);
        }
      }
    }

    // If we still don't have a user ID, return unauthorized
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data: SubjectStructure = await request.json();

    // Validate required fields
    if (!data.name?.trim()) {
      return NextResponse.json(
        { error: "Subject name is required" },
        { status: 400 }
      );
    }

    if (!data.description?.trim()) {
      return NextResponse.json(
        { error: "Subject description is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(data.topics) || data.topics.length === 0) {
      return NextResponse.json(
        { error: "At least one topic is required" },
        { status: 400 }
      );
    }

    // Validate each topic
    for (const topic of data.topics) {
      if (!topic.name?.trim()) {
        return NextResponse.json(
          { error: "Topic name is required for all topics" },
          { status: 400 }
        );
      }
      if (!topic.description?.trim()) {
        return NextResponse.json(
          { error: "Topic description is required for all topics" },
          { status: 400 }
        );
      }
      if (!Array.isArray(topic.coreConcepts) || topic.coreConcepts.length === 0) {
        return NextResponse.json(
          { error: "At least one core concept is required for each topic" },
          { status: 400 }
        );
      }
    }

    // Calculate total estimated hours
    const totalEstimatedHours = data.topics.reduce(
      (total, topic) => total + (topic.estimatedStudyHours || 0),
      0
    );

    // Prepare the subject document
    const subjectDoc = {
      ...data,
      userId,
      totalEstimatedHours,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      progress: {
        totalXP: 0,
        averageMastery: 0,
        completedTopics: 0,
        totalTopics: data.topics.length,
      },
    };

    // Save to Firestore (admin)
    const db = initializeFirebaseAdmin();
    const docRef = await db.collection("subjects").add(subjectDoc);

    return NextResponse.json({ id: docRef.id });
  } catch (error) {
    console.error("Error creating subject:", error);
    return NextResponse.json(
      { error: "Failed to create subject" },
      { status: 500 }
    );
  }
} 