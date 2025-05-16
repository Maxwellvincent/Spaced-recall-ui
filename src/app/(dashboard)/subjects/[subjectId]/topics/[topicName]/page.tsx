'use client';

import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/components/ui/use-toast';
import { StudySession as StudySessionType, Subject, Topic } from '@/types';
import { useState, useEffect } from 'react';
import React from 'react';
import { Loader2, Plus, Edit2, Trash2, Clock, Award, Brain, ArrowLeft, History, Settings, TrendingDown, TrendingUp } from 'lucide-react';
import { useTheme } from '@/contexts/theme-context';
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
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Edit, Trash } from 'lucide-react';

interface TopicPageProps {
  params: Promise<{
    subjectId: string;
    topicName: string;
  }>;
}

export default function TopicPage({ params: paramsPromise }: TopicPageProps) {
  const params = React.use(paramsPromise);
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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  // Get theme information
  const { theme } = useTheme();
  
  // Function to get theme-specific styles
  const getThemeStyles = () => {
    switch (theme?.toLowerCase()) {
      case 'dbz':
        return {
          primary: 'bg-yellow-600 hover:bg-yellow-700',
          secondary: 'bg-yellow-700/50',
          accent: 'text-yellow-400',
          border: 'border-yellow-600',
          cardBg: 'bg-yellow-950/50',
          itemCard: 'bg-yellow-900 hover:bg-yellow-800',
          progressBar: 'bg-yellow-500',
          header: 'Training Session',
          buttonHover: 'hover:bg-yellow-700',
          textPrimary: 'text-white',
          textSecondary: 'text-yellow-100',
          textMuted: 'text-yellow-200/80',
          tabActive: 'bg-yellow-700'
        };
      case 'naruto':
        return {
          primary: 'bg-orange-600 hover:bg-orange-700',
          secondary: 'bg-orange-700/50',
          accent: 'text-orange-400',
          border: 'border-orange-600',
          cardBg: 'bg-orange-950/50',
          itemCard: 'bg-orange-900 hover:bg-orange-800',
          progressBar: 'bg-orange-500',
          header: 'Jutsu Training',
          buttonHover: 'hover:bg-orange-700',
          textPrimary: 'text-white',
          textSecondary: 'text-orange-100',
          textMuted: 'text-orange-200/80',
          tabActive: 'bg-orange-700'
        };
      case 'hogwarts':
        return {
          primary: 'bg-purple-600 hover:bg-purple-700',
          secondary: 'bg-purple-700/50',
          accent: 'text-purple-400',
          border: 'border-purple-600',
          cardBg: 'bg-purple-950/50',
          itemCard: 'bg-purple-900 hover:bg-purple-800',
          progressBar: 'bg-purple-500',
          header: 'Spellwork Practice',
          buttonHover: 'hover:bg-purple-700',
          textPrimary: 'text-white',
          textSecondary: 'text-purple-100',
          textMuted: 'text-purple-200/80',
          tabActive: 'bg-purple-700'
        };
      default:
        return {
          primary: 'bg-blue-600 hover:bg-blue-700',
          secondary: 'bg-blue-700/50',
          accent: 'text-blue-400',
          border: 'border-blue-600',
          cardBg: 'bg-slate-800',
          itemCard: 'bg-slate-700 hover:bg-slate-600',
          progressBar: 'bg-blue-500',
          header: 'Topic Details',
          buttonHover: 'hover:bg-blue-700',
          textPrimary: 'text-white',
          textSecondary: 'text-slate-100',
          textMuted: 'text-slate-300',
          tabActive: 'bg-blue-700'
        };
    }
  };

  const themeStyles = getThemeStyles();

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

const handleDeleteTopic = async () => {
  if (!subject) return;
  
  try {
    setIsDeleting(true);
    
    // Filter out the current topic from the subject's topics array
    const updatedTopics = subject.topics.filter(t => t.name !== topic?.name);
    
    // Update the subject document in Firestore
    const subjectRef = doc(db, 'subjects', params.subjectId);
    await updateDoc(subjectRef, {
      topics: updatedTopics
    });
    
    toast({
      title: "Success",
      description: "Topic deleted successfully",
    });
    
    // Navigate back to the subject page
    router.push(`/subjects/${encodeURIComponent(subject?.name || '')}`);
  } catch (error) {
    console.error('Error deleting topic:', error);
    toast({
      title: "Error",
      description: "Failed to delete topic",
      variant: "destructive",
    });
    setIsDeleting(false);
  }
};

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className={`h-8 w-8 animate-spin mx-auto mb-4 ${themeStyles.accent}`} />
          <p className={themeStyles.textPrimary}>Loading topic...</p>
        </div>
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
            href={`/subjects/${encodeURIComponent(subject?.name || '')}`}
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
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className={`${themeStyles.cardBg} p-8 rounded-lg text-center max-w-md ${themeStyles.border}`}>
          <h2 className="text-2xl font-bold text-red-400 mb-4">Topic Not Found</h2>
          <p className={`${themeStyles.textSecondary} mb-6`}>
            The topic you're looking for could not be found. It may have been deleted or you might not have access to it.
          </p>
          <Link 
            href={`/subjects/${encodeURIComponent(subject?.name || '')}`}
            className={`inline-block ${themeStyles.primary} text-white px-6 py-2 rounded-lg transition`}
          >
            Return to Subject
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <Link 
              href={`/subjects/${params.subjectId}`}
              className={`${themeStyles.accent} hover:underline transition mb-2 inline-flex items-center`}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to {subject?.name}
            </Link>
            <h1 className="text-3xl font-bold">{topic.name}</h1>
          </div>
          
          <div className="flex space-x-2">
            <Button
              onClick={() => router.push(`/subjects/${params.subjectId}/topics/${encodeURIComponent(topic.name)}/study`)}
              className={themeStyles.primary}
            >
              <Brain className="h-4 w-4 mr-2" />
              Study
            </Button>
            
            <Button
              onClick={() => router.push(`/subjects/${params.subjectId}/topics/${encodeURIComponent(topic.name)}/concepts/new`)}
              className={themeStyles.primary}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Concept
            </Button>
            
            <Button
              onClick={() => setIsEditingTopic(true)}
              variant="outline"
              className={`border ${themeStyles.border} ${themeStyles.textSecondary}`}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            
            <Button
              onClick={() => setIsDeleteDialogOpen(true)}
              variant="destructive"
            >
              <Trash className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
        
        <div className={`${themeStyles.cardBg} p-6 rounded-lg shadow-lg mb-6 ${themeStyles.border}`}>
          <div className="flex flex-col md:flex-row justify-between">
            <div className="mb-4 md:mb-0">
              <h2 className={`text-xl font-semibold mb-2 ${themeStyles.textPrimary}`}>Topic Overview</h2>
              <p className={themeStyles.textSecondary}>{topic.description || "No description provided."}</p>
            </div>
            <div className="flex flex-col md:items-end">
              <div className="flex items-center mb-2">
                <Award className={`h-5 w-5 mr-2 ${themeStyles.accent}`} />
                <span className={themeStyles.textSecondary}>Mastery Level: </span>
                <span className={`font-bold ml-2 ${themeStyles.textPrimary}`}>{topic.masteryLevel || 0}%</span>
              </div>
              <div className="flex items-center mb-2">
                <Brain className={`h-5 w-5 mr-2 ${themeStyles.accent}`} />
                <span className={themeStyles.textSecondary}>XP Gained: </span>
                <span className={`font-bold ml-2 ${themeStyles.textPrimary}`}>{topic.xp || 0}</span>
              </div>
              <div className="flex items-center">
                <Clock className={`h-5 w-5 mr-2 ${themeStyles.accent}`} />
                <span className={themeStyles.textSecondary}>Study Time: </span>
                <span className={`font-bold ml-2 ${themeStyles.textPrimary}`}>{calculateTotalStudyTime()} min</span>
              </div>
            </div>
          </div>
          <div className="mt-4 w-full bg-slate-700 rounded-full h-2">
            <div 
              className={`${themeStyles.progressBar} rounded-full h-2 transition-all duration-500`}
              style={{ width: `${topic.masteryLevel || 0}%` }}
            />
          </div>
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
            <Tabs
              defaultValue="overview"
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as 'overview' | 'sessions' | 'concepts')}
              className="mt-6"
            >
              <TabsList className={`${themeStyles.cardBg} ${themeStyles.border}`}>
                <TabsTrigger 
                  value="overview" 
                  className={`${activeTab === 'overview' ? themeStyles.tabActive : ''} ${themeStyles.textPrimary}`}
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger 
                  value="sessions" 
                  className={`${activeTab === 'sessions' ? themeStyles.tabActive : ''} ${themeStyles.textPrimary}`}
                >
                  Study Sessions
                </TabsTrigger>
                <TabsTrigger 
                  value="concepts" 
                  className={`${activeTab === 'concepts' ? themeStyles.tabActive : ''} ${themeStyles.textPrimary}`}
                >
                  Concepts
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="mt-6">
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-6`}>
                  <div className={`${themeStyles.cardBg} p-6 rounded-lg shadow-lg ${themeStyles.border}`}>
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
                              onClick={() => router.push(`/subjects/${encodeURIComponent(subject?.name || '')}/topics/${encodeURIComponent(topic.name)}/concepts/${encodeURIComponent(concept.name)}`)}
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
                              onClick={() => router.push(`/subjects/${encodeURIComponent(subject?.name || '')}/topics/${encodeURIComponent(topic.name)}/concepts/${encodeURIComponent(concept.name)}`)}
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
                <TabsContent value="concepts" className="mt-6">
                  <div className={`${themeStyles.cardBg} p-6 rounded-lg shadow-lg ${themeStyles.border}`}>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className={`text-xl font-semibold ${themeStyles.textPrimary}`}>Concepts</h2>
                      <Button 
                        onClick={() => router.push(`/subjects/${encodeURIComponent(subject?.name || '')}/topics/${encodeURIComponent(topic.name)}/concepts/new`)}
                        className={themeStyles.primary}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Concept
                      </Button>
                    </div>
                    
                    {topic.concepts && topic.concepts.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {topic.concepts.map((concept) => (
                          <div 
                            key={concept.name} 
                            className={`${themeStyles.itemCard} p-4 rounded-lg cursor-pointer transition-colors ${themeStyles.border}`}
                            onClick={() => router.push(`/subjects/${encodeURIComponent(subject?.name || '')}/topics/${encodeURIComponent(topic.name)}/concepts/${encodeURIComponent(concept.name)}`)}
                          >
                            <div className="flex justify-between items-start">
                              <h3 className={`font-medium ${themeStyles.textPrimary}`}>{concept.name}</h3>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteConcept(concept.name);
                                }}
                                className="p-1 rounded-md hover:bg-red-900/20 transition-colors"
                              >
                                <Trash2 className="h-4 w-4 text-red-400" />
                              </button>
                            </div>
                            <p className={`text-sm mt-1 line-clamp-2 ${themeStyles.textMuted}`}>
                              {concept.description || 'No description provided'}
                            </p>
                            <div className="mt-2">
                              <div className="flex justify-between text-sm mb-1">
                                <span className={themeStyles.textMuted}>Mastery</span>
                                <span className={themeStyles.textSecondary}>{concept.masteryLevel || 0}%</span>
                              </div>
                              <div className="w-full bg-slate-700 rounded-full h-1.5">
                                <div 
                                  className={`${themeStyles.progressBar} rounded-full h-1.5`}
                                  style={{ width: `${concept.masteryLevel || 0}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={`text-center py-8 ${themeStyles.textMuted}`}>
                        <p>No concepts added yet.</p>
                        <Button 
                          onClick={() => router.push(`/subjects/${encodeURIComponent(subject?.name || '')}/topics/${encodeURIComponent(topic.name)}/concepts/new`)}
                          className={`mt-4 ${themeStyles.primary}`}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Your First Concept
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>

        {/* Add Session Dialog */}
        <Dialog open={isAddingSession} onOpenChange={setIsAddingSession}>
          <DialogContent className={`${themeStyles.cardBg} ${themeStyles.border}`}>
            <DialogHeader>
              <DialogTitle className={themeStyles.textPrimary}>Log Study Session</DialogTitle>
            </DialogHeader>
            <SessionForm
              session={newSession}
              onChange={setNewSession}
              onSubmit={handleSaveNewSession}
              isSubmitting={false}
            />
          </DialogContent>
        </Dialog>

        {/* Edit Session Dialog */}
        <Dialog open={!!editingSession} onOpenChange={() => setEditingSession(null)}>
          <DialogContent className={`${themeStyles.cardBg} ${themeStyles.border}`}>
            <DialogHeader>
              <DialogTitle className={themeStyles.textPrimary}>Edit Study Session</DialogTitle>
            </DialogHeader>
            {editingSession && (
              <SessionForm
                session={editingSession}
                onChange={setEditingSession}
                onSubmit={handleSaveEdit}
                isSubmitting={false}
              />
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={isEditingTopic} onOpenChange={setIsEditingTopic}>
          <DialogContent className={`${themeStyles.cardBg} ${themeStyles.border}`}>
            <DialogHeader>
              <DialogTitle className={themeStyles.textPrimary}>Edit Topic</DialogTitle>
            </DialogHeader>
            <TopicForm 
              defaultValues={{
                name: topic?.name || '',
                description: topic?.description || '',
              }}
              onSubmit={handleUpdateTopic}
              isSubmitting={false}
            />
          </DialogContent>
        </Dialog>

        {/* Delete Topic Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className={`${themeStyles.cardBg} ${themeStyles.border}`}>
            <DialogHeader>
              <DialogTitle className={themeStyles.textPrimary}>Delete Topic</DialogTitle>
              <DialogDescription className={themeStyles.textMuted}>
                Are you sure you want to delete this topic? This action cannot be undone and all associated concepts and study sessions will be permanently removed.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsDeleteDialogOpen(false)}
                className={`border ${themeStyles.border} ${themeStyles.textSecondary}`}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteTopic}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Topic'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}