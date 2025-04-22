"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import Link from "next/link";
import type { Subject, Topic, StudySession } from "@/types/study";
import { useAuth } from "@/lib/auth";
import { Loader2, ArrowLeft } from "lucide-react";
import { activityTypes, calculateXP } from "@/lib/xpSystem";

interface StudySessionProps {
  subjectId: string;
  topicName: string;
}

interface ExtendedSubject extends Subject {
  id: string;
  topics: Topic[];
}

export default function StudySession({ subjectId, topicName }: StudySessionProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [subject, setSubject] = useState<ExtendedSubject | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [activityType, setActivityType] = useState<keyof typeof activityTypes>("study");
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionNotes, setSessionNotes] = useState("");
  const [sessionRating, setSessionRating] = useState<number>(3);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    const fetchSubjectAndTopic = async () => {
      if (!user) return;

      try {
        const decodedTopicName = decodeURIComponent(topicName).trim();
        
        const subjectRef = doc(db, 'subjects', subjectId);
        const subjectDoc = await getDoc(subjectRef);
        
        if (!subjectDoc.exists()) {
          setError('Subject not found');
          return;
        }

        const subjectData = subjectDoc.data() as ExtendedSubject;
        
        if (subjectData.userId !== user.uid) {
          setError('Access denied');
          return;
        }

        const fullSubjectData = {
          ...subjectData,
          id: subjectDoc.id,
          topics: subjectData.topics || [],
        };
        
        const foundTopic = fullSubjectData.topics.find(t => 
          t.name.trim().toLowerCase() === decodedTopicName.toLowerCase()
        );

        if (!foundTopic) {
          setError('Topic not found');
          return;
        }

        setSubject(fullSubjectData);
        setTopic(foundTopic);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Error loading topic');
      }
    };

    fetchSubjectAndTopic();
  }, [user, loading, subjectId, topicName, router]);

  const handleStartSession = () => {
    setSessionStartTime(new Date());
    setIsSessionActive(true);
  };

  const handleEndSession = async () => {
    if (!topic || !subject || !sessionStartTime) return;

    try {
      // Calculate session duration in minutes
      const sessionDuration = Math.round(
        (new Date().getTime() - sessionStartTime.getTime()) / 60000
      );

      // Calculate XP based on activity type and session details
      const activityXP = calculateXP({
        type: activityType,
        duration: sessionDuration,
        difficulty: 5, // Medium difficulty
        focus: sessionRating * 20, // Convert 1-5 rating to 0-100 scale
        quality: sessionRating * 20, // Convert 1-5 rating to 0-100 scale
      });

      // Calculate new mastery level (based on session rating)
      const masteryIncrease = Math.max(1, Math.floor(sessionRating / 2));
      const newMasteryLevel = Math.min(100, (topic.masteryLevel || 0) + masteryIncrease);

      // Create study session
      const newSession: StudySession = {
        id: `${Date.now()}`,
        date: new Date().toISOString(),
        duration: sessionDuration,
        topics: [topic.name],
        rating: sessionRating,
        notes: sessionNotes,
        activityType: activityType,
        performance: sessionRating >= 4 ? 'good' : sessionRating >= 2 ? 'average' : 'needs_improvement'
      };

      // Update topic in Firestore
      const updatedTopics = subject.topics.map(t => {
        if (t.name === topic.name) {
          return {
            ...t,
            xp: (t.xp || 0) + activityXP,
            masteryLevel: newMasteryLevel,
            studySessions: [...(t.studySessions || []), newSession]
          };
        }
        return t;
      });

      const subjectRef = doc(db, 'subjects', subject.id);
      await updateDoc(subjectRef, {
        topics: updatedTopics
      });

      // Update local state
      setTopic(prevTopic => {
        if (!prevTopic) return null;
        return {
          ...prevTopic,
          xp: (prevTopic.xp || 0) + activityXP,
          masteryLevel: newMasteryLevel,
          studySessions: [...(prevTopic.studySessions || []), newSession]
        };
      });

      // Reset session state
      setIsSessionActive(false);
      setSessionStartTime(null);
      setSessionNotes("");
      setSessionRating(3);

    } catch (error) {
      console.error('Error ending session:', error);
      setError('Error saving session data. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-slate-200">Loading study session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-4">
            <p className="text-red-200">{error}</p>
          </div>
          <Link
            href="/subjects"
            className="inline-flex items-center text-slate-200 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Subjects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link
            href={`/subjects/${subjectId}`}
            className="inline-flex items-center text-slate-200 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to {subject?.name}
          </Link>
        </div>

        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">{topic?.name}</h1>
          <div className="flex items-center space-x-4 text-slate-300 mb-4">
            <span>XP: {topic?.xp || 0}</span>
            <span>Mastery: {topic?.masteryLevel || 0}%</span>
          </div>
          
          {!isSessionActive ? (
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Activity Type
              </label>
              <select
                value={activityType}
                onChange={(e) => setActivityType(e.target.value as keyof typeof activityTypes)}
                className="w-full p-2 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none mb-4"
              >
                {Object.entries(activityTypes).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.name}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-sm text-slate-400">
                {activityTypes[activityType].name} - Base XP Multiplier: {activityTypes[activityType].baseMultiplier}x
              </p>
              <p className="mt-1 text-xs text-slate-500 mb-4">
                Factors: {activityTypes[activityType].factors.join(', ')}
              </p>
              <button
                onClick={handleStartSession}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Start {activityTypes[activityType].name} Session
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-700 rounded-lg p-4">
                <p className="text-slate-300">Session in progress...</p>
                <p className="text-sm text-slate-400">
                  Started: {sessionStartTime?.toLocaleTimeString()}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Session Notes
                </label>
                <textarea
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  className="w-full h-32 p-3 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="What did you learn in this session?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Rate Your Understanding (1-5)
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={sessionRating}
                  onChange={(e) => setSessionRating(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Need More Practice</span>
                  <span>Perfect Understanding</span>
                </div>
              </div>

              <button
                onClick={handleEndSession}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
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