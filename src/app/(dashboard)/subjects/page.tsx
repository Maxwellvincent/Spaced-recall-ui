"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { getFirebaseDb } from '@/lib/firebase';
import { collection, query, where, getDocs } from "firebase/firestore";
import { SubjectCard } from "@/components/ui/subject-card";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Search, BookOpen, Star, Clock, Brain, Filter } from "lucide-react";
import { useRouter } from "next/navigation";

interface Subject {
  id: string;
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
  const { user } = useAuth();
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "level" | "recent">("recent");

  // Use getFirebaseDb() to ensure proper initialization
  const db = getFirebaseDb();

  useEffect(() => {
    async function fetchSubjects() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const subjectsQuery = query(
          collection(db, "subjects"),
          where("userId", "==", user.uid)
        );
        const querySnapshot = await getDocs(subjectsQuery);
        const subjectsList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Subject[];
        setSubjects(subjectsList);
      } catch (err) {
        console.error("Error fetching subjects:", err);
        setError("Failed to load subjects. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchSubjects();
  }, [user]);

  const filteredSubjects = subjects
    .filter(subject => 
      subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      subject.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "level":
          return b.level - a.level;
        case "recent":
          return b.sessions?.[0]?.date?.seconds - a.sessions?.[0]?.date?.seconds || 0;
        default:
          return 0;
      }
    });

  const totalXP = subjects.reduce((sum, subject) => sum + subject.xp, 0);
  const averageLevel = subjects.length 
    ? Math.round(subjects.reduce((sum, subject) => sum + subject.level, 0) / subjects.length) 
    : 0;
  const totalStudyTime = subjects.reduce((sum, subject) => sum + (subject.totalStudyTime || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-slate-200">Loading your subjects...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="bg-red-900/20 p-8 rounded-lg text-center max-w-md">
          <h2 className="text-2xl font-bold text-red-400 mb-4">Error Loading Subjects</h2>
          <p className="text-slate-300 mb-6">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-slate-800 hover:bg-slate-700 text-white"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-200 mb-4">Sign In Required</h2>
          <p className="text-slate-400 mb-6">Please sign in to view your subjects.</p>
          <Button
            onClick={() => router.push('/login')}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Your Subjects</h1>
            <p className="text-slate-400">Manage and track your learning journey</p>
          </div>
          <Button
            onClick={() => router.push('/subjects/new')}
            className="mt-4 md:mt-0 bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add New Subject
          </Button>
        </div>

        {subjects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-slate-800 p-6 rounded-lg flex items-center gap-4">
              <div className="bg-blue-500/20 p-3 rounded-lg">
                <Star className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Total XP</p>
                <p className="text-2xl font-bold">{totalXP}</p>
              </div>
            </div>
            <div className="bg-slate-800 p-6 rounded-lg flex items-center gap-4">
              <div className="bg-green-500/20 p-3 rounded-lg">
                <Brain className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Average Level</p>
                <p className="text-2xl font-bold">{averageLevel}</p>
              </div>
            </div>
            <div className="bg-slate-800 p-6 rounded-lg flex items-center gap-4">
              <div className="bg-purple-500/20 p-3 rounded-lg">
                <Clock className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Study Time</p>
                <p className="text-2xl font-bold">{Math.round(totalStudyTime / 60)}h</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-slate-800 rounded-lg p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search subjects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-700 text-white pl-10 pr-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setSortBy("recent")}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  sortBy === "recent" ? "bg-blue-600" : "bg-slate-700"
                }`}
              >
                <Clock className="h-4 w-4" />
                Recent
              </Button>
              <Button
                onClick={() => setSortBy("level")}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  sortBy === "level" ? "bg-blue-600" : "bg-slate-700"
                }`}
              >
                <Brain className="h-4 w-4" />
                Level
              </Button>
              <Button
                onClick={() => setSortBy("name")}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  sortBy === "name" ? "bg-blue-600" : "bg-slate-700"
                }`}
              >
                <BookOpen className="h-4 w-4" />
                Name
              </Button>
            </div>
          </div>

          {subjects.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-blue-500/20 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Subjects Yet</h3>
              <p className="text-slate-400 mb-6">Start your learning journey by creating your first subject.</p>
              <Button
                onClick={() => router.push('/subjects/new')}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 mx-auto"
              >
                <Plus className="h-4 w-4" />
                Create Your First Subject
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSubjects.map((subject) => (
                <SubjectCard key={subject.id} subject={subject} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 