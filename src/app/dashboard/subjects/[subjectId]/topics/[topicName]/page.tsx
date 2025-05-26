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
import StudySessionsTable from '@/components/StudySessionsTable';
import { LineChart } from '@mui/x-charts/LineChart';
import { Card, CardContent, CardActions, IconButton, TextField, Dialog as MuiDialog, DialogTitle as MuiDialogTitle, DialogContent as MuiDialogContent, DialogActions as MuiDialogActions, Button as MuiButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SettingsIcon from '@mui/icons-material/Settings';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { getProgressBarGradient, getProgressBarGradientClass } from '@/lib/utils/progressBarGradient';

interface TopicPageProps {
  params: {
    subjectId: string;
    topicName: string;
  };
}

// Resource type
interface Resource { title: string; url: string; }

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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAddResource, setShowAddResource] = useState(false);
  const [showEditResource, setShowEditResource] = useState(false);
  const [resourceForm, setResourceForm] = useState<Resource>({ title: '', url: '' });
  const [editResourceIdx, setEditResourceIdx] = useState<number | null>(null);
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

  const [progressChartMode, setProgressChartMode] = useState<'cumulative' | 'gain' | 'xp'>('cumulative');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);
  const handleChartMenuClick = (event: React.MouseEvent<HTMLElement>) => { setAnchorEl(event.currentTarget); };
  const handleChartMenuClose = () => { setAnchorEl(null); };
  const handleChartModeChange = (mode: 'cumulative' | 'gain' | 'xp') => { setProgressChartMode(mode); setAnchorEl(null); };

  const [headerMenuAnchor, setHeaderMenuAnchor] = useState<null | HTMLElement>(null);
  const openHeaderMenu = Boolean(headerMenuAnchor);
  const handleHeaderMenuClick = (event: React.MouseEvent<HTMLElement>) => { setHeaderMenuAnchor(event.currentTarget); };
  const handleHeaderMenuClose = () => { setHeaderMenuAnchor(null); };
  const handleHeaderEdit = () => { setIsEditingTopic(true); setHeaderMenuAnchor(null); };
  const handleHeaderDelete = () => { setIsDeleteDialogOpen(true); setHeaderMenuAnchor(null); };

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

