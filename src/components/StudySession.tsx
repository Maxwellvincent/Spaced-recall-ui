"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getFirebaseDb } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from "firebase/firestore";
import Link from "next/link";
import type { Subject, Topic, StudySession } from "@/types/study";
import { useAuth } from "@/lib/auth";
import { Loader2, ArrowLeft } from "lucide-react";
import { activityTypes, calculateSessionXP } from "@/lib/xpSystem";
import { toast } from "sonner";

interface StudySessionProps {
  subjectId: string;
  topicName: string;
}

// Use getFirebaseDb() to ensure proper initialization
const db = getFirebaseDb();

export default function StudySession({ subjectId, topicName }: StudySessionProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionNotes, setSessionNotes] = useState("");
  const [sessionRating, setSessionRating] = useState(3);
  const [activityType, setActivityType] = useState("study");

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        const subjectRef = doc(db, "subjects", subjectId);
        const subjectDoc = await getDoc(subjectRef);

        if (!subjectDoc.exists()) {
          setError("Subject not found");
          return;
        }

        const subjectData = subjectDoc.data() as Subject;
        setSubject(subjectData);

        const decodedTopicName = decodeURIComponent(topicName).trim();
        const topicData = subjectData.topics.find(
          (t) => t.name.trim() === decodedTopicName
        );

        if (!topicData) {
          setError("Topic not found");
          return;
        }

        setTopic(topicData);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Error loading study session");
      }
    };

    fetchData();
  }, [user, subjectId, topicName]);

  const handleStartSession = () => {
    setIsSessionActive(true);
    setSessionStartTime(new Date());
  };

  const handleEndSession = async () => {
    if (!topic || !subject || !sessionStartTime) return;

    try {
      // Calculate session duration in minutes
      const sessionDuration = Math.round(
        (new Date().getTime() - sessionStartTime.getTime()) / 60000
      );

      // Calculate XP based on activity type and session details
      const { xp: activityXP, masteryGained } = calculateSessionXP({
        activityType,
        difficulty: "medium",
        duration: sessionDuration,
        currentLevel: topic.masteryLevel || 0,
      });

      // Create study session
      const newSession: StudySession = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        duration: sessionDuration,
        topics: [topic.name],
        rating: sessionRating,
        notes: sessionNotes,
        activityType: activityType,
        xpGained: activityXP,
        masteryGained: masteryGained,
        performance: sessionRating >= 4 ? "good" : sessionRating >= 2 ? "average" : "needs_improvement"
      };

      // Update topic with new XP and mastery
      const updatedTopics = subject.topics.map(t => {
        if (t.name === topic.name) {
          return {
            ...t,
            xp: (t.xp || 0) + activityXP,
            masteryLevel: Math.min(100, (t.masteryLevel || 0) + masteryGained),
            studySessions: [...(t.studySessions || []), newSession]
          };
        }
        return t;
      });

      // Calculate new subject totals
      const totalXP = updatedTopics.reduce((sum, t) => sum + (t.xp || 0), 0);
      const averageMastery = Math.floor(
        updatedTopics.reduce((sum, t) => sum + (t.masteryLevel || 0), 0) / updatedTopics.length
      );

      // Update Firestore with both topic and subject updates
      const subjectRef = doc(db, "subjects", subjectId);
      await updateDoc(subjectRef, {
        topics: updatedTopics,
        xp: totalXP,
        progress: {
          totalXP: totalXP,
          averageMastery: averageMastery,
          completedTopics: updatedTopics.filter(t => (t.masteryLevel || 0) >= 80).length,
          totalTopics: updatedTopics.length,
          lastStudied: new Date().toISOString()
        },
        masteryPath: {
          currentLevel: Math.floor(averageMastery / 10),
          nextLevel: Math.floor(averageMastery / 10) + 1,
          progress: (averageMastery % 10) * 10
        }
      });

      // Update local state
      setTopic(prevTopic => {
        if (!prevTopic) return null;
        return {
          ...prevTopic,
          xp: (prevTopic.xp || 0) + activityXP,
          masteryLevel: Math.min(100, (prevTopic.masteryLevel || 0) + masteryGained),
          studySessions: [...(prevTopic.studySessions || []), newSession]
        };
      });

      setSubject(prevSubject => {
        if (!prevSubject) return null;
        return {
          ...prevSubject,
          topics: updatedTopics,
          xp: totalXP,
          progress: {
            totalXP: totalXP,
            averageMastery: averageMastery,
            completedTopics: updatedTopics.filter(t => (t.masteryLevel || 0) >= 80).length,
            totalTopics: updatedTopics.length,
            lastStudied: new Date().toISOString()
          },
          masteryPath: {
            currentLevel: Math.floor(averageMastery / 10),
            nextLevel: Math.floor(averageMastery / 10) + 1,
            progress: (averageMastery % 10) * 10
          }
        };
      });

      // Reset session state
      setIsSessionActive(false);
      setSessionStartTime(null);
      setSessionNotes("");
      setSessionRating(3);

      toast.success(`Session completed! Earned ${activityXP} XP and increased mastery by ${masteryGained}%`);

    } catch (error) {
      console.error("Error ending session:", error);
      setError("Error saving session data. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading study session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-destructive/10 border border-destructive rounded-lg p-4 mb-4">
            <p className="text-destructive">{error}</p>
          </div>
          <Link
            href="/subjects"
            className="inline-flex items-center hover:text-foreground/80"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Subjects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link
            href={`/subjects/${subjectId}`}
            className="inline-flex items-center hover:text-foreground/80"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to {subject?.name}
          </Link>
        </div>

        <div className="bg-card rounded-lg p-6 mb-6">
          <h1 className="text-2xl font-bold mb-2">{topic?.name}</h1>
          <div className="flex items-center space-x-4 mb-4">
            <span>XP: {topic?.xp || 0}</span>
            <span>Mastery: {topic?.masteryLevel || 0}%</span>
          </div>
          
          {!isSessionActive ? (
            <button
              onClick={handleStartSession}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-2 px-4 rounded-lg"
            >
              Start Study Session
            </button>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Activity Type
                </label>
                <select
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value)}
                  className="w-full bg-background border rounded-lg p-2"
                >
                  {Object.keys(activityTypes).map((type) => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Session Notes
                </label>
                <textarea
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  className="w-full bg-background border rounded-lg p-2 min-h-[100px]"
                  placeholder="Add any notes about your study session..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Session Rating (1-5)
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={sessionRating}
                  onChange={(e) => setSessionRating(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-sm">
                  <span>Poor</span>
                  <span>Excellent</span>
                </div>
              </div>

              <button
                onClick={handleEndSession}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-2 px-4 rounded-lg"
              >
                End Session
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}