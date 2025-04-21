"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, db } from "@/lib/firebaseConfig";
import { useAuthState } from "react-firebase-hooks/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { FSRS } from "@/lib/fsrs";
import { CalendarService } from "@/lib/calendar";
import StudyHistory from "@/components/StudyHistory";
import { useSession } from 'next-auth/react';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import StudyCalendar from '@/components/StudyCalendar';
import StudyGoals from '@/components/StudyGoals';
import StudyVerification from '@/components/StudyVerification';

interface StudySession {
  subject: string;
  topic: string;
  duration: number;
  date: string;
  studyStyle: string;
  customStudyStyle?: string;
  xpEarned: number;
  notes?: string;
  // Anki-specific fields
  cardsReviewed?: number;
  newCards?: number;
  reviewTime?: number;
}

interface WeakArea {
  subject: string;
  topic: string;
  confidence: number;
  lastReviewed: string;
  nextReview: string;
}

type StudyStyle = 'visual' | 'auditory' | 'reading' | 'kinesthetic' | 'mixed';

export default function StudyLoggerPage() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [subjects, setSubjects] = useState<{ [key: string]: any }>({});
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [studyTime, setStudyTime] = useState(0);
  const [confidence, setConfidence] = useState(50);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [weakAreas, setWeakAreas] = useState<WeakArea[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<any[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationData, setVerificationData] = useState<{
    subject: string;
    topic: string;
    duration: number;
    type: 'reading' | 'practice' | 'review';
  } | null>(null);
  const [duration, setDuration] = useState(0);
  const [cardsReviewed, setCardsReviewed] = useState(0);
  const [newCards, setNewCards] = useState(0);

  useEffect(() => {
    if (!session?.user?.email) return;

    const fetchUserData = async () => {
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', session.user.email));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
          setSubjects(userData.subjects || {});
          
          // Set subject and topic from URL params if they exist
          const subjectParam = searchParams.get("subject");
          const topicParam = searchParams.get("topic");
          if (subjectParam && userData.subjects[subjectParam]) {
            setSelectedSubject(subjectParam);
            if (topicParam && userData.subjects[subjectParam].topics[topicParam]) {
              setSelectedTopic(topicParam);
            }
          }

          // Find weak areas
          const weakAreasList: WeakArea[] = [];
          Object.entries(userData.subjects || {}).forEach(([subjectName, subject]: [string, any]) => {
            Object.entries(subject.topics || {}).forEach(([topicName, topic]: [string, any]) => {
              if (topic.confidence < 70 || 
                  (topic.nextReview && new Date(topic.nextReview) < new Date())) {
                weakAreasList.push({
                  subject: subjectName,
                  topic: topicName,
                  confidence: topic.confidence,
                  lastReviewed: topic.lastReviewed,
                  nextReview: topic.nextReview,
                });
              }
            });
          });
          setWeakAreas(weakAreasList.sort((a, b) => a.confidence - b.confidence));

          // Initialize calendar service and fetch upcoming sessions
          if (userData.googleAccessToken) {
            await CalendarService.initialize(userData.googleAccessToken);
            const sessions = await CalendarService.getUpcomingStudySessions();
            setUpcomingSessions(sessions);
          }

          // Load study sessions
          if (selectedSubject) {
            const subjectSessions = userData.subjects[selectedSubject]?.sessions || [];
            setSessions(subjectSessions);
          }
        }
      } catch (err: unknown) {
        console.error("Error fetching user data:", err);
        setError("Failed to load subjects");
      }
    };

    fetchUserData();
  }, [session, searchParams, selectedSubject]);

  const calculateXP = (duration: number, confidence: number, phase: number) => {
    // Base XP from time (1 XP per 5 minutes)
    const timeXP = Math.floor(duration / 5);
    
    // Confidence multiplier (50% = 1x, 100% = 2x)
    const confidenceMultiplier = 1 + (confidence / 100);
    
    // Phase multiplier (higher phases give more XP)
    const phaseMultiplier = 1 + ((phase - 1) * 0.25);
    
    return Math.floor(timeXP * confidenceMultiplier * phaseMultiplier);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedSubject || !selectedTopic || !duration) return;

    try {
      const userDoc = doc(db, 'users', user.uid);
      const userData = await getDoc(userDoc);
      const subjects = userData.data()?.subjects || [];
      
      const subject = subjects.find((s: Subject) => s.name === selectedSubject);
      if (!subject) return;

      // Calculate XP based on study style and duration
      let xpEarned = Math.floor(duration * 10); // Base XP: 10 XP per minute
      
      // Additional XP for Anki sessions
      if (subject.studyStyle === 'custom' && subject.customStudyStyle?.toLowerCase() === 'anki') {
        const cardsPerMinute = cardsReviewed ? cardsReviewed / duration : 0;
        if (cardsPerMinute > 0) {
          xpEarned += Math.floor(cardsPerMinute * 5); // Bonus XP for card review rate
        }
        if (newCards) {
          xpEarned += newCards * 2; // Bonus XP for new cards
        }
      }

      const session: StudySession = {
        subject: selectedSubject,
        topic: selectedTopic,
        duration,
        date: new Date().toISOString(),
        studyStyle: subject.studyStyle,
        customStudyStyle: subject.customStudyStyle,
        xpEarned,
        notes,
        cardsReviewed,
        newCards,
        reviewTime: duration
      };

      // Update subject's total study time and XP
      const updatedSubjects = subjects.map((s: Subject) => {
        if (s.name === selectedSubject) {
          return {
            ...s,
            totalStudyTime: s.totalStudyTime + duration,
            xp: s.xp + xpEarned,
            sessions: [...s.sessions, session]
          };
        }
        return s;
      });

      await updateDoc(userDoc, { subjects: updatedSubjects });
      
      setSuccess('Study session logged successfully!');
      setSelectedSubject('');
      setSelectedTopic('');
      setDuration(0);
      setNotes('');
      setCardsReviewed(0);
      setNewCards(0);
      setError(null);
    } catch (err) {
      setError('Failed to log study session');
      console.error('Error logging study session:', err);
    }
  };

  const handleEndSession = () => {
    if (isActive) {
      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000 / 60);
      
      setVerificationData({
        subject: selectedSubject,
        topic: selectedTopic,
        duration,
        type: 'reading' // Default to reading, can be changed based on session type
      });
      setShowVerification(true);
      setIsActive(false);
    }
  };

  const handleVerificationComplete = (xpEarned: number) => {
    setShowVerification(false);
    setVerificationData(null);
    // Update XP in the UI or show a success message
    setMessage(`Session completed! Earned ${xpEarned} XP`);
    setTimeout(() => setMessage(''), 3000);
  };

  if (loading) return <div>Loading...</div>;
  if (!user) {
    router.push("/login");
    return null;
  }

  const availableTopics = selectedSubject ? Object.keys(subjects[selectedSubject]?.topics || {}) : [];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Study Logger</h1>
      
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-4">
        {/* Subject and Topic selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full p-2 border rounded-md"
              required
            >
              <option value="">Select a subject</option>
              {subjects.map((subject) => (
                <option key={subject.name} value={subject.name}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Topic
            </label>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="w-full p-2 border rounded-md"
              required
            >
              <option value="">Select a topic</option>
              {selectedSubject && subjects
                .find((s) => s.name === selectedSubject)
                ?.topics.map((topic) => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Duration input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Duration (minutes)
          </label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full p-2 border rounded-md"
            min="1"
            required
          />
        </div>

        {/* Anki-specific fields */}
        {selectedSubject && subjects.find((s) => s.name === selectedSubject)?.studyStyle === 'custom' && 
         subjects.find((s) => s.name === selectedSubject)?.customStudyStyle?.toLowerCase() === 'anki' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cards Reviewed
              </label>
              <input
                type="number"
                value={cardsReviewed}
                onChange={(e) => setCardsReviewed(Number(e.target.value))}
                className="w-full p-2 border rounded-md"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Cards
              </label>
              <input
                type="number"
                value={newCards}
                onChange={(e) => setNewCards(Number(e.target.value))}
                className="w-full p-2 border rounded-md"
                min="0"
              />
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-2 border rounded-md"
            rows={3}
          />
        </div>

        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
        >
          Log Study Session
        </button>
      </form>

      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 p-4 bg-green-100 text-green-700 rounded-md">
          {success}
        </div>
      )}
    </div>
  );
} 