const handleSaveEdit = async (updatedSession: Partial<StudySessionType>) => {
  if (!updatedSession?.id || !topic || !subject) return;

  try {
    const { xp, masteryGained } = calculateSessionXP({
      activityType: updatedSession.activityType || 'study',
      difficulty: updatedSession.difficulty || 'medium',
      duration: updatedSession.duration || 0,
      currentLevel: topic.masteryLevel || 1,
    });

    const sessionToUpdate = {
      ...updatedSession,
      xpGained: xp,
      masteryGained: masteryGained,
    };

    await handleUpdateSession(updatedSession.id, sessionToUpdate);
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

// Add Resource
const handleAddResource = async () => {
  if (!resourceForm.title.trim() || !resourceForm.url.trim() || !topic || !subject) return;
  const updatedResources = [...(topic.resources || []), { ...resourceForm }];
  await updateTopicResources(updatedResources);
  setShowAddResource(false);
  setResourceForm({ title: '', url: '' });
};

// Edit Resource
const handleEditResource = (idx: number) => {
  if (!topic?.resources) return;
  setEditResourceIdx(idx);
  setResourceForm(topic.resources[idx]);
  setShowEditResource(true);
};

const handleSaveEditResource = async () => {
  if (editResourceIdx === null || !topic || !subject) return;
  const updatedResources = [...(topic.resources || [])];
  updatedResources[editResourceIdx] = { ...resourceForm };
  await updateTopicResources(updatedResources);
  setShowEditResource(false);
  setEditResourceIdx(null);
  setResourceForm({ title: '', url: '' });
};

// Delete Resource
const handleDeleteResource = async (idx: number) => {
  if (!topic || !subject) return;
  const updatedResources = [...(topic.resources || [])];
  updatedResources.splice(idx, 1);
  await updateTopicResources(updatedResources);
};

// Update Firestore and local state
const updateTopicResources = async (resources: Resource[]) => {
  if (!topic || !subject) return;
  const updatedTopic = { ...topic, resources };
  const updatedTopics = subject.topics.map(t => t.name === topic.name ? updatedTopic : t);
  const subjectRef = doc(db, 'subjects', params.subjectId);
  await updateDoc(subjectRef, { topics: updatedTopics });
  setTopic(updatedTopic);
  setSubject({ ...subject, topics: updatedTopics });
  toast({ title: 'Success', description: 'Resources updated.' });
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

  // Compute chart data
  const sessions = topic.studySessions || [];
  let chartData: number[] = [];
  let chartLabel = '';
  if (progressChartMode === 'cumulative') {
    let total = 0;
    chartData = sessions.map(s => {
      total += s.masteryGained || 0;
      return Math.round(total);
    });
    chartLabel = 'Cumulative Mastery %';
  } else if (progressChartMode === 'gain') {
    chartData = sessions.map(s => s.masteryGained || 0);
    chartLabel = 'Session Gain %';
  } else if (progressChartMode === 'xp') {
    let totalXP = 0;
    chartData = sessions.map(s => {
      totalXP += s.xpGained || 0;
      return totalXP;
    });
    chartLabel = 'XP Over Time';
  }
  const chartXAxis = sessions.map(s => s.date ? format(new Date(s.date), 'MM/dd') : '');

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header Section */}
        <div className={`flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 ${themeStyles.cardBg} p-6 rounded-lg shadow-lg ${themeStyles.border}`}>
          <div>
            <Link 
              href={`/subjects/${params.subjectId}`}
              className={`${themeStyles.accent} hover:underline transition mb-2 inline-flex items-center`}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to {subject?.name}
            </Link>
            <h1 className="text-3xl font-bold mt-2 mb-2">{topic.name}</h1>
            <p className={themeStyles.textSecondary}>{topic.description || "No description provided."}</p>
          </div>
          <div className="flex flex-col gap-2 md:items-end">
            <div className="flex items-center gap-4">
              <div className="flex items-center">
                <Award className={`h-5 w-5 mr-2 ${themeStyles.accent}`} />
                <span className={themeStyles.textSecondary}>Mastery:</span>
                <span className={`font-bold ml-2 ${themeStyles.textPrimary}`}>{topic.masteryLevel || 0}%</span>
              </div>
              <div className="flex items-center">
                <Brain className={`h-5 w-5 mr-2 ${themeStyles.accent}`} />
                <span className={themeStyles.textSecondary}>XP:</span>
                <span className={`font-bold ml-2 ${themeStyles.textPrimary}`}>{topic.xp || 0}</span>
              </div>
              <div className="flex items-center">
                <Clock className={`h-5 w-5 mr-2 ${themeStyles.accent}`} />
                <span className={themeStyles.textSecondary}>Study Time:</span>
                <span className={`font-bold ml-2 ${themeStyles.textPrimary}`}>{calculateTotalStudyTime()} min</span>
              </div>
              <IconButton size="small" sx={{ color: 'inherit' }} onClick={handleHeaderMenuClick}>
                <SettingsIcon />
              </IconButton>
              <Menu anchorEl={headerMenuAnchor} open={openHeaderMenu} onClose={handleHeaderMenuClose}>
                <MenuItem onClick={handleHeaderEdit}>Edit</MenuItem>
                <MenuItem onClick={handleHeaderDelete}>Delete</MenuItem>
              </Menu>
            </div>
          </div>
        </div>
        {/* Progress Bar */}
        <div className="w-full max-w-2xl mx-auto mb-8">
          <div className="flex justify-between items-center mb-1">
            <span className={`text-sm font-medium ${themeStyles.textSecondary}`}>Mastery Progress</span>
            <span className="text-sm font-semibold text-slate-200">{topic.masteryLevel || 0}%</span>
          </div>
          <div className="relative w-full h-6 bg-slate-700/70 rounded-lg border border-slate-600 shadow-sm overflow-hidden">
            <div
              className={`absolute left-0 top-0 h-full ${getProgressBarGradientClass(theme)}`}
              style={{
                width: `${topic.masteryLevel || 0}%`,
                transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
                borderRadius: '0.5rem',
                boxShadow: '0 2px 8px 0 rgba(0,0,0,0.10)'
              }}
            />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-bold text-white drop-shadow">
              {topic.masteryLevel || 0}%
            </span>
          </div>
        </div>
        {/* Tabs Section */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sessions">Study Sessions</TabsTrigger>
            {!topic.isHabitBased && <TabsTrigger value="concepts">Concepts</TabsTrigger>}
          </TabsList>
          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Progress Chart */}
              <Card sx={{ background: 'rgba(51,65,85,0.92)', boxShadow: 4, borderRadius: 3, border: '2px solid', borderColor: 'divider', mb: 3 }} className={themeStyles.border}>
                <CardContent sx={{ background: 'none', color: 'inherit', p: 2 }}>
                  <div className="mb-2 font-semibold text-lg flex items-center justify-between" style={{ color: 'inherit' }}>
                    <span>Progress Over Time</span>
                    <IconButton size="small" sx={{ color: 'inherit' }} onClick={handleChartMenuClick}>
                      <SettingsIcon />
                    </IconButton>
                    <Menu anchorEl={anchorEl} open={openMenu} onClose={handleChartMenuClose}>
                      <MenuItem selected={progressChartMode === 'cumulative'} onClick={() => handleChartModeChange('cumulative')}>Cumulative Mastery</MenuItem>
                      <MenuItem selected={progressChartMode === 'gain'} onClick={() => handleChartModeChange('gain')}>Session Gain</MenuItem>
                      <MenuItem selected={progressChartMode === 'xp'} onClick={() => handleChartModeChange('xp')}>XP Over Time</MenuItem>
                    </Menu>
                  </div>
                  <LineChart
                    height={220}
                    series={[{ data: chartData, label: chartLabel }]}
                    xAxis={[{ scaleType: 'point', data: chartXAxis }]}
                    sx={{ background: 'transparent', color: 'white' }}
                  />
                </CardContent>
              </Card>
              {/* Resources Section */}
              <Card sx={{ background: 'rgba(51,65,85,0.92)', boxShadow: 4, borderRadius: 3, border: '2px solid', borderColor: 'divider', mb: 3 }} className={themeStyles.border}>
                <CardContent sx={{ background: 'none', color: 'inherit', p: 2 }}>
                  <div className="mb-2 font-semibold text-lg flex items-center justify-between" style={{ color: 'inherit' }}>
                    Resources
                    <IconButton size="small" sx={{ color: 'primary.main' }} onClick={() => { setShowAddResource(true); setResourceForm({ title: '', url: '' }); }}>
                      <AddIcon />
                    </IconButton>
                  </div>
                  <ul className="space-y-2">
                    {(topic.resources || []).length === 0 && <li className="text-slate-400">No resources yet.</li>}
                    {(topic.resources || []).map((res, idx) => (
                      <li key={idx} className="flex items-center justify-between bg-slate-900 rounded px-2 py-1">
                        <a href={res.url} target="_blank" rel="noopener noreferrer" className="truncate text-blue-300 hover:underline max-w-xs">{res.title}</a>
                        <span>
                          <IconButton size="small" sx={{ color: 'info.main', mr: 1 }} onClick={() => handleEditResource(idx)}><EditIcon fontSize="small" /></IconButton>
                          <IconButton size="small" sx={{ color: 'error.main' }} onClick={() => handleDeleteResource(idx)}><DeleteIcon fontSize="small" /></IconButton>
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              {/* Recent Activity Section */}
              <Card sx={{ background: 'rgba(51,65,85,0.92)', boxShadow: 4, borderRadius: 3, border: '2px solid', borderColor: 'divider', mb: 3 }} className={themeStyles.border + ' col-span-1 md:col-span-2'}>
                <CardContent sx={{ background: 'none', color: 'inherit', p: 2 }}>
                  <div className="mb-2 font-semibold text-lg" style={{ color: 'inherit' }}>Recent Activity</div>
                  <ul className="divide-y divide-slate-700">
                    {(topic.studySessions || []).slice(-3).reverse().map((s, idx) => (
                      <li key={s.id || idx} className="py-2 flex items-center justify-between">
                        <span className="text-slate-100">{format(new Date(s.date), 'MMM dd, yyyy HH:mm')}</span>
                        <span className="text-slate-400">{activityTypes[s.activityType]?.name || s.activityType}</span>
                        <span className="text-slate-400">{s.duration} min</span>
                      </li>
                    ))}
                    {(!topic.studySessions || topic.studySessions.length === 0) && <li className="text-slate-400 py-2">No recent activity.</li>}
                  </ul>
                </CardContent>
              </Card>
            </div>
            {/* Add Resource Dialog */}
            <MuiDialog open={!!showAddResource} onClose={() => setShowAddResource(false)}>
              <MuiDialogTitle>Add Resource</MuiDialogTitle>
              <MuiDialogContent>
                <TextField label="Title" fullWidth margin="dense" value={resourceForm.title} onChange={e => setResourceForm(f => ({ ...f, title: e.target.value }))} />
                <TextField label="URL" fullWidth margin="dense" value={resourceForm.url} onChange={e => setResourceForm(f => ({ ...f, url: e.target.value }))} />
              </MuiDialogContent>
              <MuiDialogActions>
                <MuiButton onClick={() => setShowAddResource(false)}>Cancel</MuiButton>
                <MuiButton variant="contained" color="primary" onClick={handleAddResource}>Add</MuiButton>
              </MuiDialogActions>
            </MuiDialog>
            {/* Edit Resource Dialog */}
            <MuiDialog open={!!showEditResource} onClose={() => setShowEditResource(false)}>
              <MuiDialogTitle>Edit Resource</MuiDialogTitle>
              <MuiDialogContent>
                <TextField label="Title" fullWidth margin="dense" value={resourceForm.title} onChange={e => setResourceForm(f => ({ ...f, title: e.target.value }))} />
                <TextField label="URL" fullWidth margin="dense" value={resourceForm.url} onChange={e => setResourceForm(f => ({ ...f, url: e.target.value }))} />
              </MuiDialogContent>
              <MuiDialogActions>
                <MuiButton onClick={() => setShowEditResource(false)}>Cancel</MuiButton>
                <MuiButton variant="contained" color="primary" onClick={handleSaveEditResource}>Save</MuiButton>
              </MuiDialogActions>
            </MuiDialog>
          </TabsContent>
          <TabsContent value="sessions" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-xl font-semibold ${themeStyles.textPrimary}`}>Study Sessions</h2>
              <Button onClick={() => setIsAddingSession(true)} className={themeStyles.primary}>
                <Plus className="h-4 w-4 mr-2" />
                Add Session
              </Button>
            </div>
            <div className={`${themeStyles.cardBg} p-6 rounded-lg shadow-lg ${themeStyles.border}`}>
              {topic.studySessions && topic.studySessions.length > 0 ? (
                <StudySessionsTable
                  sessions={topic.studySessions}
                  onEdit={(session) => handleEditSession(session.id)}
                  onDelete={(session) => handleDeleteProgress('session', session.id)}
                  themeStyles={themeStyles}
                />
              ) : (
                <div className={`text-center py-8 ${themeStyles.textMuted}`}>
                  <p>No sessions added yet.</p>
                  <Button
                    onClick={() => setIsAddingSession(true)}
                    className={`mt-4 ${themeStyles.primary}`}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Session
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="concepts" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-xl font-semibold ${themeStyles.textPrimary}`}>Concepts</h2>
              <Button
                onClick={() => router.push(`/subjects/${params.subjectId}/topics/${encodeURIComponent(topic.name)}/concepts/new`)}
                className={themeStyles.primary}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Concept
              </Button>
            </div>
            {/* Concepts content here */}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}