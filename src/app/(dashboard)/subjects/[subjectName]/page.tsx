"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebaseConfig";
import { useAuthState } from "react-firebase-hooks/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { SpacedRepetition } from '@/lib/spacedRepetition';
import {
  calculateMasteryScore,
  calculateRetentionScore,
  calculateClarityScore,
  evaluateUserAnswer,
} from '@/lib/studyUtils';
import type {
  StudyPhase,
  StudySession,
  Topic as StudyTopic,
  Subject,
  StudyFramework,
  AIPrompt,
  StudyResource,
  StudyRecommendation,
  ProgressMetrics
} from '@/types/study';
import { generateStudyPrompt } from '@/lib/openai';

type Phase = "initial" | "consolidation" | "mastery";

interface Topic extends StudyTopic {
  id: string;
  name: string;
  description: string;
  masteryLevel: number;
  lastStudied: string;
  totalStudyTime: number;
  concepts: Topic[];
  xp: number;
  level: number;
  activities: Activity[];
  currentPhase?: Phase;
  studySessions?: StudySession[];
  framework?: StudyFramework;
}

interface Activity {
  id: string;
  type: 'video' | 'book' | 'recall' | 'mindmap' | 'questions' | 'teaching';
  status: 'completed' | 'in-progress';
  description: string;
  duration: number;
}

interface ExamMode {
  isEnabled: boolean;
  totalScore: number;
  lastAttempt: string;
  weakAreas: string[];
  topicScores: { [topicName: string]: { score: number; lastAttempt: string; weakAreas: string[] } };
}

interface StudyAIPrompt {
  prompt: string;
  userAnswer?: string;
  aiFeedback?: string;
  score?: number;
}

