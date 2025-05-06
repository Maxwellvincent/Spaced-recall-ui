"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import Link from "next/link";
import type { Subject, Topic, Concept, StudySession, ReviewLog } from "@/types/study";
import { useAuth } from "@/lib/auth";
import { Loader2, ArrowLeft, Save, Brain, Plus, BookOpen, Video, PenTool, History, Edit2, Trash2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { activityTypes, difficultyLevels, calculateSessionXP } from "@/lib/xpSystem";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuizRecommendations } from '@/components/QuizRecommendations';
import { ReviewScheduler } from '@/components/ReviewScheduler';

interface PageProps {
  params: {
    subjectId: string;
    topicName: string;
    conceptName: string;
  }
}

export default function ConceptPage({ params }: PageProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [concept, setConcept] = useState<Concept | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedConcept, setEditedConcept] = useState<Partial<Concept>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddSession, setShowAddSession] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  const [newSession, setNewSession] = useState<Partial<StudySession>>({
    date: new Date().toISOString(),
    duration: 30,
    notes: '',
    activityType: 'study',
    difficulty: 'medium',
    xpGained: 0,
    masteryGained: 0,
  });
  const [questions, setQuestions] = useState<Array<{
    question: string;
    answer: string;
    explanation: string;
    difficulty: number;
  }>>([]);
  const [activeTab, setActiveTab] = useState('details');
  const [editingSession, setEditingSession] = useState<StudySession | null>(null);
  const [quizPreferences, setQuizPreferences] = useState({
    numberOfQuestions: 5,
    questionFormat: 'multiple-choice', // or 'fill-in-blank'
    difficulty: 'medium',
    showSolutions: true,
    displayFormat: 'interactive' // or 'printable'
  });

  const [quizQuestions, setQuizQuestions] = useState<Array<{
    question: string;
    options?: string[];
    correctAnswer: string;
    explanation: string;
    userAnswer?: string;
    isCorrect?: boolean;
  }>>([]);

  const [showQuizPreferences, setShowQuizPreferences] = useState(false);
  const [isQuizActive, setIsQuizActive] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    const fetchData = async () => {
      try {
        console.log('Fetching data with params:', {
          subjectId: params.subjectId,
          topicName: params.topicName,
          conceptName: params.conceptName
        });

        const subjectRef = doc(db, 'subjects', params.subjectId);
        const subjectDoc = await getDoc(subjectRef);
        
        if (!subjectDoc.exists()) {
          console.log('Subject not found');
          setError('Subject not found');
          return;
        }

        const subjectData = subjectDoc.data() as Subject;
        console.log('Subject data:', subjectData);
        setSubject(subjectData);

        // First decode %25 to % then decode the rest
        const decodedTopicName = decodeURIComponent(
          decodeURIComponent(params.topicName.replace(/%25/g, '%'))
        ).trim();
        
        console.log('Decoded topic name:', decodedTopicName);
        console.log('Available topics:', subjectData.topics.map(t => t.name));
        
        const topic = subjectData.topics.find(t => 
          t.name.trim().toLowerCase() === decodedTopicName.toLowerCase()
        );

        if (!topic) {
          console.log('Topic not found. Looking for:', decodedTopicName);
          setError('Topic not found');
          return;
        }

        console.log('Found topic:', topic);
        setTopic(topic);

        // Similarly handle concept name
        const decodedConceptName = decodeURIComponent(
          decodeURIComponent(params.conceptName.replace(/%25/g, '%'))
        ).trim();
        
        console.log('Decoded concept name:', decodedConceptName);
        console.log('Available concepts:', topic.concepts?.map(c => c.name));
        
        const concept = topic.concepts?.find(c => 
          c.name.trim().toLowerCase() === decodedConceptName.toLowerCase()
        );

        if (!concept) {
          console.log('Concept not found. Looking for:', decodedConceptName);
          setError('Concept not found');
          return;
        }

        console.log('Found concept:', concept);
        setConcept(concept);
        setEditedConcept(concept);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Error loading concept');
      }
    };

    fetchData();
  }, [user, loading, params.subjectId, params.topicName, params.conceptName, router]);

  const handleSave = async () => {
    if (!subject || !topic || !concept || !editedConcept) return;

    setIsSaving(true);
    try {
      // Update the concept within the topic
      const updatedConcepts = topic.concepts?.map(c =>
        c.name === concept.name ? { ...c, ...editedConcept } : c
      ) || [];

      // Update the topic with new concepts
      const updatedTopics = subject.topics.map(t =>
        t.name === topic.name ? { ...t, concepts: updatedConcepts } : t
      );

      // Update in Firestore
      const subjectRef = doc(db, 'subjects', params.subjectId);
      await updateDoc(subjectRef, {
        topics: updatedTopics
      });

      // Update local state
      setConcept({ ...concept, ...editedConcept });
      setIsEditing(false);
      
      toast({
        title: "Success",
        description: "Concept updated successfully",
      });
    } catch (error) {
      console.error('Error updating concept:', error);
      toast({
        title: "Error",
        description: "Failed to update concept",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSession = async () => {
    if (!subject || !topic || !concept) return;

    try {
      // Ensure we have valid activity type and difficulty
      const activityType = newSession.activityType as keyof typeof activityTypes;
      const difficulty = newSession.difficulty as keyof typeof difficultyLevels;
      
      if (!activityTypes[activityType] || !difficultyLevels[difficulty]) {
        throw new Error('Invalid activity type or difficulty level');
      }

      const { xp, masteryGained } = calculateSessionXP({
        activityType,
        difficulty,
        duration: newSession.duration || 0,
        currentLevel: concept.masteryLevel || 0,
      });

      const sessionToAdd = {
        ...newSession,
        id: crypto.randomUUID(),
        xpGained: xp,
        masteryGained: masteryGained,
      };

      // Update the concept
      const updatedConcept = {
        ...concept,
        masteryLevel: Math.min(100, (concept.masteryLevel || 0) + masteryGained),
        totalStudyTime: (concept.totalStudyTime || 0) + (newSession.duration || 0),
        lastStudied: new Date().toISOString(),
        studySessions: [...(concept.studySessions || []), sessionToAdd],
      };

      // Update the concepts within the topic
      const updatedConcepts = topic.concepts?.map(c =>
        c.name === concept.name ? updatedConcept : c
      ) || [];

      // Update the topic
      const updatedTopics = subject.topics.map(t =>
        t.name === topic.name ? { ...t, concepts: updatedConcepts } : t
      );

      // Update in Firestore
      const subjectRef = doc(db, 'subjects', params.subjectId);
      await updateDoc(subjectRef, {
        topics: updatedTopics
      });

      // Update local state
      setConcept(updatedConcept);
      setShowAddSession(false);

      // Generate questions if the activity type is reading or video
      if (['reading', 'video'].includes(activityType)) {
        await generateQuestions();
      }

      toast({
        title: "Success",
        description: `Session added: +${xp} XP, +${masteryGained}% Mastery`,
      });
    } catch (error) {
      console.error('Error adding session:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add study session",
        variant: "destructive",
      });
    }
  };

  const generateQuestions = async () => {
    try {
      // Here we would typically make an API call to an AI service
      // For now, we'll simulate it with example questions
      const sampleQuestions = [
        {
          question: "Explain the key principles of this concept in your own words.",
          answer: "This would be filled by AI based on the concept details",
          explanation: "Testing understanding and ability to explain clearly",
          difficulty: 3
        },
        {
          question: "How does this concept relate to other topics in the subject?",
          answer: "AI-generated answer based on relationships between concepts",
          explanation: "Testing ability to make connections",
          difficulty: 4
        },
        {
          question: "Provide a real-world example of this concept in action.",
          answer: "AI-generated practical example",
          explanation: "Testing application of knowledge",
          difficulty: 4
        },
        {
          question: "What are potential areas where this concept might be misunderstood?",
          answer: "AI-generated common misconceptions",
          explanation: "Testing depth of understanding",
          difficulty: 5
        },
        {
          question: "How would you teach this concept to someone else?",
          answer: "AI-generated teaching approach",
          explanation: "Testing ability to communicate knowledge",
          difficulty: 5
        }
      ];

      setQuestions(sampleQuestions);
      setShowQuestions(true);
    } catch (error) {
      console.error('Error generating questions:', error);
      toast({
        title: "Error",
        description: "Failed to generate questions",
        variant: "destructive",
      });
    }
  };

  const getWeakAreas = () => {
    if (!concept?.studySessions) return [];
    
    const weakAreas = [];
    
    if (concept.masteryLevel < 70) {
      weakAreas.push("Overall mastery is below 70% - more practice recommended");
    }

    const lastStudied = new Date(concept.lastStudied);
    const daysSinceLastStudy = Math.floor((Date.now() - lastStudied.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceLastStudy > 7) {
      weakAreas.push("It's been over a week since your last study session - review recommended");
    }

    const activityPerformance = concept.studySessions.reduce((acc, session) => {
      const activityType = session.activityType || 'study';
      if (!acc[activityType]) {
        acc[activityType] = {
          count: 0,
          totalMastery: 0
        };
      }
      acc[activityType].count++;
      acc[activityType].totalMastery += session.masteryGained || 0;
      return acc;
    }, {} as Record<string, { count: number; totalMastery: number }>);

    Object.entries(activityPerformance).forEach(([type, data]) => {
      const avgMastery = data.totalMastery / data.count;
      if (avgMastery < 15) {
        const activityName = activityTypes[type]?.name || type;
        weakAreas.push(`Low mastery gain in ${activityName} activities - try different study methods`);
      }
    });

    return weakAreas;
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!subject || !topic || !concept) return;

    try {
      // Find the session to get its contribution to mastery and XP
      const session = concept.studySessions?.find(s => s.id === sessionId);
      if (!session) return;

      // Calculate the values to remove
      const xpToRemove = session.xpGained || 0;
      const masteryToRemove = session.masteryGained || 0;
      const timeToRemove = session.duration || 0;

      // Update the concept
      const updatedConcept = {
        ...concept,
        masteryLevel: Math.max(0, (concept.masteryLevel || 0) - masteryToRemove),
        totalStudyTime: Math.max(0, (concept.totalStudyTime || 0) - timeToRemove),
        studySessions: concept.studySessions?.filter(s => s.id !== sessionId) || []
      };

      // Update the concepts within the topic
      const updatedConcepts = topic.concepts?.map(c =>
        c.name === concept.name ? updatedConcept : c
      ) || [];

      // Update the topic
      const updatedTopics = subject.topics.map(t =>
        t.name === topic.name ? { ...t, concepts: updatedConcepts } : t
      );

      // Update in Firestore
      const subjectRef = doc(db, 'subjects', params.subjectId);
      await updateDoc(subjectRef, {
        topics: updatedTopics
      });

      // Update local state
      setConcept(updatedConcept);

      toast({
        title: "Success",
        description: "Study session deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: "Error",
        description: "Failed to delete study session",
        variant: "destructive",
      });
    }
  };

  const handleUpdateSession = async (sessionId: string, updatedData: Partial<StudySession>) => {
    if (!subject || !topic || !concept) {
      console.error('Missing required data:', { subject: !!subject, topic: !!topic, concept: !!concept });
      return;
    }

    try {
      console.log('Updating session with data:', { sessionId, updatedData });
      
      // Find the old session
      const oldSession = concept.studySessions?.find(s => s.id === sessionId);
      if (!oldSession) {
        console.error('Old session not found:', sessionId);
        return;
      }

      // Ensure we have valid activity type and difficulty
      const activityType = updatedData.activityType || oldSession.activityType;
      const difficulty = updatedData.difficulty || oldSession.difficulty;
      const duration = updatedData.duration ?? oldSession.duration ?? 0;
      
      console.log('Validated fields:', { activityType, difficulty, duration });

      // Calculate XP and mastery for the updated session
      const { xp: newXP, masteryGained: newMastery } = calculateSessionXP({
        activityType,
        difficulty,
        duration,
        currentLevel: concept.masteryLevel || 0,
      });

      console.log('Calculated new XP and mastery:', { newXP, newMastery });

      // Calculate the differences
      const xpDiff = newXP - (oldSession.xpGained || 0);
      const masteryDiff = newMastery - (oldSession.masteryGained || 0);
      const timeDiff = duration - (oldSession.duration || 0);

      // Create the updated session
      const updatedSession: StudySession = {
        ...oldSession,
        ...updatedData,
        activityType,
        difficulty,
        xpGained: newXP,
        masteryGained: newMastery,
        duration,
        date: updatedData.date || oldSession.date,
        notes: updatedData.notes ?? oldSession.notes ?? '',
      };

      console.log('Created updated session:', updatedSession);

      // Update the concept
      const updatedConcept = {
        ...concept,
        masteryLevel: Math.min(100, Math.max(0, (concept.masteryLevel || 0) + masteryDiff)),
        totalStudyTime: Math.max(0, (concept.totalStudyTime || 0) + timeDiff),
        studySessions: concept.studySessions?.map(s =>
          s.id === sessionId ? updatedSession : s
        ) || []
      };

      // Update the concepts within the topic
      const updatedConcepts = topic.concepts?.map(c =>
        c.name === concept.name ? updatedConcept : c
      ) || [];

      // Update the topic
      const updatedTopics = subject.topics.map(t =>
        t.name === topic.name ? { ...t, concepts: updatedConcepts } : t
      );

      console.log('About to update Firestore with new data');

      // Update in Firestore
      const subjectRef = doc(db, 'subjects', params.subjectId);
      await updateDoc(subjectRef, {
        topics: updatedTopics
      });

      console.log('Firestore update successful');

      // Update local state
      setConcept(updatedConcept);
      setEditingSession(null);

      toast({
        title: "Success",
        description: `Session updated: ${xpDiff >= 0 ? '+' : ''}${xpDiff} XP, ${masteryDiff >= 0 ? '+' : ''}${masteryDiff}% Mastery`,
      });
    } catch (error) {
      console.error('Error updating session:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update study session",
        variant: "destructive",
      });
    }
  };

  // Add this function to initialize a session for editing
  const initializeSessionForEditing = (session: StudySession) => {
    setEditingSession({
      ...session,
      activityType: session.activityType || 'study',
      difficulty: session.difficulty || 'medium',
      duration: session.duration || 0,
      date: session.date || new Date().toISOString(),
      notes: session.notes || '',
    });
  };

  // Update where we set the editing session
  const handleEditClick = (session: StudySession) => {
    initializeSessionForEditing(session);
  };

  const generateQuizQuestions = async () => {
    try {
      const prompt = {
        conceptName: concept.name,
        description: concept.description,
        numberOfQuestions: quizPreferences.numberOfQuestions,
        difficulty: quizPreferences.difficulty,
        format: quizPreferences.questionFormat,
        subject: subject?.name || '',
        topic: topic?.name || '',
      };

      console.log('Sending quiz generation request:', prompt);

      const response = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(prompt),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate quiz questions');
      }

      const data = await response.json();
      
      if (!data.questions || !Array.isArray(data.questions)) {
        throw new Error('Invalid response format from server');
      }

      console.log('Received quiz questions:', data.questions);
      
      setQuizQuestions(data.questions);
      setIsQuizActive(true);
      setQuizScore(null);

      toast({
        title: "Quiz Generated",
        description: `Created ${data.questions.length} questions. Good luck!`,
      });
    } catch (error) {
      console.error('Error generating quiz:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate quiz questions",
        variant: "destructive",
      });
      setIsQuizActive(false);
      setQuizQuestions([]);
      throw error; // Re-throw to be handled by the caller
    }
  };

  const handleGenerateQuiz = async () => {
    try {
      setIsQuizActive(false);
      setQuizQuestions([]);
      setQuizScore(null);
      
      toast({
        title: "Generating Quiz",
        description: "Please wait while we create your questions...",
      });
      
      await generateQuizQuestions();
    } catch (error) {
      console.error('Error in quiz generation:', error);
      // Error toast already shown in generateQuizQuestions
    }
  };

  const handleAnswerSubmission = (index: number, answer: string) => {
    const updatedQuestions = [...quizQuestions];
    updatedQuestions[index] = {
      ...updatedQuestions[index],
      userAnswer: answer,
      isCorrect: answer === updatedQuestions[index].correctAnswer
    };
    setQuizQuestions(updatedQuestions);
  };

  const calculateQuizScore = () => {
    const correctAnswers = quizQuestions.filter(q => q.isCorrect).length;
    const score = (correctAnswers / quizQuestions.length) * 100;
    setQuizScore(score);

    // Log this as a study session
    const newSession = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      activityType: 'practice',
      difficulty: quizPreferences.difficulty as keyof typeof difficultyLevels,
      duration: 15, // Estimated time
      notes: `Quiz completed with score: ${score}%`,
      xpGained: Math.round(score / 2), // XP based on score
      masteryGained: Math.round(score / 10) // Mastery based on score
    };

    handleAddSession();
  };

  const handleReviewScheduleUpdate = async (nextReview: string, interval: number, reviewLog?: ReviewLog) => {
    if (!subject || !topic || !concept) {
      toast({
        title: "Error",
        description: "Missing required data to update review schedule",
        variant: "destructive",
      });
      return;
    }

    // Store previous state for rollback
    const previousState = {
      concept: { ...concept },
      topic: { ...topic },
      subject: { ...subject }
    };

    try {
      // Validate the review date
      const reviewDate = new Date(nextReview);
      if (isNaN(reviewDate.getTime())) {
        throw new Error('Invalid review date');
      }

      if (interval <= 0) {
        throw new Error('Review interval must be positive');
      }

      // Create updated concept with new review schedule
      const updatedConcept = {
        ...concept,
        nextReview,
        reviewInterval: interval,
        reviewLogs: reviewLog 
          ? [...(concept.reviewLogs || []), reviewLog]
          : concept.reviewLogs || []
      };

      // Optimistically update local state
      setConcept(updatedConcept);

      // Update the concepts within the topic
      const updatedConcepts = topic.concepts?.map(c =>
        c.name === concept.name ? updatedConcept : c
      ) || [];

      // Create updated topic
      const updatedTopic = {
        ...topic,
        concepts: updatedConcepts
      };

      // Update local state optimistically
      setTopic(updatedTopic);

      // Update the topics in the subject
      const updatedTopics = subject.topics.map(t =>
        t.name === topic.name ? updatedTopic : t
      );

      // Update local state optimistically
      const updatedSubject = { ...subject, topics: updatedTopics };
      setSubject(updatedSubject);

      // Update in Firestore
      const subjectRef = doc(db, 'subjects', params.subjectId);
      await updateDoc(subjectRef, {
        topics: updatedTopics
      });

      toast({
        title: "Success",
        description: `Review scheduled for ${new Date(nextReview).toLocaleDateString()}`,
      });

    } catch (error) {
      console.error('Error updating review schedule:', error);
      
      // Revert optimistic updates on error
      setConcept(previousState.concept);
      setTopic(previousState.topic);
      setSubject(previousState.subject);

      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update review schedule",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-slate-200">Loading concept...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="bg-red-900/20 p-8 rounded-lg text-center max-w-md">
          <h2 className="text-2xl font-bold text-red-400 mb-4">{error}</h2>
          <p className="text-slate-300 mb-6">
            Unable to load the concept. Please try again later.
          </p>
          <Link 
            href={`/subjects/${params.subjectId}/topics/${encodeURIComponent(params.topicName)}`}
            className="inline-block bg-slate-800 text-white px-6 py-2 rounded-lg hover:bg-slate-700 transition"
          >
            Return to Topic
          </Link>
        </div>
      </div>
    );
  }

  if (!concept) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-slate-200">Loading concept details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Link 
        href={`/subjects/${params.subjectId}/topics/${params.topicName}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Topic
      </Link>

      <Tabs defaultValue="details" className="w-full" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800 border border-slate-700 p-1 mb-4">
          <TabsTrigger 
            value="details" 
            className="px-4 py-2 data-[state=active]:bg-blue-600"
          >
            Details
          </TabsTrigger>
          <TabsTrigger 
            value="study" 
            className="px-4 py-2 data-[state=active]:bg-blue-600"
          >
            Study & Practice
          </TabsTrigger>
          <TabsTrigger 
            value="history" 
            className="px-4 py-2 data-[state=active]:bg-blue-600"
          >
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <div className="bg-slate-800 rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedConcept.name || ''}
                    onChange={(e) => setEditedConcept({ ...editedConcept, name: e.target.value })}
                    className="text-2xl font-bold bg-slate-700 text-white rounded px-2 py-1 w-full"
                  />
                ) : (
                  <h1 className="text-2xl font-bold">{concept.name}</h1>
                )}
              </div>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1 text-sm text-slate-300 hover:text-white transition"
                      disabled={isSaving}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save Changes
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                  >
                    Edit Concept
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-2">Description</h2>
                {isEditing ? (
                  <textarea
                    value={editedConcept.description || ''}
                    onChange={(e) => setEditedConcept({ ...editedConcept, description: e.target.value })}
                    className="w-full h-32 bg-slate-700 text-white rounded p-2"
                  />
                ) : (
                  <p className="text-slate-300">{concept.description}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-700 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="h-5 w-5 text-blue-400" />
                    <h3 className="font-medium">Mastery Level</h3>
                  </div>
                  <p className="text-2xl font-bold">{concept.masteryLevel}%</p>
                  <div className="w-full bg-slate-600 rounded-full h-2 mt-2">
                    <div
                      className="bg-blue-600 rounded-full h-2 transition-all duration-300"
                      style={{ width: `${concept.masteryLevel}%` }}
                    />
                  </div>
                </div>

                <div className="bg-slate-700 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Last Studied</h3>
                  <p className="text-lg">{new Date(concept.lastStudied).toLocaleDateString()}</p>
                </div>

                <div className="bg-slate-700 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Study Time</h3>
                  <p className="text-lg">{concept.totalStudyTime || 0} minutes</p>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-4">Study Progress</h2>
                <div className="space-y-4">
                  {/* Add study progress tracking components here */}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="study">
          <div className="bg-slate-800 rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Study & Practice</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowQuizPreferences(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  <Brain className="h-4 w-4" />
                  Generate Quiz
                </button>
                <button
                  onClick={() => setShowAddSession(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Log Study Session
                </button>
              </div>
            </div>

            {/* Quiz Preferences Dialog */}
            <Dialog open={showQuizPreferences} onOpenChange={setShowQuizPreferences}>
              <DialogContent className="bg-slate-900 border-slate-800">
                <DialogHeader>
                  <DialogTitle>Quiz Preferences</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Number of Questions
                    </label>
                    <select
                      value={quizPreferences.numberOfQuestions}
                      onChange={(e) => setQuizPreferences({
                        ...quizPreferences,
                        numberOfQuestions: parseInt(e.target.value)
                      })}
                      className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-white"
                    >
                      <option value={5}>5 questions</option>
                      <option value={10}>10 questions</option>
                      <option value={15}>15 questions</option>
                      <option value={20}>20 questions</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Question Format
                    </label>
                    <select
                      value={quizPreferences.questionFormat}
                      onChange={(e) => setQuizPreferences({
                        ...quizPreferences,
                        questionFormat: e.target.value as 'multiple-choice' | 'fill-in-blank'
                      })}
                      className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-white"
                    >
                      <option value="multiple-choice">Multiple Choice</option>
                      <option value="fill-in-blank">Fill in the Blank</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Difficulty
                    </label>
                    <select
                      value={quizPreferences.difficulty}
                      onChange={(e) => setQuizPreferences({
                        ...quizPreferences,
                        difficulty: e.target.value
                      })}
                      className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-white"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="showSolutions"
                      checked={quizPreferences.showSolutions}
                      onChange={(e) => setQuizPreferences({
                        ...quizPreferences,
                        showSolutions: e.target.checked
                      })}
                      className="mr-2"
                    />
                    <label htmlFor="showSolutions" className="text-sm text-slate-300">
                      Show solutions after submission
                    </label>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowQuizPreferences(false)}
                      className="px-4 py-2 text-slate-300 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        await handleGenerateQuiz();
                        setShowQuizPreferences(false);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Start Quiz
                    </button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Quiz Questions */}
            {isQuizActive && (
              <div className="mt-6 space-y-6">
                <h3 className="text-lg font-medium">Quiz Questions</h3>
                {quizQuestions.map((question, index) => (
                  <div key={index} className="bg-slate-700/50 rounded-lg p-4">
                    <p className="font-medium mb-3">{index + 1}. {question.question}</p>
                    {question.options ? (
                      <div className="space-y-2">
                        {question.options.map((option, optIndex) => (
                          <label key={optIndex} className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name={`question-${index}`}
                              value={option}
                              checked={question.userAnswer === option}
                              onChange={(e) => handleAnswerSubmission(index, e.target.value)}
                              disabled={quizScore !== null}
                              className="text-blue-600"
                            />
                            <span className="text-slate-300">{option}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={question.userAnswer || ''}
                        onChange={(e) => handleAnswerSubmission(index, e.target.value)}
                        disabled={quizScore !== null}
                        className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-white"
                        placeholder="Enter your answer..."
                      />
                    )}
                    {quizScore !== null && quizPreferences.showSolutions && (
                      <div className="mt-3">
                        <p className={`text-sm ${question.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                          {question.isCorrect ? 'Correct!' : `Incorrect. The correct answer is: ${question.correctAnswer}`}
                        </p>
                        <p className="text-sm text-slate-400 mt-1">{question.explanation}</p>
                      </div>
                    )}
                  </div>
                ))}
                
                {quizScore === null && (
                  <button
                    onClick={calculateQuizScore}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mt-4"
                  >
                    Submit Quiz
                  </button>
                )}
                
                {quizScore !== null && (
                  <div className="bg-slate-700/50 rounded-lg p-4 mt-4">
                    <h4 className="text-lg font-medium">Quiz Results</h4>
                    <p className="text-2xl font-bold text-blue-400 mt-2">{quizScore}%</p>
                    
                    {/* Add QuizRecommendations component */}
                    <div className="mt-6">
                      <QuizRecommendations
                        subject={subject?.name || ''}
                        topic={topic?.name || ''}
                        conceptName={concept?.name || ''}
                        quizScore={quizScore}
                        incorrectAnswers={quizQuestions.filter(q => !q.isCorrect).map(q => ({
                          question: q.question,
                          userAnswer: q.userAnswer,
                          correctAnswer: q.correctAnswer,
                          explanation: q.explanation
                        }))}
                        difficulty={quizPreferences.difficulty}
                      />
                    </div>

                    <button
                      onClick={() => {
                        setIsQuizActive(false);
                        setQuizScore(null);
                        setQuizQuestions([]);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mt-4"
                    >
                      Start New Quiz
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* AI Recommendations Section */}
            <div className="bg-slate-700/50 rounded-lg p-4 mt-6">
              <h3 className="text-lg font-medium mb-3">AI Recommendations</h3>
              <div className="space-y-2">
                {getWeakAreas().map((area, index) => (
                  <div key={index} className="flex items-start gap-2 text-slate-300">
                    <div className="h-2 w-2 rounded-full bg-yellow-500 mt-2" />
                    <p>{area}</p>
                  </div>
                ))}
                {getWeakAreas().length === 0 && (
                  <p className="text-slate-300">Great work! Keep maintaining your current study habits.</p>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="bg-slate-800 rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-slate-50">Study History</h2>
              <div className="text-sm text-slate-400">
                Total Study Time: {concept?.totalStudyTime || 0} minutes
              </div>
            </div>
            <div className="space-y-4">
              {concept?.studySessions?.map((session) => (
                <div key={session.id} className="bg-slate-700/50 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-grow">
                      <h3 className="font-medium text-slate-200">
                        {activityTypes[session.activityType]?.name || session.activityType || 'Study Session'}
                      </h3>
                      <p className="text-sm text-slate-400">
                        {new Date(session.date).toLocaleDateString()} • {session.duration} minutes
                      </p>
                      {session.notes && (
                        <p className="mt-2 text-slate-300">{session.notes}</p>
                      )}
                      <div className="mt-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-600 text-slate-200 mr-2">
                          Difficulty: {difficultyLevels[session.difficulty]?.name || session.difficulty}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="text-right mb-2">
                        <p className="text-sm text-yellow-400">+{session.xpGained || 0} XP</p>
                        <p className="text-sm text-purple-400">+{session.masteryGained || 0}% Mastery</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditClick(session)}
                          className="p-1 text-slate-400 hover:text-blue-400 transition"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSession(session.id)}
                          className="p-1 text-slate-400 hover:text-red-400 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {(!concept?.studySessions || concept.studySessions.length === 0) && (
                <div className="text-center py-8 text-slate-400">
                  No study sessions recorded yet.
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Session Modal */}
      <Dialog open={showAddSession} onOpenChange={setShowAddSession}>
        <DialogContent 
          className="bg-slate-900 border-slate-800"
          aria-describedby="add-session-description"
        >
          <DialogHeader>
            <DialogTitle>Log Study Session</DialogTitle>
            <p id="add-session-description" className="text-sm text-slate-400">
              Record a new study session for this concept
            </p>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Activity Type
                </label>
                <select
                  value={newSession.activityType}
                  onChange={(e) => setNewSession({
                    ...newSession,
                    activityType: e.target.value as keyof typeof activityTypes
                  })}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-white"
                >
                  {Object.entries(activityTypes).map(([key, value]) => (
                    <option key={key} value={key}>{value.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Difficulty
                </label>
                <select
                  value={newSession.difficulty}
                  onChange={(e) => setNewSession({
                    ...newSession,
                    difficulty: e.target.value as keyof typeof difficultyLevels
                  })}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-white"
                >
                  {Object.entries(difficultyLevels).map(([key, value]) => (
                    <option key={key} value={key}>{value.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Duration (minutes)
              </label>
              <input
                type="number"
                value={newSession.duration}
                onChange={(e) => setNewSession({
                  ...newSession,
                  duration: parseInt(e.target.value)
                })}
                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Notes
              </label>
              <textarea
                value={newSession.notes}
                onChange={(e) => setNewSession({
                  ...newSession,
                  notes: e.target.value
                })}
                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-white h-24"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAddSession(false)}
                className="px-4 py-2 text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSession}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save Session
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Session Modal */}
      <Dialog open={!!editingSession} onOpenChange={(open) => !open && setEditingSession(null)}>
        <DialogContent 
          className="bg-slate-900 border-slate-800"
          aria-describedby="edit-session-description"
        >
          <DialogHeader>
            <DialogTitle>Edit Study Session</DialogTitle>
            <p id="edit-session-description" className="text-sm text-slate-400">
              Update the details of your study session
            </p>
          </DialogHeader>
          {editingSession && (
            <form 
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                console.log('Form submitted with data:', editingSession);
                
                const activityType = editingSession.activityType || 'study';
                const difficulty = editingSession.difficulty || 'medium';
                
                if (!activityType || !difficulty) {
                  toast({
                    title: "Error",
                    description: "Please ensure activity type and difficulty are selected",
                    variant: "destructive",
                  });
                  return;
                }

                try {
                  await handleUpdateSession(editingSession.id, {
                    activityType,
                    difficulty,
                    duration: editingSession.duration || 0,
                    date: editingSession.date,
                    notes: editingSession.notes || '',
                  });
                } catch (error) {
                  console.error('Error in form submission:', error);
                  toast({
                    title: "Error",
                    description: "Failed to save changes. Please try again.",
                    variant: "destructive",
                  });
                }
              }}
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Activity Type
                  </label>
                  <select
                    value={editingSession.activityType || 'study'}
                    onChange={(e) => {
                      const newType = e.target.value as keyof typeof activityTypes;
                      setEditingSession({
                        ...editingSession,
                        activityType: newType
                      });
                    }}
                    required
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-white"
                  >
                    {Object.entries(activityTypes).map(([key, value]) => (
                      <option key={key} value={key}>{value.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Difficulty
                  </label>
                  <select
                    value={editingSession.difficulty || 'medium'}
                    onChange={(e) => {
                      const newDifficulty = e.target.value as keyof typeof difficultyLevels;
                      setEditingSession({
                        ...editingSession,
                        difficulty: newDifficulty
                      });
                    }}
                    required
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-white"
                  >
                    {Object.entries(difficultyLevels).map(([key, value]) => (
                      <option key={key} value={key}>{value.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={editingSession.duration || 0}
                  onChange={(e) => setEditingSession({
                    ...editingSession,
                    duration: Math.max(0, parseInt(e.target.value) || 0)
                  })}
                  required
                  min="0"
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Date
                </label>
                <input
                  type="datetime-local"
                  value={new Date(editingSession.date).toISOString().slice(0, 16)}
                  onChange={(e) => setEditingSession({
                    ...editingSession,
                    date: new Date(e.target.value).toISOString()
                  })}
                  required
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={editingSession.notes || ''}
                  onChange={(e) => setEditingSession({
                    ...editingSession,
                    notes: e.target.value
                  })}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-white h-24"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSession(null)}
                  className="px-4 py-2 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Review Schedule Section */}
      <div className="bg-slate-800/50 rounded-lg p-6">
        <h2 className="text-lg font-medium text-slate-100 mb-4">Review Schedule</h2>
        {concept && (
          <ReviewScheduler
            topic={topic}
            concept={concept}
            onScheduleUpdate={handleReviewScheduleUpdate}
          />
        )}
      </div>
    </div>
  );
} 