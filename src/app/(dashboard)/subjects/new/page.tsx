"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { doc, updateDoc, arrayUnion, getDoc, addDoc, collection } from "firebase/firestore";

const STUDY_MODES = {
  standard: {
    label: "Standard Learning",
    description: "Traditional study approach with topics and concepts",
    metrics: {},
    structure: {
      concepts: [],
      studySessions: []
    }
  },
  trading: {
    label: "Trading",
    description: "Track trading strategies, backtesting, and live performance",
    metrics: {
      backtestWinRate: 0,
      forwardTestWinRate: 0,
      liveTradeWinRate: 0,
      totalTrades: 0,
      profitFactor: 0,
      averageRR: 0
    },
    structure: {
      activities: [],
      progress: {
        backtesting: {
          completed: 0,
          total: 0,
          notes: []
        },
        forwardTesting: {
          completed: 0,
          total: 0,
          notes: []
        },
        liveTrades: {
          completed: 0,
          total: 0,
          notes: []
        }
      },
      resources: [],
      notes: []
    }
  },
  language: {
    label: "Language Learning",
    description: "Track vocabulary, grammar, and conversation practice",
    metrics: {
      vocabulary: 0,
      speaking: 0,
      listening: 0,
      reading: 0,
      writing: 0
    },
    structure: {
      concepts: [],
      studySessions: []
    }
  },
  project: {
    label: "Project Based",
    description: "Track project milestones and skill development",
    metrics: {
      completedMilestones: 0,
      skillProgress: 0,
      projectHealth: 100
    },
    structure: {
      milestones: [],
      tasks: [],
      notes: []
    }
  },
  custom: {
    label: "Custom",
    description: "Define your own study structure and metrics",
    metrics: {},
    structure: {
      concepts: [],
      studySessions: []
    }
  }
};

export default function NewSubjectPage() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const [subjectName, setSubjectName] = useState("");
  const [description, setDescription] = useState("");
  const [studyMode, setStudyMode] = useState("standard");
  const [customStudyMode, setCustomStudyMode] = useState("");
  const [initialTopic, setInitialTopic] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    setError("");

    try {
      // Create new subject with dynamic structure based on study mode
      const newSubject = {
        name: subjectName,
        description: description || "",
        studyStyle: studyMode,
        customStudyStyle: studyMode === 'custom' ? (customStudyMode || "") : "",
        masteryPath: {
          currentLevel: 1,
          nextLevel: 2,
          progress: 0
        },
        xp: 0,
        level: 1,
        totalStudyTime: 0,
        topics: [{
          name: initialTopic,
          description: "",
          masteryLevel: 0,
          xp: 0,
          level: 1,
          lastStudied: new Date().toISOString(),
          totalStudyTime: 0,
          currentPhase: 'initial',
          studySessions: [],
          activities: [],
          concepts: [],
          examScore: 0,
          weakAreas: [],
          framework: {
            progress: {
              learnRecall: 0,
              testingEffect: 0,
              reflectionDiagnosis: 0,
              integration: 0,
              teaching: 0
            }
          },
          ...STUDY_MODES[studyMode as keyof typeof STUDY_MODES].structure,
          metrics: STUDY_MODES[studyMode as keyof typeof STUDY_MODES].metrics
        }],
        sessions: [],
        userId: user.uid,
        createdAt: new Date().toISOString()
      };

      // Add the subject to the subjects collection
      const docRef = await addDoc(collection(db, "subjects"), newSubject);

      router.push(`/subjects/${encodeURIComponent(docRef.id)}`);
    } catch (err) {
      console.error("Error creating subject:", err);
      setError("Failed to create subject. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
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
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8 text-white">Create New Subject</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6 bg-slate-900 p-6 rounded-lg shadow-lg">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="subjectName" className="block text-sm font-medium text-white mb-2">
            Subject Name
          </label>
          <input
            type="text"
            id="subjectName"
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            className="w-full px-4 py-2 rounded-md bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Trading, Mathematics, Spanish"
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-white mb-2">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2 rounded-md bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Describe your learning goals and approach"
          />
        </div>

        <div>
          <label htmlFor="studyMode" className="block text-sm font-medium text-white mb-2">
            Study Mode
          </label>
          <select
            id="studyMode"
            value={studyMode}
            onChange={(e) => setStudyMode(e.target.value)}
            className="w-full px-4 py-2 rounded-md bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Object.entries(STUDY_MODES).map(([key, { label }]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <p className="mt-2 text-sm text-slate-400">
            {STUDY_MODES[studyMode as keyof typeof STUDY_MODES].description}
          </p>
        </div>

        {studyMode === 'custom' && (
          <div>
            <label htmlFor="customStudyMode" className="block text-sm font-medium text-white mb-2">
              Custom Study Mode Name
            </label>
            <input
              type="text"
              id="customStudyMode"
              value={customStudyMode}
              onChange={(e) => setCustomStudyMode(e.target.value)}
              className="w-full px-4 py-2 rounded-md bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Research, Art Practice"
              required={studyMode === 'custom'}
            />
          </div>
        )}

        <div>
          <label htmlFor="initialTopic" className="block text-sm font-medium text-white mb-2">
            Initial Topic
          </label>
          <input
            type="text"
            id="initialTopic"
            value={initialTopic}
            onChange={(e) => setInitialTopic(e.target.value)}
            className="w-full px-4 py-2 rounded-md bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={studyMode === 'trading' ? 'e.g., AFOP Trading Model' : 'e.g., Chapter 1, Basics'}
            required
          />
          <p className="mt-2 text-sm text-slate-400">
            This will be your first topic. You can add more later.
          </p>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm font-medium text-white bg-slate-700 rounded-md hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Creating..." : "Create Subject"}
          </button>
        </div>
      </form>
    </div>
  );
} 