'use client';

import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/components/ui/use-toast';
import { StudySession as StudySessionType, Subject, Topic } from '@/types';
import { useState, useEffect } from 'react';
import { Loader2, Plus, Edit2, Trash2, Clock, Award, Brain, ArrowLeft, History, Settings, TrendingDown, TrendingUp } from 'lucide-react';
import StudySession from '@/components/StudySession';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { activityTypes, difficultyLevels, calculateSessionXP } from '@/lib/xpSystem';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { TopicForm, type TopicFormData } from "@/components/TopicForm";
import SessionForm from '@/components/SessionForm';

interface TopicPageProps {
  params: {
    subjectId: string;
    topicName: string;
  };
}

export default function TopicPage({ params }: TopicPageProps) {
  const [subject, setSubject] = useState<Subject | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'concepts'>('overview');
  const [editingSession, setEditingSession] = useState<Partial<StudySessionType> | null>(null);
  const [isAddingSession, setIsAddingSession] = useState(false);
  const [newSession, setNewSession] = useState<Partial<StudySessionType>>({
    date: new Date().toISOString(),
    duration: 30,
    notes: '',
    activityType: 'study' as keyof typeof activityTypes,
    difficulty: 'medium' as keyof typeof difficultyLevels,
    xpGained: 0,
    masteryGained: 0,
  });
  const [isEditingTopic, setIsEditingTopic] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const subjectRef = doc(db, 'subjects', params.subjectId);
        const subjectSnap = await getDoc(subjectRef);
        
        if (subjectSnap.exists()) {
          const subjectData = subjectSnap.data() as Subject;
          setSubject(subjectData);
          
          // Decode and normalize the topic name for comparison
          const decodedTopicName = decodeURIComponent(params.topicName).trim().toLowerCase();
          const topicData = subjectData.topics.find(t => 
            t.name.trim().toLowerCase() === decodedTopicName
          );

          if (topicData) {
            console.log('Found topic:', topicData);
            setTopic(topicData);
          } else {
            console.log('Topic not found. Looking for:', decodedTopicName);
            console.log('Available topics:', subjectData.topics.map(t => t.name));
            toast({
              title: "Error",
              description: "Topic not found",
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Error",
            description: "Subject not found",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "Failed to load subject and topic data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (params.subjectId && params.topicName) {
      fetchData();
    }
  }, [params.subjectId, params.topicName]);

const handleDeleteProgress = async (type: string, id: string) => {
  if (!subject || !topic) return;

  try {
    let updatedTopic = { ...topic };
    let xpChange = 0;
    let masteryChange = 0;
    let studyTimeChange = 0;

    if (type === 'session') {
      // Find the session to get its contribution to mastery and XP
      const session = topic.studySessions?.find(s => s.id === id);
      if (session) {
        // Calculate the XP, mastery, and study time to remove
        xpChange = -(session.xpGained || 0);
        masteryChange = -(session.masteryGained || 0);
        studyTimeChange = -(session.duration || 0);

        // Remove the session
        updatedTopic.studySessions = (topic.studySessions || []).filter(s => s.id !== id);
        
        // Also remove the corresponding activity if it exists
        const sessionActivity = topic.activities?.find(
          a => a.type === session.activityType && a.completedAt === session.date
        );
        if (sessionActivity) {
          updatedTopic.activities = (topic.activities || []).filter(a => a.id !== sessionActivity.id);
        }
      }
    }

    // Update the topic's total XP, mastery, and study time
    updatedTopic.xp = Math.max(0, (topic.xp || 0) + xpChange);
    updatedTopic.masteryLevel = Math.min(100, Math.max(0, (topic.masteryLevel || 0) + masteryChange));
    updatedTopic.totalStudyTime = Math.max(0, (topic.totalStudyTime || 0) + studyTimeChange);

    // Calculate new subject totals
    const updatedSubject = {
      ...subject,
      totalStudyTime: Math.max(0, (subject.totalStudyTime || 0) + studyTimeChange),
      xp: subject.topics.reduce((total, t) => {
        if (t.name === topic.name) {
          return total + updatedTopic.xp;
        }
        return total + (t.xp || 0);
      }, 0),
      masteryPath: {
        ...subject.masteryPath,
        progress: Math.min(100, Math.floor(
          subject.topics.reduce((total, t) => {
            if (t.name === topic.name) {
              return total + updatedTopic.masteryLevel;
            }
            return total + (t.masteryLevel || 0);
          }, 0) / subject.topics.length
        ))
      }
    };

    // Update Firestore
    const subjectRef = doc(db, 'subjects', params.subjectId);
    await updateDoc(subjectRef, {
      topics: subject.topics.map(t => t.name === topic.name ? updatedTopic : t),
      xp: updatedSubject.xp,
      totalStudyTime: updatedSubject.totalStudyTime,
      masteryPath: updatedSubject.masteryPath
    });

    // Update local state
    setTopic(updatedTopic);
    setSubject(updatedSubject);

    toast({
      title: "Success",
      description: `Progress item deleted successfully`,
    });
  } catch (error) {
    console.error('Error deleting progress:', error);
    toast({
      title: "Error",
      description: "Failed to delete progress item",
      variant: "destructive",
    });
  }
};

const handleAddSession = async (sessionData: Partial<StudySessionType>) => {
  if (!subject || !topic) return;

  try {
    const newSession = {
      ...sessionData,
      id: crypto.randomUUID(),
    };

    // Create a new activity from the session
    const newActivity = {
      id: crypto.randomUUID(),
      type: sessionData.activityType || 'study',
      status: 'completed',
      duration: sessionData.duration || 0,
      description: sessionData.notes || 'Study session',
      completedAt: sessionData.date,
      xpGained: sessionData.xpGained,
      masteryGained: sessionData.masteryGained,
    };

    const updatedTopic = {
      ...topic,
      studySessions: [...(topic.studySessions || []), newSession],
      activities: [...(topic.activities || []), newActivity],
      xp: (topic.xp || 0) + (sessionData.xpGained || 0),
      masteryLevel: Math.min(100, (topic.masteryLevel || 0) + (sessionData.masteryGained || 0)),
      totalStudyTime: (topic.totalStudyTime || 0) + (sessionData.duration || 0)
    };

    // Update the topics array in the subject
    const updatedTopics = subject.topics.map(t =>
      t.name === topic.name ? updatedTopic : t
    );

    // Calculate average mastery across all topics
    const averageMastery = updatedTopics.reduce((total, t) => 
      total + (t.masteryLevel || 0), 0) / updatedTopics.length;

    // Calculate new subject totals
    const updatedSubject = {
      ...subject,
      totalStudyTime: (subject.totalStudyTime || 0) + (sessionData.duration || 0),
      xp: updatedTopics.reduce((total, t) => total + (t.xp || 0), 0),
      masteryPath: {
        ...subject.masteryPath,
        progress: Math.min(100, Math.floor(averageMastery % 10) * 10)
      },
      progress: {
        ...(subject.progress || {}),
        totalXP: updatedTopics.reduce((total, t) => total + (t.xp || 0), 0),
        averageMastery: Math.round(averageMastery),
        completedTopics: updatedTopics.filter(t => (t.masteryLevel || 0) >= 80).length,
        totalTopics: updatedTopics.length,
        lastStudied: new Date().toISOString()
      }
    };

    // Update Firestore
    const subjectRef = doc(db, 'subjects', params.subjectId);
    await updateDoc(subjectRef, {
      topics: updatedTopics,
      xp: updatedSubject.xp,
      totalStudyTime: updatedSubject.totalStudyTime,
      masteryPath: updatedSubject.masteryPath,
      progress: {
        ...(subject.progress || {}),
        totalXP: updatedSubject.xp,
        averageMastery: Math.round(averageMastery),
        completedTopics: updatedTopics.filter(t => (t.masteryLevel || 0) >= 80).length,
        totalTopics: updatedTopics.length,
        lastStudied: new Date().toISOString()
      }
    });

    // Update local state
    setTopic(updatedTopic);
    setSubject({
      ...updatedSubject,
      progress: {
        ...(subject.progress || {}),
        totalXP: updatedSubject.xp,
        averageMastery: Math.round(averageMastery),
        completedTopics: updatedTopics.filter(t => (t.masteryLevel || 0) >= 80).length,
        totalTopics: updatedTopics.length,
        lastStudied: new Date().toISOString()
      }
    });

    toast({
      title: "Success",
      description: `Session added: +${sessionData.xpGained} XP, +${sessionData.masteryGained}% Mastery`,
    });
  } catch (error) {
    console.error('Error adding study session:', error);
    toast({
      title: "Error",
      description: "Failed to add study session",
      variant: "destructive",
    });
  }
};

const handleUpdateSession = async (sessionId: string, updates: Partial<StudySessionType>) => {
  if (!subject || !topic) return;

  try {
    // Find the old session to calculate the difference in XP and mastery
    const oldSession = topic.studySessions?.find(s => s.id === sessionId);
    if (!oldSession) {
      console.error('Session not found:', sessionId);
      return;
    }

    // Calculate XP, mastery, and study time changes
    const xpChange = (updates.xpGained || 0) - (oldSession.xpGained || 0);
    const masteryChange = (updates.masteryGained || 0) - (oldSession.masteryGained || 0);
    const studyTimeChange = (updates.duration || 0) - (oldSession.duration || 0);

    // Create updated topic with new session data
    const updatedTopic = {
      ...topic,
      studySessions: (topic.studySessions || []).map(s =>
        s.id === sessionId ? { ...s, ...updates } : s
      ),
      xp: Math.max(0, (topic.xp || 0) + xpChange),
      masteryLevel: Math.min(100, Math.max(0, (topic.masteryLevel || 0) + masteryChange)),
      totalStudyTime: Math.max(0, (topic.totalStudyTime || 0) + studyTimeChange)
    };

    // Find and update the corresponding activity if it exists
    const sessionActivity = topic.activities?.find(
      a => a.type === oldSession.activityType && a.completedAt === oldSession.date
    );

    if (sessionActivity) {
      updatedTopic.activities = (topic.activities || []).map(a =>
        a.id === sessionActivity.id
          ? {
              ...a,
              type: updates.activityType || a.type,
              duration: updates.duration || a.duration,
              description: updates.notes || a.description,
              completedAt: updates.date || a.completedAt,
              xpGained: updates.xpGained || a.xpGained,
              masteryGained: updates.masteryGained || a.masteryGained,
            }
          : a
      );
    }

    // Update the topics array in the subject
    const updatedTopics = subject.topics.map(t =>
      t.name === topic.name ? updatedTopic : t
    );

    // Calculate average mastery across all topics
    const averageMastery = updatedTopics.reduce((total, t) => 
      total + (t.masteryLevel || 0), 0) / updatedTopics.length;

    // Calculate new subject totals
    const updatedSubject = {
      ...subject,
      totalStudyTime: Math.max(0, (subject.totalStudyTime || 0) + studyTimeChange),
      xp: updatedTopics.reduce((total, t) => total + (t.xp || 0), 0),
      masteryPath: {
        ...subject.masteryPath,
        progress: Math.min(100, Math.floor(averageMastery % 10) * 10)
      },
      progress: {
        ...(subject.progress || {}),
        totalXP: updatedTopics.reduce((total, t) => total + (t.xp || 0), 0),
        averageMastery: Math.round(averageMastery),
        completedTopics: updatedTopics.filter(t => (t.masteryLevel || 0) >= 80).length,
        totalTopics: updatedTopics.length,
        lastStudied: new Date().toISOString()
      }
    };

    // Update Firestore
    const subjectRef = doc(db, 'subjects', params.subjectId);
    await updateDoc(subjectRef, {
      topics: updatedTopics,
      xp: updatedSubject.xp,
      totalStudyTime: updatedSubject.totalStudyTime,
      masteryPath: updatedSubject.masteryPath,
      progress: updatedSubject.progress
    });

    // Update local state
    setTopic(updatedTopic);
    setSubject({
      ...updatedSubject,
      progress: {
        ...(subject.progress || {}),
        totalXP: updatedSubject.xp,
        averageMastery: Math.round(averageMastery),
        completedTopics: updatedTopics.filter(t => (t.masteryLevel || 0) >= 80).length,
        totalTopics: updatedTopics.length,
        lastStudied: new Date().toISOString()
      }
    });

    toast({
      title: "Success",
      description: `Session updated successfully: ${xpChange >= 0 ? '+' : ''}${xpChange} XP, ${masteryChange >= 0 ? '+' : ''}${masteryChange}% Mastery`,
    });
  } catch (error) {
    console.error('Error updating study session:', error);
    toast({
      title: "Error",
      description: "Failed to update study session",
      variant: "destructive",
    });
  }
};

const calculateTotalStudyTime = () => {
  if (!topic?.studySessions) return 0;
  return topic.studySessions.reduce((total, session) => total + (session.duration || 0), 0);
};

const handleStartAddSession = () => {
  setIsAddingSession(true);
  setNewSession({
    date: new Date().toISOString(),
    duration: 30,
    notes: '',
    activityType: 'study',
    difficulty: 'medium',
    xpGained: 0,
    masteryGained: 0,
  });
};

const handleSaveNewSession = async () => {
  if (!topic || !subject) return;

  try {
    const { xp, masteryGained } = calculateSessionXP({
      activityType: newSession.activityType || 'study',
      difficulty: newSession.difficulty || 'medium',
      duration: newSession.duration || 0,
      currentLevel: topic.masteryLevel || 1,
    });

    const sessionToAdd = {
      ...newSession,
      id: crypto.randomUUID(),
      xpGained: xp,
      masteryGained: masteryGained,
    };

    await handleAddSession(sessionToAdd);
    setIsAddingSession(false);
    toast({
      title: "Success",
      description: `Session added: +${xp} XP, +${masteryGained}% Mastery`,
    });
  } catch (error) {
    console.error('Failed to add session:', error);
    toast({
      title: "Error",
      description: "Failed to add session",
      variant: "destructive",
    });
  }
};

const handleEditSession = async (sessionId: string) => {
  if (!topic || !subject) return;

  const session = topic.studySessions?.find(s => s.id === sessionId);
  if (!session) return;

  setEditingSession(session);
};

const handleSaveEdit = async () => {
  if (!editingSession?.id || !topic || !subject) return;

  try {
    const { xp, masteryGained } = calculateSessionXP({
      activityType: editingSession.activityType || 'study',
      difficulty: editingSession.difficulty || 'medium',
      duration: editingSession.duration || 0,
      currentLevel: topic.masteryLevel || 1,
    });

    const updatedSession = {
      ...editingSession,
      xpGained: xp,
      masteryGained: masteryGained,
    };

    await handleUpdateSession(editingSession.id, updatedSession);
    setEditingSession(null);
    toast({
      title: "Success",
      description: `Session updated: +${xp} XP, +${masteryGained}% Mastery`,
    });
  } catch (error) {
    console.error('Failed to update session:', error);
    toast({
      title: "Error",
      description: "Failed to update session",
      variant: "destructive",
    });
  }
};

const handleDeleteConcept = async (conceptName: string) => {
  if (!subject || !topic) return;

  try {
    // Filter out the concept to be deleted
    const updatedConcepts = topic.concepts?.filter(c => c.name !== conceptName) || [];
    
    // Update the topic with the filtered concepts
    const updatedTopic = {
      ...topic,
      concepts: updatedConcepts
    };

    // Update the topics array in the subject
    const updatedTopics = subject.topics.map(t =>
      t.name === topic.name ? updatedTopic : t
    );

    // Update in Firestore
    const subjectRef = doc(db, 'subjects', params.subjectId);
    await updateDoc(subjectRef, {
      topics: updatedTopics
    });

    // Update local state
    setTopic(updatedTopic);

    toast({
      title: "Success",
      description: "Concept deleted successfully",
    });
  } catch (error) {
    console.error('Error deleting concept:', error);
    toast({
      title: "Error",
      description: "Failed to delete concept",
      variant: "destructive",
    });
  }
};

const handleUpdateTopic = async (data: TopicFormData) => {
  if (!subject || !topic) return;

  try {
    const updatedTopic = {
      ...topic,
      name: data.name.trim(),
      description: data.description.trim(),
      isHabitBased: data.isHabitBased
    };

    // Update the topics array in the subject
    const updatedTopics = subject.topics.map(t =>
      t.name === topic.name ? updatedTopic : t
    );

    // Update in Firestore
    const subjectRef = doc(db, 'subjects', params.subjectId);
    await updateDoc(subjectRef, {
      topics: updatedTopics
    });

    // Update local state
    setTopic(updatedTopic);
    setIsEditingTopic(false);

    toast({
      title: "Success",
      description: "Topic updated successfully",
    });
  } catch (error) {
    console.error('Error updating topic:', error);
    toast({
      title: "Error",
      description: "Failed to update topic",
      variant: "destructive",
    });
  }
};

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="bg-red-900/20 p-8 rounded-lg text-center max-w-md">
          <h2 className="text-2xl font-bold text-red-400 mb-4">{error}</h2>
          <p className="text-slate-300 mb-6">
            Unable to load the topic. Please try again later.
          </p>
          <Link 
            href={`/subjects/${params.subjectId}`}
            className="inline-block bg-slate-800 text-white px-6 py-2 rounded-lg hover:bg-slate-700 transition"
          >
            Return to Subject
          </Link>
        </div>
      </div>
    );
  }

  if (!subject || !topic) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-400">Topic not found</p>
        <Link 
          href={`/subjects/${params.subjectId}`}
          className="text-blue-400 hover:text-blue-300 mt-4 inline-flex items-center"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Subject
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <Link 
              href={`/subjects/${params.subjectId}`}
              className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Subject</span>
            </Link>
            <h1 className="text-3xl font-bold mb-2">{topic?.name}</h1>
            <p className="text-slate-400">{topic?.description}</p>
          </div>
          <button
            onClick={() => setIsEditingTopic(true)}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            title="Edit Topic"
          >
            <Settings className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-6">
              <div>
                <Link 
                  href={`/subjects/${params.subjectId}`}
                  className="text-blue-400 hover:text-blue-300 mb-2 inline-flex items-center"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to {subject.name}
                </Link>
                <h1 className="text-2xl font-bold text-slate-100 mt-2">{topic.name}</h1>
                {topic.isHabitBased && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-2">
                    Self-Managed
                  </span>
                )}
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-sm text-slate-400">Mastery Level</p>
                  <p className="text-xl font-bold text-green-400">{Math.round(topic.masteryLevel || 0)}%</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-400">Total XP</p>
                  <p className="text-xl font-bold text-blue-400">{topic.xp || 0}</p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="bg-slate-800/50 rounded-lg p-6">
              <TabsList className="bg-slate-800 mb-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="sessions">Study Sessions</TabsTrigger>
                {!topic.isHabitBased && (
                  <TabsTrigger value="concepts">Concepts</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="overview" className="space-y-8">
                {/* Progress Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-slate-800/80 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Clock className="h-5 w-5 text-blue-400" />
                      <h3 className="text-lg font-medium text-slate-100">Study Time</h3>
                    </div>
                    <p className="text-2xl font-bold text-slate-100">{topic.totalStudyTime || 0} mins</p>
                  </div>
                  <div className="bg-slate-800/80 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Award className="h-5 w-5 text-green-400" />
                      <h3 className="text-lg font-medium text-slate-100">Mastery</h3>
                    </div>
                    <p className="text-2xl font-bold text-slate-100">{Math.round(topic.masteryLevel || 0)}%</p>
                  </div>
                  <div className="bg-slate-800/80 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Brain className="h-5 w-5 text-purple-400" />
                      <h3 className="text-lg font-medium text-slate-100">Concepts</h3>
                    </div>
                    <p className="text-2xl font-bold text-slate-100">{topic.concepts?.length || 0}</p>
                  </div>
                </div>

                {/* Areas of Focus */}
                {topic.concepts && topic.concepts.length > 0 && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Weak Areas */}
                    <div className="bg-slate-800/80 rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-6">
                        <TrendingDown className="h-5 w-5 text-red-400" />
                        <h3 className="text-lg font-medium text-slate-100">Areas Needing Review</h3>
                      </div>
                      <div className="space-y-3">
                        {topic.concepts
                          .filter(concept => (concept.masteryLevel || 0) < 70)
                          .sort((a, b) => (a.masteryLevel || 0) - (b.masteryLevel || 0))
                          .slice(0, 3)
                          .map(concept => (
                            <div
                              key={concept.name}
                              onClick={() => router.push(`/subjects/${params.subjectId}/topics/${encodeURIComponent(topic.name)}/concepts/${encodeURIComponent(concept.name)}`)}
                              className="p-3 rounded-lg border border-border/50 bg-slate-700/50 hover:bg-slate-700 transition-colors cursor-pointer group"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-sm text-slate-200 group-hover:text-blue-400 transition-colors line-clamp-1">
                                  {concept.name}
                                </h4>
                                <span className={cn(
                                  "text-xs font-medium",
                                  concept.masteryLevel < 40 ? "text-red-400" :
                                  "text-yellow-400"
                                )}>
                                  {Math.round(concept.masteryLevel || 0)}%
                                </span>
                              </div>
                              <div className="w-full bg-slate-600 rounded-full h-1">
                                <div
                                  className={cn(
                                    "rounded-full h-1",
                                    concept.masteryLevel < 40 ? "bg-red-500" : "bg-yellow-500"
                                  )}
                                  style={{ width: `${concept.masteryLevel || 0}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        {topic.concepts.filter(c => (c.masteryLevel || 0) < 70).length === 0 && (
                          <p className="text-slate-400 text-center py-4">
                            No concepts currently need review! 🎉
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Strong Areas */}
                    <div className="bg-slate-800/80 rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-6">
                        <TrendingUp className="h-5 w-5 text-emerald-400" />
                        <h3 className="text-lg font-medium text-slate-100">Strong Areas</h3>
                      </div>
                      <div className="space-y-3">
                        {topic.concepts
                          .filter(concept => (concept.masteryLevel || 0) >= 70)
                          .sort((a, b) => (b.masteryLevel || 0) - (a.masteryLevel || 0))
                          .slice(0, 3)
                          .map(concept => (
                            <div
                              key={concept.name}
                              onClick={() => router.push(`/subjects/${params.subjectId}/topics/${encodeURIComponent(topic.name)}/concepts/${encodeURIComponent(concept.name)}`)}
                              className="p-3 rounded-lg border border-border/50 bg-slate-700/50 hover:bg-slate-700 transition-colors cursor-pointer group"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-sm text-slate-200 group-hover:text-blue-400 transition-colors line-clamp-1">
                                  {concept.name}
                                </h4>
                                <span className="text-xs font-medium text-emerald-400">
                                  {Math.round(concept.masteryLevel || 0)}%
                                </span>
                              </div>
                              <div className="w-full bg-slate-600 rounded-full h-1">
                                <div
                                  className="rounded-full h-1 bg-emerald-500"
                                  style={{ width: `${concept.masteryLevel || 0}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        {topic.concepts.filter(c => (c.masteryLevel || 0) >= 70).length === 0 && (
                          <p className="text-slate-400 text-center py-4">
                            Keep studying to develop strong areas! 💪
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Recent Activity */}
                <div className="bg-slate-800/80 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-slate-100 mb-6">Recent Activity</h3>
                  {topic.studySessions && topic.studySessions.length > 0 ? (
                    <div className="space-y-4">
                      {topic.studySessions.slice(0, 5).map((session) => (
                        <div key={session.id} className="flex items-center justify-between bg-slate-700/50 rounded-lg p-4">
                          <div>
                            <p className="font-medium text-slate-200">{activityTypes[session.activityType]?.name || 'Study'}</p>
                            <p className="text-sm text-slate-400">
                              {format(new Date(session.date), 'MMM d, yyyy')} • {session.duration} mins
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-blue-400">+{session.xpGained} XP</p>
                            <p className="text-sm text-green-400">+{session.masteryGained}% Mastery</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400">No study sessions yet</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="sessions" className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-slate-100">Study Sessions</h2>
                  <button
                    onClick={handleStartAddSession}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
                  >
                    <Plus className="h-4 w-4" />
                    Add Session
                  </button>
                </div>

                {topic.studySessions && topic.studySessions.length > 0 ? (
                  <div className="space-y-4">
                    {topic.studySessions.map((session) => (
                      <div key={session.id} className="bg-slate-800/80 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-medium text-slate-200">{activityTypes[session.activityType]?.name || 'Study'}</p>
                            <p className="text-sm text-slate-400">
                              {format(new Date(session.date), 'MMM d, yyyy')} • {session.duration} mins • 
                              {difficultyLevels[session.difficulty]?.name || 'Medium'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditSession(session.id)}
                              className="p-2 hover:bg-slate-700 rounded-lg"
                            >
                              <Edit2 className="h-4 w-4 text-slate-400" />
                            </button>
                            <button
                              onClick={() => handleDeleteProgress('session', session.id)}
                              className="p-2 hover:bg-slate-700 rounded-lg"
                            >
                              <Trash2 className="h-4 w-4 text-slate-400" />
                            </button>
                          </div>
                        </div>
                        {session.notes && (
                          <p className="text-sm text-slate-400 mt-4">{session.notes}</p>
                        )}
                        <div className="flex items-center gap-4 mt-4">
                          <p className="text-sm text-blue-400">+{session.xpGained} XP</p>
                          <p className="text-sm text-green-400">+{session.masteryGained}% Mastery</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400">No study sessions recorded yet</p>
                )}
              </TabsContent>

              {!topic.isHabitBased && (
                <TabsContent value="concepts" className="space-y-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-slate-100">Concepts</h2>
                    <Link
                      href={`/subjects/${params.subjectId}/topics/${encodeURIComponent(topic.name)}/concepts/new`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
                    >
                      <Plus className="h-4 w-4" />
                      Add Concept
                    </Link>
                  </div>

                  {topic.concepts && topic.concepts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {topic.concepts.map((concept) => (
                        <Link
                          key={concept.name}
                          href={`/subjects/${params.subjectId}/topics/${encodeURIComponent(topic.name)}/concepts/${encodeURIComponent(concept.name)}`}
                          className="bg-slate-800/80 rounded-lg p-6 hover:bg-slate-700/80 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-medium text-slate-200">{concept.name}</h3>
                            <p className="text-sm text-green-400">{Math.round(concept.masteryLevel || 0)}%</p>
                          </div>
                          <p className="text-sm text-slate-400">
                            Last studied: {concept.lastStudied ? format(new Date(concept.lastStudied), 'MMM d, yyyy') : 'Never'}
                          </p>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400">No concepts added yet</p>
                  )}
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>

        {/* Add Session Dialog */}
        <Dialog open={isAddingSession} onOpenChange={setIsAddingSession}>
          <DialogContent className="bg-slate-900 border-slate-800 max-w-2xl w-full">
            <DialogHeader>
              <DialogTitle className="text-slate-100">Add Study Session</DialogTitle>
            </DialogHeader>
            <SessionForm
              subject={subject}
              topic={topic}
              onComplete={handleSaveNewSession}
              onCancel={() => setIsAddingSession(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Edit Session Dialog */}
        <Dialog open={!!editingSession} onOpenChange={(open) => !open && setEditingSession(null)}>
          <DialogContent className="bg-slate-900 border-slate-800 max-w-2xl w-full">
            <DialogHeader>
              <DialogTitle className="text-slate-100">Edit Study Session</DialogTitle>
            </DialogHeader>
            {editingSession && (
              <SessionForm
                subject={subject}
                topic={topic}
                initialData={editingSession}
                onComplete={handleSaveEdit}
                onCancel={() => setEditingSession(null)}
              />
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={isEditingTopic} onOpenChange={setIsEditingTopic}>
          <DialogContent className="bg-slate-900 border-slate-800">
            <DialogHeader>
              <DialogTitle className="text-slate-100">Edit Topic</DialogTitle>
            </DialogHeader>
            <TopicForm
              initialData={topic}
              onSubmit={handleUpdateTopic}
              isSubmitting={false}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}