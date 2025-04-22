'use client';

import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from '@/components/ui/use-toast';
import { StudySession as StudySessionType, Subject, Topic } from '@/types';
import { useState, useEffect } from 'react';
import { Loader2, Plus, Edit2, Trash2 } from 'lucide-react';
import StudySession from '@/components/StudySession';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { activityTypes, difficultyLevels, calculateSessionXP } from '@/lib/xpSystem';

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
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [editingSession, setEditingSession] = useState<Partial<StudySessionType> | null>(null);
  const [newSession, setNewSession] = useState<Partial<StudySessionType>>({
    date: new Date().toISOString(),
    duration: 30,
    notes: '',
    activityType: 'study' as keyof typeof activityTypes,
    difficulty: 'medium' as keyof typeof difficultyLevels,
    xpGained: 0,
    masteryGained: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const subjectRef = doc(db, 'subjects', params.subjectId);
        const subjectSnap = await getDoc(subjectRef);
        
        if (subjectSnap.exists()) {
          const subjectData = subjectSnap.data() as Subject;
          setSubject(subjectData);
          
          const topicData = subjectData.topics.find(t => t.name === params.topicName);
          if (topicData) {
            setTopic(topicData);
          } else {
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

    if (type === 'activity') {
      // Find the activity to get its contribution to mastery and XP
      const activity = topic.activities?.find(a => a.id === id);
      if (activity) {
        // Remove the activity
        updatedTopic.activities = (topic.activities || []).filter(a => a.id !== id);
        // Adjust mastery and XP if the activity had contributed to them
        if (activity.masteryGained) {
          updatedTopic.masteryLevel = Math.max(0, (topic.masteryLevel || 0) - activity.masteryGained);
        }
        if (activity.xpGained) {
          updatedTopic.xp = Math.max(0, (topic.xp || 0) - activity.xpGained);
        }
      }
    } else if (type === 'session') {
      // Find the session to get its contribution to mastery and XP
      const session = topic.studySessions?.find(s => s.id === id);
      if (session) {
        // Remove the session
        updatedTopic.studySessions = (topic.studySessions || []).filter(s => s.id !== id);
        
        // Also remove the corresponding activity
        const sessionActivity = topic.activities?.find(
          a => a.type === session.activityType && a.completedAt === session.date
        );
        if (sessionActivity) {
          updatedTopic.activities = (topic.activities || []).filter(a => a.id !== sessionActivity.id);
        }
        
        // Adjust mastery and XP
        updatedTopic.masteryLevel = Math.max(0, (topic.masteryLevel || 0) - session.masteryGained);
        updatedTopic.xp = Math.max(0, (topic.xp || 0) - session.xpGained);
      }
    }

    // Update the topics array in the subject
    const updatedTopics = subject.topics.map(t =>
      t.name === topic.name ? updatedTopic : t
    );

    // Update Firestore
    const subjectRef = doc(db, 'subjects', subject.id);
    await updateDoc(subjectRef, { topics: updatedTopics });

    // Update local state
    setTopic(updatedTopic);

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
    };

    // Update the topics array in the subject
    const updatedTopics = subject.topics.map(t =>
      t.name === topic.name ? updatedTopic : t
    );

    // Update Firestore
    const subjectRef = doc(db, 'subjects', subject.id);
    await updateDoc(subjectRef, { topics: updatedTopics });

    // Update local state
    setTopic(updatedTopic);

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
    // Find the old session
    const oldSession = topic.studySessions?.find(s => s.id === sessionId);
    if (!oldSession) {
      console.error('Session not found:', sessionId);
      return;
    }

    // Create the updated session
    const updatedSession = {
      ...oldSession,
      ...updates,
    };

    // Find and update the corresponding activity
    const sessionActivity = topic.activities?.find(
      a => a.type === oldSession.activityType && a.completedAt === oldSession.date
    );

    const updatedTopic = {
      ...topic,
      studySessions: (topic.studySessions || []).map(s =>
        s.id === sessionId ? updatedSession : s
      ),
      activities: (topic.activities || []).map(a =>
        a.id === sessionActivity?.id
          ? {
              ...a,
              type: updatedSession.activityType,
              duration: updatedSession.duration,
              description: updatedSession.notes || 'Study session',
              completedAt: updatedSession.date,
              xpGained: updatedSession.xpGained,
              masteryGained: updatedSession.masteryGained,
            }
          : a
      ),
      // Update total XP and mastery
      xp: (topic.xp || 0) - (oldSession.xpGained || 0) + (updatedSession.xpGained || 0),
      masteryLevel: Math.min(
        100,
        Math.max(
          0,
          (topic.masteryLevel || 0) - (oldSession.masteryGained || 0) + (updatedSession.masteryGained || 0)
        )
      ),
    };

    // Update the topics array in the subject
    const updatedTopics = subject.topics.map(t =>
      t.name === topic.name ? updatedTopic : t
    );

    // Update Firestore
    const subjectRef = doc(db, 'subjects', subject.id);
    await updateDoc(subjectRef, { topics: updatedTopics });

    // Update local state
    setTopic(updatedTopic);

    toast({
      title: "Success",
      description: `Session updated: +${updatedSession.xpGained} XP, +${updatedSession.masteryGained}% Mastery`,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!subject || !topic) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold text-gray-900">Topic Not Found</h1>
        <p className="text-gray-600 mt-2">The requested topic could not be found.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{topic.name}</h1>
            <p className="text-gray-600 mt-1">{topic.description}</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-gray-600">Mastery Level</p>
              <p className="text-lg font-semibold">{topic.masteryLevel}%</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">XP</p>
              <p className="text-lg font-semibold">{topic.xp}</p>
            </div>
            <button
              onClick={() => setShowProgressModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              View Progress
            </button>
          </div>
        </div>

        {/* Study Session Component */}
        <div className="bg-white rounded-lg shadow">
          <StudySession
            subjectId={params.subjectId}
            topicName={params.topicName}
          />
        </div>

        {/* Progress Modal */}
        <Dialog open={showProgressModal} onOpenChange={setShowProgressModal}>
          <DialogContent className="max-w-4xl">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Progress History</h2>
              
              {/* Study Sessions */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Study Sessions</h3>
                  <button
                    onClick={() => setEditingSession({})}
                    className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4" />
                    Add Session
                  </button>
                </div>
                
                <div className="space-y-3">
                  {topic.studySessions?.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium">{session.activityType}</p>
                        <p className="text-sm text-gray-600">{format(new Date(session.date), 'PPP')}</p>
                        {session.notes && (
                          <p className="text-sm text-gray-600 mt-1">{session.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm">+{session.xpGained} XP</p>
                          <p className="text-sm">+{session.masteryGained}% Mastery</p>
                          <p className="text-sm text-gray-600">{session.duration} minutes</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingSession(session)}
                            className="p-1 text-gray-600 hover:text-blue-600"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProgress('session', session.id)}
                            className="p-1 text-gray-600 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}