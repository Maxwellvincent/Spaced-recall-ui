import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { db } from "@/lib/firebase";
import { SubjectStructure } from "@/types/subject";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export async function POST(request: Request) {
  try {
    const { userId } = auth();
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
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      progress: {
        totalXP: 0,
        averageMastery: 0,
        completedTopics: 0,
        totalTopics: data.topics.length,
      },
    };

    // Save to Firestore
    const docRef = await addDoc(collection(db, "subjects"), subjectDoc);

    return NextResponse.json({ id: docRef.id });
  } catch (error) {
    console.error("Error creating subject:", error);
    return NextResponse.json(
      { error: "Failed to create subject" },
      { status: 500 }
    );
  }
} 