export default function SubjectDetailsPage({ params }: { params: Promise<{ subjectName: string }> }) {
  const resolvedParams = use(params);
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [newTopic, setNewTopic] = useState({
    name: "",
    description: "",
  });
  const [newConcept, setNewConcept] = useState({
    name: "",
    description: "",
  });
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [selectedConcept, setSelectedConcept] = useState<Topic | null>(null);
  const [studyRating, setStudyRating] = useState<number>(3);
  const [studyNotes, setStudyNotes] = useState<string>("");
  const [studyDuration, setStudyDuration] = useState<number>(30);
  const [activityNotes, setActivityNotes] = useState<string>("");
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [isEditingActivity, setIsEditingActivity] = useState<boolean>(false);
  const [editingActivity, setEditingActivity] = useState<{
    type: 'video' | 'book' | 'recall' | 'mindmap' | 'questions' | 'teaching';
    xp: number;
    completed: boolean;
    notes?: string;
  } | null>(null);
  const [recommendation, setRecommendation] = useState<StudyRecommendation | null>(null);
  const [currentFramework, setCurrentFramework] = useState<StudyFramework | null>(null);
  const [aiPrompt, setAiPrompt] = useState<StudyAIPrompt | null>(null);
  const [userAnswer, setUserAnswer] = useState<string>("");
  const [mindmapData, setMindmapData] = useState<{
    nodes: { id: string; label: string; x: number; y: number }[];
    edges: { from: string; to: string; label?: string }[];
  }>({ nodes: [], edges: [] });

  useEffect(() => {
    const fetchSubject = async () => {
      if (!user) return;

      try {
        const userDoc = doc(db, "users", user.uid);
        const userData = await getDoc(userDoc);
        
        if (!userData.exists()) {
          await updateDoc(userDoc, { subjects: [] });
          return;
        }

        const userDataObj = userData.data();
        const subjects = Array.isArray(userDataObj.subjects) ? userDataObj.subjects : [];
        
        const foundSubject = subjects.find((s: Subject) => s.name === resolvedParams.subjectName);
        
        if (foundSubject) {
          setSubject(foundSubject);
        } else {
          setSubject({
            name: resolvedParams.subjectName,
            description: "",
            studyStyle: "spaced-repetition",
            masteryPath: {
              currentLevel: 1,
              nextLevel: 2,
              progress: 0,
            },
            xp: 0,
            level: 1,
            totalStudyTime: 0,
            topics: [],
            sessions: [],
          });
        }
      } catch (err) {
        console.error("Error fetching subject:", err);
      }
    };

    fetchSubject();
  }, [user, resolvedParams.subjectName]);

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !subject) return;

    try {
      const userDoc = doc(db, "users", user.uid);
      const userData = await getDoc(userDoc);
      const userDataObj = userData.data();
      const subjects = Array.isArray(userDataObj?.subjects) ? userDataObj.subjects : [];

      // Check if subject name already exists
      if (subjects.some((s: Subject) => s.name.toLowerCase() === subject.name.toLowerCase())) {
        return;
      }

      // Create the new subject data without any undefined values
      const newSubjectData: Subject = {
        name: subject.name,
        description: subject.description || "",
        studyStyle: subject.studyStyle || "spaced-repetition",
        masteryPath: subject.masteryPath || {
          currentLevel: 1,
          nextLevel: 2,
          progress: 0,
        },
        xp: subject.xp || 0,
        level: subject.level || 1,
        totalStudyTime: subject.totalStudyTime || 0,
        topics: subject.topics || [],
        sessions: subject.sessions || [],
      };

      // Add exam mode data if exam mode is selected
      if (subject.studyStyle === "exam-mode") {
        newSubjectData.examMode = {
          isEnabled: true,
          totalScore: 0,
          lastAttempt: new Date().toISOString(),
          weakAreas: [],
          topicScores: {},
        };
      }

      const updatedSubjects = [...subjects, newSubjectData];
      await updateDoc(userDoc, { subjects: updatedSubjects });
      setSubject(newSubjectData);
    } catch (err) {
      console.error("Error creating subject:", err);
    }
  };

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !subject || !newTopic.name.trim()) return;

    try {
      const userDoc = doc(db, "users", user.uid);
      const userData = await getDoc(userDoc);
      const userDataObj = userData.data();
      const subjects = Array.isArray(userDataObj?.subjects) ? userDataObj.subjects : [];
      
      const subjectIndex = subjects.findIndex((s: Subject) => s.name === subject.name);
      if (subjectIndex === -1) return;

      // Check for duplicate topic names
      if (subjects[subjectIndex].topics.some((t: Topic) => t.name.toLowerCase() === newTopic.name.toLowerCase())) {
        return;
      }

      const newTopicData: Topic = {
        id: crypto.randomUUID(),
        name: newTopic.name,
        description: newTopic.description,
        masteryLevel: 1,
        lastStudied: new Date().toISOString(),
        totalStudyTime: 0,
        concepts: [],
        xp: 0,
        level: 1,
        activities: [],
        currentPhase: "initial" as Phase,
      };

      // Update the topics array
      const updatedTopics = [...subjects[subjectIndex].topics, newTopicData];
      
      // Update the subject in the subjects array
      const updatedSubjects = [...subjects];
      updatedSubjects[subjectIndex] = {
        ...subjects[subjectIndex],
        topics: updatedTopics,
      };

      // Update Firestore
      await updateDoc(userDoc, { subjects: updatedSubjects });
      
      // Update local state
      setSubject(updatedSubjects[subjectIndex]);
      setNewTopic({ name: "", description: "" });
    } catch (err) {
      console.error("Error adding topic:", err);
    }
  };

  const handleDeleteTopic = async (topicName: string) => {
    if (!user || !subject) return;

    if (!confirm(`Are you sure you want to delete "${topicName}"?`)) {
      return;
    }

    try {
      const userDoc = doc(db, "users", user.uid);
      const userData = await getDoc(userDoc);
      const userDataObj = userData.data();
      const subjects = Array.isArray(userDataObj?.subjects) ? userDataObj.subjects : [];
      
      const subjectIndex = subjects.findIndex((s: Subject) => s.name === subject.name);
      if (subjectIndex === -1) return;

      const updatedSubject = {
        ...subjects[subjectIndex],
        topics: subjects[subjectIndex].topics.filter((t: Topic) => t.name !== topicName)
      };

      const updatedSubjects = [...subjects];
      updatedSubjects[subjectIndex] = updatedSubject;

      await updateDoc(userDoc, { subjects: updatedSubjects });
      setSubject(updatedSubject);
    } catch (err) {
      console.error("Error deleting topic:", err);
    }
  };

  const handleDeleteSubject = async () => {
    if (!user || !subject) return;

    if (!confirm(`Are you sure you want to delete "${subject.name}"?`)) {
      return;
    }

    try {
      const userDoc = doc(db, "users", user.uid);
      const userData = await getDoc(userDoc);
      const userDataObj = userData.data();
      const subjects = Array.isArray(userDataObj?.subjects) ? userDataObj.subjects : [];
      
      const updatedSubjects = subjects.filter((s: Subject) => s.name !== subject.name);
      await updateDoc(userDoc, { subjects: updatedSubjects });
      
      router.push("/subjects");
    } catch (err) {
      console.error("Error deleting subject:", err);
    }
  };

  const handleAddConcept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !subject || !selectedTopic || !newConcept.name.trim()) return;

    try {
      const userDoc = doc(db, "users", user.uid);
      const userData = await getDoc(userDoc);
      const userDataObj = userData.data();
      const subjects = Array.isArray(userDataObj?.subjects) ? userDataObj.subjects : [];
      
      const subjectIndex = subjects.findIndex((s: Subject) => s.name === subject.name);
      if (subjectIndex === -1) return;

      const topicIndex = subjects[subjectIndex].topics.findIndex(
        (t: Topic) => t.name === selectedTopic.name
      );
      if (topicIndex === -1) return;

      const newConceptData: Topic = {
        id: crypto.randomUUID(),
        name: newConcept.name,
        description: newConcept.description || "",
        masteryLevel: 1,
        lastStudied: new Date().toISOString(),
        totalStudyTime: 0,
        concepts: [],
        xp: 0,
        level: 1,
        activities: [],
        currentPhase: "initial" as Phase,
        studySessions: [],
        framework: undefined,
      };

      // Create a new copy of the topics array with the updated concept
      const updatedTopics = [...subjects[subjectIndex].topics];
      const updatedTopic = {
        ...updatedTopics[topicIndex],
        concepts: [...(updatedTopics[topicIndex].concepts || []), newConceptData],
        id: updatedTopics[topicIndex].id,
        activities: updatedTopics[topicIndex].activities,
      } as Topic;
      updatedTopics[topicIndex] = updatedTopic;

      // Create a new copy of the subjects array with the updated topics
      const updatedSubjects = [...subjects];
      updatedSubjects[subjectIndex] = {
        ...subjects[subjectIndex],
        topics: updatedTopics,
      };

      // Update Firestore
      await updateDoc(userDoc, { subjects: updatedSubjects });
      
      // Update local state
      setSubject(updatedSubjects[subjectIndex]);
      setSelectedTopic(() => updatedTopic as Topic | null);  // Properly cast to Topic | null
      setNewConcept({ name: "", description: "" });
    } catch (err) {
      console.error("Error adding concept:", err);
    }
  };

  const handleActivityComplete = async (concept: Topic, activityType: string) => {
    if (!user || !subject || !selectedTopic) return;

    try {
      const userDoc = doc(db, "users", user.uid);
      const userData = await getDoc(userDoc);
      const userDataObj = userData.data();
      const subjects = Array.isArray(userDataObj?.subjects) ? userDataObj.subjects : [];
      
      const subjectIndex = subjects.findIndex((s: Subject) => s.name === subject.name);
      if (subjectIndex === -1) return;

      const topicIndex = subjects[subjectIndex].topics.findIndex(
        (t: Topic) => t.name === selectedTopic.name
      );
      if (topicIndex === -1) return;

      const conceptIndex = subjects[subjectIndex].topics[topicIndex].concepts?.findIndex(
        (c: Topic) => c.name === concept.name
      );
      if (conceptIndex === -1 || conceptIndex === undefined) return;

      // Get or create the current phase
      const currentPhase = concept.currentPhase || 'initial';
      const currentPhaseData = concept.studySessions?.[concept.studySessions.length - 1]?.phase || 
        SpacedRepetition.createInitialPhase();

      // Update the activity
      const updatedPhase = SpacedRepetition.updateActivity(
        currentPhaseData,
        activityType,
        true,
        activityNotes
      );

      // Check if phase is complete and move to next phase if needed
      let nextPhase: 'initial' | 'consolidation' | 'mastery' = currentPhase;
      if (SpacedRepetition.isPhaseComplete(updatedPhase)) {
        nextPhase = SpacedRepetition.getNextPhase(currentPhase);
      }

      // Create new study session
      const newStudySession: StudySession = {
        date: new Date().toISOString(),
        duration: studyDuration,
        rating: studyRating,
        notes: studyNotes,
        nextReviewDate: new Date().toISOString(), // Will be updated by FSRS
        phase: updatedPhase,
        totalXpEarned: updatedPhase.xpEarned
      };

      // Update the concept
      const updatedConcept = {
        ...concept,
        studySessions: [...(concept.studySessions || []), newStudySession],
        currentPhase: nextPhase,
        masteryLevel: Math.min(5, concept.masteryLevel + (updatedPhase.xpEarned > 0 ? 1 : 0)),
        totalStudyTime: concept.totalStudyTime + studyDuration,
        lastStudied: new Date().toISOString()
      };

      // Update the topic with the new concept
      const updatedTopic = {
        ...subjects[subjectIndex].topics[topicIndex],
        concepts: [
          ...(subjects[subjectIndex].topics[topicIndex].concepts || []).slice(0, conceptIndex),
          updatedConcept,
          ...(subjects[subjectIndex].topics[topicIndex].concepts || []).slice(conceptIndex + 1)
        ]
      };

      // Update the subject with the new topic
      const updatedSubject = {
        ...subjects[subjectIndex],
        topics: [
          ...subjects[subjectIndex].topics.slice(0, topicIndex),
          updatedTopic,
          ...subjects[subjectIndex].topics.slice(topicIndex + 1)
        ]
      };

      // Update Firestore
      const updatedSubjects = [...subjects];
      updatedSubjects[subjectIndex] = updatedSubject;

      await updateDoc(userDoc, { subjects: updatedSubjects });
      
      // Update local state
      setSubject(updatedSubject);
      setSelectedTopic(updatedTopic);
      setSelectedConcept(updatedConcept);
      setStudyRating(3);
      setStudyNotes("");
      setStudyDuration(30);
      setActivityNotes("");
      setSelectedActivity(null);

      // Add to Google Calendar
      try {
        const response = await fetch('/api/calendar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: `Review: ${concept.name}`,
            description: `Review ${concept.name} in ${subject.name}`,
            startTime: new Date(newStudySession.nextReviewDate).toISOString(),
            endTime: new Date(new Date(newStudySession.nextReviewDate).getTime() + 30 * 60000), // 30 minutes
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to add to calendar');
        }
      } catch (err) {
        console.error('Error adding to calendar:', err);
        // Don't show error to user as this is non-critical
      }

      // Update framework progress
      if (concept.framework) {
        const phase = getPhaseFromActivity(activityType);
        const score = calculateActivityScore(activityType, studyRating);
        const updatedFramework = updateFrameworkProgress(concept.framework, phase, score);
        
        // Update the concept with new framework data
        const updatedConcept = {
          ...concept,
          framework: updatedFramework
        };

        // Update the topic with the new concept
        const updatedTopic = {
          ...subjects[subjectIndex].topics[topicIndex],
          concepts: [
            ...(subjects[subjectIndex].topics[topicIndex].concepts || []).slice(0, conceptIndex),
            updatedConcept,
            ...(subjects[subjectIndex].topics[topicIndex].concepts || []).slice(conceptIndex + 1)
          ]
        };

        // Update the subject with the new topic
        const updatedSubject = {
          ...subjects[subjectIndex],
          topics: [
            ...subjects[subjectIndex].topics.slice(0, topicIndex),
            updatedTopic,
            ...subjects[subjectIndex].topics.slice(topicIndex + 1)
          ]
        };

        // Update Firestore
        const updatedSubjects = [...subjects];
        updatedSubjects[subjectIndex] = updatedSubject;

        await updateDoc(userDoc, { subjects: updatedSubjects });
        
        // Update local state
        setSubject(updatedSubject);
        setSelectedTopic(updatedTopic);
        setSelectedConcept(updatedConcept);
      }
    } catch (err) {
      console.error("Error completing activity:", err);
    }
  };

  const handleManageActivity = async (action: 'add' | 'edit' | 'delete', activityType?: string) => {
    if (!user || !subject || !selectedTopic || !selectedConcept) return;

    try {
      const userDoc = doc(db, "users", user.uid);
      const userData = await getDoc(userDoc);
      const userDataObj = userData.data();
      const subjects = Array.isArray(userDataObj?.subjects) ? userDataObj.subjects : [];
      
      const subjectIndex = subjects.findIndex((s: Subject) => s.name === subject.name);
      if (subjectIndex === -1) return;

      const topicIndex = subjects[subjectIndex].topics.findIndex(
        (t: Topic) => t.name === selectedTopic.name
      );
      if (topicIndex === -1) return;

      const conceptIndex = subjects[subjectIndex].topics[topicIndex].concepts?.findIndex(
        (c: Topic) => c.name === selectedConcept.name
      );
      if (conceptIndex === -1 || conceptIndex === undefined) return;

      const currentPhase = selectedConcept.currentPhase || 'initial';
      const currentPhaseData = selectedConcept.studySessions?.[selectedConcept.studySessions.length - 1]?.phase || 
        SpacedRepetition.createInitialPhase();

      let updatedPhase = { ...currentPhaseData };

      if (action === 'add') {
        // Add new activity
        updatedPhase.activities.push({
          type: 'video' as const,
          xp: 10,
          completed: false,
          notes: ''
        });
      } else if (action === 'edit' && activityType && editingActivity) {
        // Edit existing activity
        const activityIndex = updatedPhase.activities.findIndex(a => a.type === activityType);
        if (activityIndex !== -1) {
          updatedPhase.activities[activityIndex] = {
            ...updatedPhase.activities[activityIndex],
            ...editingActivity
          };
        }
      } else if (action === 'delete' && activityType) {
        // Delete activity
        updatedPhase.activities = updatedPhase.activities.filter(a => a.type !== activityType);
      }

      // Create new study session with updated phase
      const newStudySession: StudySession = {
        date: new Date().toISOString(),
        duration: 0,
        rating: 0,
        notes: '',
        nextReviewDate: new Date().toISOString(),
        phase: updatedPhase,
        totalXpEarned: 0
      };

      // Update the concept
      const updatedConcept = {
        ...selectedConcept,
        studySessions: [...(selectedConcept.studySessions || []), newStudySession],
        currentPhase: currentPhase
      };

      // Update the topic with the new concept
      const updatedTopic = {
        ...subjects[subjectIndex].topics[topicIndex],
        concepts: [
          ...(subjects[subjectIndex].topics[topicIndex].concepts || []).slice(0, conceptIndex),
          updatedConcept,
          ...(subjects[subjectIndex].topics[topicIndex].concepts || []).slice(conceptIndex + 1)
        ]
      };

      // Update the subject with the new topic
      const updatedSubject = {
        ...subjects[subjectIndex],
        topics: [
          ...subjects[subjectIndex].topics.slice(0, topicIndex),
          updatedTopic,
          ...subjects[subjectIndex].topics.slice(topicIndex + 1)
        ]
      };

      // Update Firestore
      const updatedSubjects = [...subjects];
      updatedSubjects[subjectIndex] = updatedSubject;

      await updateDoc(userDoc, { subjects: updatedSubjects });
      
      // Update local state
      setSubject(updatedSubject);
      setSelectedTopic(updatedTopic);
      setSelectedConcept(updatedConcept);
      setIsEditingActivity(false);
      setEditingActivity(null);
    } catch (err) {
      console.error("Error updating activities:", err);
    }
  };

  const analyzeProgressAndGetRecommendations = (concept: Topic): StudyRecommendation => {
    // Calculate metrics
    const metrics: ProgressMetrics = {
      totalStudyTime: concept.totalStudyTime || 0,
      videoCount: 0,
      bookCount: 0,
      recallCount: 0,
      mindmapCount: 0,
      questionsCount: 0,
      teachingCount: 0,
      averageRating: 0,
      lastReviewDate: concept.lastStudied || new Date().toISOString(),
      masteryLevel: concept.masteryLevel || 1,
      xp: concept.xp || 0,
      level: concept.level || 1
    };

    // Count completed activities
    concept.studySessions?.forEach(session => {
      session.phase.activities.forEach(activity => {
        if (activity.completed) {
          switch (activity.type) {
            case 'video': metrics.videoCount++; break;
            case 'book': metrics.bookCount++; break;
            case 'recall': metrics.recallCount++; break;
            case 'mindmap': metrics.mindmapCount++; break;
            case 'questions': metrics.questionsCount++; break;
            case 'teaching': metrics.teachingCount++; break;
          }
        }
      });
    });

    // Calculate average rating
    const ratings = concept.studySessions?.map(s => s.rating) || [];
    metrics.averageRating = ratings.length > 0 
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length 
      : 0;

    // Generate recommendations based on metrics
    const recommendations: StudyRecommendation[] = [];

    // If mastery level is low, focus on understanding
    if (metrics.masteryLevel < 3) {
      if (metrics.videoCount < 2) {
        recommendations.push({
          nextActivity: 'video',
          reason: 'Videos help build initial understanding. Watch more to strengthen your foundation.',
          priority: 'high',
          estimatedTime: 30,
          suggestedResources: ['Khan Academy', 'YouTube educational channels']
        });
      }
      if (metrics.bookCount < 1) {
        recommendations.push({
          nextActivity: 'book',
          reason: 'Reading helps reinforce concepts. Try reading about this topic.',
          priority: 'medium',
          estimatedTime: 45
        });
      }
    }

    // If understanding is good, focus on recall
    if (metrics.masteryLevel >= 3) {
      if (metrics.recallCount < 3) {
        recommendations.push({
          nextActivity: 'recall',
          reason: 'Active recall is crucial for long-term retention. Practice recalling this concept.',
          priority: 'high',
          estimatedTime: 20
        });
      }
      if (metrics.questionsCount < 5) {
        recommendations.push({
          nextActivity: 'questions',
          reason: 'Practice questions help apply knowledge. Try solving more problems.',
          priority: 'high',
          estimatedTime: 30
        });
      }
    }

    // If mastery is high, focus on teaching
    if (metrics.masteryLevel >= 4) {
      if (metrics.teachingCount < 2) {
        recommendations.push({
          nextActivity: 'teaching',
          reason: 'Teaching others is the best way to master a concept. Try explaining this to someone.',
          priority: 'high',
          estimatedTime: 40
        });
      }
    }

    // If mindmaps are lacking, suggest creating one
    if (metrics.mindmapCount < 1) {
      recommendations.push({
        nextActivity: 'mindmap',
        reason: 'Mindmaps help visualize connections. Create one to organize your understanding.',
        priority: 'medium',
        estimatedTime: 25
      });
    }

    // Sort recommendations by priority and return the highest priority one
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    })[0] || {
      nextActivity: 'recall',
      reason: 'Regular recall practice is essential for maintaining knowledge.',
      priority: 'high',
      estimatedTime: 20
    };
  };

  useEffect(() => {
    if (selectedConcept) {
      const newRecommendation = analyzeProgressAndGetRecommendations(selectedConcept);
      setRecommendation(newRecommendation);
    } else {
      setRecommendation(null);
    }
  }, [selectedConcept]);

  const RecommendationCard = ({ recommendation }: { recommendation: StudyRecommendation }) => (
    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg mb-4">
      <h3 className="text-lg font-semibold text-blue-800 mb-2">AI Study Recommendation</h3>
      <div className="space-y-2">
        <p className="text-blue-700">
          <span className="font-medium">Next Activity:</span> {recommendation.nextActivity}
        </p>
        <p className="text-blue-700">
          <span className="font-medium">Reason:</span> {recommendation.reason}
        </p>
        <p className="text-blue-700">
          <span className="font-medium">Priority:</span> {recommendation.priority}
        </p>
        <p className="text-blue-700">
          <span className="font-medium">Estimated Time:</span> {recommendation.estimatedTime} minutes
        </p>
        {recommendation.suggestedResources && (
          <div>
            <p className="font-medium text-blue-700">Suggested Resources:</p>
            <ul className="list-disc list-inside text-blue-700">
              {recommendation.suggestedResources.map((resource, index) => (
                <li key={index}>{resource}</li>
              ))}
            </ul>
          </div>
        )}
        <button
          onClick={() => setSelectedActivity(recommendation.nextActivity)}
          className="mt-2 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
        >
          Start Recommended Activity
        </button>
      </div>
    </div>
  );

  const initializeStudyFramework = (concept: Topic): StudyFramework => {
    return {
      currentPhase: 'learnRecall',
      progress: {
        learnRecall: 0,
        testingEffect: 0,
        reflectionDiagnosis: 0,
        integration: 0,
        teaching: 0
      },
      lastActivityDate: new Date().toISOString(),
      nextReviewDate: new Date().toISOString(),
      masteryScore: 0,
      retentionScore: 0,
      clarityScore: 0
    };
  };

  const updateFrameworkProgress = (framework: StudyFramework, phase: keyof StudyFramework['progress'], score: number): StudyFramework => {
    return {
      ...framework,
      progress: {
        ...framework.progress,
        [phase]: Math.min(100, framework.progress[phase] + score)
      },
      lastActivityDate: new Date().toISOString(),
      nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Next day
      masteryScore: calculateMasteryScore(framework.progress),
      retentionScore: calculateRetentionScore(framework),
      clarityScore: calculateClarityScore(framework)
    };
  };

  const getPhaseFromActivity = (activityType: string): keyof StudyFramework['progress'] => {
    const phaseMap: Record<string, keyof StudyFramework['progress']> = {
      'video': 'learnRecall',
      'book': 'learnRecall',
      'recall': 'learnRecall',
      'mindmap': 'integration',
      'questions': 'testingEffect',
      'teaching': 'teaching'
    };
    return phaseMap[activityType] || 'learnRecall';
  };

  const calculateActivityScore = (activityType: string, rating: number): number => {
    // Implement your scoring logic based on the activity type and rating
    // For example, you can use a simple mapping or a more complex algorithm
    const scoreMap: Record<string, number> = {
      'video': rating * 0.2,
      'book': rating * 0.2,
      'recall': rating * 0.2,
      'mindmap': rating * 0.2,
      'questions': rating * 0.2,
      'teaching': rating * 0.2
    };
    return scoreMap[activityType] || 0;
  };

  const generateAIPrompt = async (phase: string, concept: Topic): Promise<StudyAIPrompt> => {
    const prompt = await generateStudyPrompt(concept.name, phase);
    return {
      prompt,
      score: 0
    };
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

  if (!subject) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="study-alert-error">
          Subject not found
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="study-card">
        <h1 className="study-header">{subject?.name}</h1>
        
        {subject?.examMode?.isEnabled && (
          <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Exam Mode Active</h3>
            <p>Total Score: {subject.examMode.totalScore}%</p>
            <p>Last Attempt: {new Date(subject.examMode.lastAttempt).toLocaleDateString()}</p>
            {subject.examMode.weakAreas.length > 0 && (
              <div>
                <p className="font-medium mt-2">Areas to Focus On:</p>
                <ul className="list-disc list-inside">
                  {subject.examMode.weakAreas.map((area, index) => (
                    <li key={index}>{area}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="study-divider" />

        <div className="mb-6">
          <h2 className="study-subheader">Add New Topic</h2>
          <form onSubmit={handleAddTopic} className="space-y-4">
            <div>
              <label className="study-label">Topic Name</label>
              <input
                type="text"
                value={newTopic.name}
                onChange={(e) => setNewTopic({ ...newTopic, name: e.target.value })}
                className="study-input"
                placeholder="Enter topic name"
              />
            </div>
            <div>
              <label className="study-label">Description</label>
              <textarea
                value={newTopic.description}
                onChange={(e) => setNewTopic({ ...newTopic, description: e.target.value })}
                className="study-textarea"
                placeholder="Enter topic description"
              />
            </div>
            <button type="submit" className="study-button-primary">
              Add Topic
            </button>
          </form>
        </div>

        <div className="study-divider" />

        <div>
          <h2 className="study-subheader">Topics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subject?.topics.map((topic) => (
              <div
                key={topic.name}
                className={`study-card cursor-pointer ${
                  selectedTopic?.name === topic.name ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => {
                  const selectedTopicData: Topic = {
                    ...topic,
                    id: (topic as any).id || crypto.randomUUID(),
                    activities: (topic as any).activities || [],
                    concepts: (topic.concepts || []) as Topic[],
                  };
                  setSelectedTopic(selectedTopicData);
                  setNewConcept({ name: "", description: "" });
                }}
              >
                <h3 className="text-lg font-semibold mb-2">{topic.name}</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-2">{topic.description}</p>
                <div className="flex items-center justify-between">
                  <span className="study-badge">
                    Mastery: {topic.masteryLevel}%
                  </span>
                  <span className="text-sm text-gray-500">
                    Last studied: {new Date(topic.lastStudied).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedTopic && (
          <div className="mt-8">
            <div className="study-card">
              <h2 className="study-subheader">{selectedTopic.name}</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">{selectedTopic.description}</p>

              <div className="study-divider" />

              <div className="mb-6">
                <h3 className="study-subheader">Add New Concept</h3>
                <form onSubmit={handleAddConcept} className="space-y-4">
                  <div>
                    <label className="study-label">Concept Name</label>
                    <input
                      type="text"
                      value={newConcept.name}
                      onChange={(e) => setNewConcept({ ...newConcept, name: e.target.value })}
                      className="study-input"
                      placeholder="Enter concept name"
                    />
                  </div>
                  <div>
                    <label className="study-label">Description</label>
                    <textarea
                      value={newConcept.description}
                      onChange={(e) => setNewConcept({ ...newConcept, description: e.target.value })}
                      className="study-textarea"
                      placeholder="Enter concept description"
                    />
                  </div>
                  <button type="submit" className="study-button-primary">
                    Add Concept
                  </button>
                </form>
              </div>

              <div className="study-divider" />

              <div>
                <h3 className="study-subheader">Concepts</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedTopic.concepts.map((concept) => (
                    <div
                      key={concept.name}
                      className={`study-card cursor-pointer ${
                        selectedConcept?.name === concept.name ? 'ring-2 ring-blue-500' : ''
                      }`}
                      onClick={() => {
                        setSelectedConcept(concept);
                        setSelectedActivity(null);
                      }}
                    >
                      <h4 className="text-lg font-semibold mb-2">{concept.name}</h4>
                      <p className="text-gray-600 dark:text-gray-300 mb-2">{concept.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="study-badge">
                          Mastery: {concept.masteryLevel}%
                        </span>
                        <span className="text-sm text-gray-500">
                          Last studied: {new Date(concept.lastStudied).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedConcept && (
          <div className="mt-8">
            <div className="study-card">
              <h2 className="study-subheader">{selectedConcept.name}</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">{selectedConcept.description}</p>

              <div className="study-divider" />

              <div className="mb-6">
                <h3 className="study-subheader">Study Activities</h3>
                <div className="space-y-4">
                  {selectedConcept.activities.map((activity) => (
                    <div key={activity.id} className="study-card">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-lg font-semibold">{activity.type}</h4>
                        <span className="study-badge">
                          {activity.status}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-300 mb-2">{activity.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                          Duration: {activity.duration} minutes
                        </span>
                        <button
                          onClick={() => handleActivityComplete(selectedConcept, activity.type)}
                          className="study-button-primary"
                        >
                          Complete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="study-divider" />

              <div>
                <h3 className="study-subheader">Add New Activity</h3>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleManageActivity('add');
                }} className="space-y-4">
                  <div>
                    <label className="study-label">Activity Type</label>
                    <select
                      value={selectedActivity || ''}
                      onChange={(e) => setSelectedActivity(e.target.value)}
                      className="study-input"
                    >
                      <option value="">Select activity type</option>
                      <option value="video">Video</option>
                      <option value="book">Book</option>
                      <option value="recall">Recall</option>
                      <option value="mindmap">Mind Map</option>
                      <option value="questions">Questions</option>
                      <option value="teaching">Teaching</option>
                    </select>
                  </div>
                  <button type="submit" className="study-button-primary">
                    Add Activity
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface StudyFrameworkProps {
  framework: StudyFramework;
  concept: Topic;
  onUpdate: (framework: StudyFramework) => void;
}

const StudyFrameworkComponent: React.FC<StudyFrameworkProps> = ({ framework, concept, onUpdate }) => {
  const [currentPrompt, setCurrentPrompt] = useState<AIPrompt | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAnswerSubmit = async (answer: string) => {
    if (!currentPrompt) return;
    
    setIsLoading(true);
    try {
      const updatedPrompt = evaluateUserAnswer(currentPrompt, answer);
      setCurrentPrompt(updatedPrompt);
      
      // Update framework progress
      const updatedFramework = {
        ...framework,
        progress: {
          ...framework.progress,
          [framework.currentPhase]: Math.min(1, framework.progress[framework.currentPhase] + 0.1)
        }
      };
      onUpdate(updatedFramework);
    } finally {
      setIsLoading(false);
    }
  };

  const generateNewPrompt = async () => {
    setIsLoading(true);
    try {
      const prompt = await generateStudyPrompt(concept.name, framework.currentPhase);
      const newPrompt: AIPrompt = {
        prompt,
        score: 0
      };
      setCurrentPrompt(newPrompt);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Study Framework</h3>
        <button
          onClick={generateNewPrompt}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? 'Generating...' : 'New Prompt'}
        </button>
      </div>
      
      {currentPrompt && (
        <AIPromptComponent
          prompt={currentPrompt}
          onSubmit={handleAnswerSubmit}
        />
      )}
    </div>
  );
};

const AIPromptComponent: React.FC<{
  prompt: AIPrompt;
  onSubmit: (answer: string) => Promise<void>;
}> = ({ prompt, onSubmit }) => {
  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(answer);
      setAnswer('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-gray-100 rounded-lg">
        <p className="font-medium">{prompt.prompt}</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          className="w-full p-2 border rounded"
          rows={4}
          placeholder="Type your answer here..."
          disabled={isSubmitting}
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Answer'}
        </button>
      </form>
      {prompt.aiFeedback && (
        <div className="p-4 bg-green-100 rounded-lg">
          <h4 className="font-medium">AI Feedback:</h4>
          <p>{prompt.aiFeedback}</p>
          {prompt.score !== undefined && (
            <p className="mt-2">Score: {prompt.score}/10</p>
          )}
        </div>
      )}
    </div>
  );
}; 