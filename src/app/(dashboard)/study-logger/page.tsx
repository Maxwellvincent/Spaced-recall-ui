"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import { Subject, Topic } from "@/types/study";
import { Loader2, Scroll, Flame, Brain, Star } from "lucide-react";

interface LoggedStudySession {
  userId: string;
  subject: string;
  topic: string;
  duration: number;
  confidence: number;
  notes?: string;
  timestamp: Date;
  cardsReviewed?: number;
  newCards?: number;
  jutsuMastery?: {
    chakraControl: number;
    technique: number;
    understanding: number;
  };
}

interface WeakArea {
  subject: string;
  topic: Topic;
  confidence: number;
  lastReviewed: string;
  nextReview: string;
}

interface UserPreferences {
  theme: string;
  character?: string;
}

const JUTSU_DESCRIPTIONS = {
  chakraControl: "How well you can mold and control chakra during practice",
  technique: "The precision and effectiveness of your jutsu execution",
  understanding: "Your grasp of the underlying principles and theory"
};

export default function StudyLogger() {
  const router = useRouter();
  const [user] = useAuthState(auth);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [duration, setDuration] = useState(30);
  const [confidence, setConfidence] = useState(50);
  const [notes, setNotes] = useState("");
  const [cardsReviewed, setCardsReviewed] = useState(0);
  const [newCards, setNewCards] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [userTheme, setUserTheme] = useState<string>("classic");
  const [userCharacter, setUserCharacter] = useState<string | null>(null);
  const [jutsuMastery, setJutsuMastery] = useState({
    chakraControl: 50,
    technique: 50,
    understanding: 50
  });

  useEffect(() => {
    if (!user) return;

    const fetchUserPreferences = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data() as UserPreferences;
          setUserTheme(userData.theme || "classic");
          setUserCharacter(userData.character || null);
        }
      } catch (err) {
        console.error('Error fetching user preferences:', err);
      }
    };

    fetchUserPreferences();
  }, [user]);

  const handleSubmitSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("Please log in to log a study session");
      return;
    }

    if (!selectedSubject || !selectedTopic) {
      setError("Please select both a subject and topic");
      return;
    }

    try {
      const sessionData: LoggedStudySession = {
        userId: user.uid,
        subject: selectedSubject,
        topic: selectedTopic,
        duration,
        confidence,
        notes,
        timestamp: new Date(),
        cardsReviewed,
        newCards,
        ...(userTheme === "naruto" && {
          jutsuMastery: {
            chakraControl: jutsuMastery.chakraControl,
            technique: jutsuMastery.technique,
            understanding: jutsuMastery.understanding
          }
        })
      };

      await addDoc(collection(db, "studySessions"), sessionData);
      setMessage("Training session logged successfully! Your ninja way grows stronger!");
      
      // Reset form
      setSelectedSubject("");
      setSelectedTopic("");
      setDuration(30);
      setConfidence(50);
      setNotes("");
      setCardsReviewed(0);
      setNewCards(0);
      setJutsuMastery({
        chakraControl: 50,
        technique: 50,
        understanding: 50
      });
      
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error("Error logging study session:", err);
      setError("Failed to log training session");
    }
  };

  if (!user) {
    router.push("/login");
    return null;
  }

  const getThemeTitle = () => {
    if (userTheme === "naruto") {
      return "Log Training Session";
    }
    return "Log Study Session";
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-2">{getThemeTitle()}</h1>
        <p className="text-slate-400 mb-6">Track your progress and growth</p>
        
        <form onSubmit={handleSubmitSession} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Subject
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              >
                <option value="">Select a subject</option>
                {subjects.map((subject) => (
                  <option key={`subject-${subject.name}`} value={subject.name}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Topic
              </label>
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              >
                <option value="">Select a topic</option>
                {selectedSubject &&
                  subjects
                    .find((s) => s.name === selectedSubject)
                    ?.topics.map((topic) => (
                      <option key={`topic-${topic.name}`} value={topic.name}>
                        {topic.name}
                      </option>
                    ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              {userTheme === "naruto" ? "Training Duration (minutes)" : "Duration (minutes)"}
            </label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              min="1"
              required
            />
          </div>

          {userTheme === "naruto" ? (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-slate-200">Jutsu Mastery Assessment</h3>
              {Object.entries(jutsuMastery).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-slate-300">
                      {key.split(/(?=[A-Z])/).join(" ")}
                    </label>
                    <span className="text-sm text-slate-400">
                      {JUTSU_DESCRIPTIONS[key as keyof typeof jutsuMastery]}
                    </span>
                  </div>
                  <input
                    type="range"
                    value={value}
                    onChange={(e) => setJutsuMastery(prev => ({
                      ...prev,
                      [key]: Number(e.target.value)
                    }))}
                    className="w-full"
                    min="0"
                    max="100"
                    step="5"
                  />
                  <div className="text-right text-sm text-orange-400">{value}%</div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Confidence (%)
              </label>
              <input
                type="range"
                value={confidence}
                onChange={(e) => setConfidence(Number(e.target.value))}
                className="w-full"
                min="0"
                max="100"
                step="5"
              />
              <div className="text-right text-sm text-blue-400">{confidence}%</div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              {userTheme === "naruto" ? "Training Notes" : "Notes"}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              rows={3}
              placeholder={userTheme === "naruto" ? "Record your training observations and insights..." : "Add your study notes..."}
            />
          </div>

          {selectedSubject &&
            subjects.find((s) => s.name === selectedSubject)?.studyStyle === "anki" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Cards Reviewed
                  </label>
                  <input
                    type="number"
                    value={cardsReviewed}
                    onChange={(e) => setCardsReviewed(Number(e.target.value))}
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    New Cards
                  </label>
                  <input
                    type="number"
                    value={newCards}
                    onChange={(e) => setNewCards(Number(e.target.value))}
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    min="0"
                  />
                </div>
              </div>
            )}

          <button
            type="submit"
            className={`w-full px-4 py-2 rounded-lg flex items-center justify-center gap-2 ${
              userTheme === "naruto"
                ? "bg-orange-600 hover:bg-orange-700"
                : "bg-blue-600 hover:bg-blue-700"
            } text-white transition-colors`}
          >
            {userTheme === "naruto" ? (
              <>
                <Flame className="h-5 w-5" />
                Log Training Session
              </>
            ) : (
              <>
                <Scroll className="h-5 w-5" />
                Log Study Session
              </>
            )}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-4 bg-red-900/50 border border-red-500 text-red-200 rounded-lg">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-4 p-4 bg-green-900/50 border border-green-500 text-green-200 rounded-lg">
            {message}
          </div>
        )}
      </div>
    </div>
  );
} 