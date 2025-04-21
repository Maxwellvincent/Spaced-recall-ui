"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebaseConfig";
import { useAuthState } from "react-firebase-hooks/auth";
import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";

interface Subject {
  name: string;
  description: string;
  studyStyle: string;
  customStudyStyle?: string;
  masteryPath: {
    currentLevel: number;
    nextLevel: number;
    progress: number;
  };
  xp: number;
  level: number;
  totalStudyTime: number;
  topics: any[];
  sessions: any[];
  examMode?: {
    isEnabled: boolean;
    totalScore: number;
    lastAttempt: string;
    weakAreas: string[];
    topicScores: {
      [topicName: string]: {
        score: number;
        lastAttempt: string;
        weakAreas: string[];
      };
    };
  };
}

export default function SubjectsPage() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      try {
        const userDoc = doc(db, "users", user.uid);
        const userData = await getDoc(userDoc);
        
        if (!userData.exists()) {
          setSubjects([]);
          setIsLoading(false);
          return;
        }

        const userDataObj = userData.data();
        const subjectsList = Array.isArray(userDataObj.subjects) 
          ? userDataObj.subjects.filter((subject: any) => subject !== null && typeof subject === 'object')
          : [];

        setSubjects(subjectsList);
        setError("");
      } catch (err) {
        console.error("Error fetching subjects:", err);
        setError("Failed to load subjects");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Subjects</h1>
        <Link
          href="/subjects/new"
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
        >
          Add New Subject
        </Link>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {subjects.length === 0 ? (
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-600 mb-4">
            No subjects found
          </h2>
          <p className="text-gray-500 mb-6">
            Start by adding your first subject to begin tracking your study progress.
          </p>
          <Link
            href="/subjects/new"
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          >
            Create Your First Subject
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((subject) => (
            <Link
              key={subject.name}
              href={`/subjects/${encodeURIComponent(subject.name)}`}
              className="block"
            >
              <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <h2 className="text-xl font-semibold mb-2">{subject.name}</h2>
                <p className="text-gray-600 mb-4">{subject.description}</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Study Style:</span>
                    <span className="font-medium">
                      {subject.studyStyle === 'custom' 
                        ? subject.customStudyStyle 
                        : subject.studyStyle}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Level:</span>
                    <span className="font-medium">Level {subject.level}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">XP:</span>
                    <span className="font-medium">{subject.xp} XP</span>
                  </div>
                  {subject.examMode?.isEnabled && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Exam Score:</span>
                      <span className="font-medium">{subject.examMode.totalScore}%</span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
} 