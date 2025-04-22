"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Topic, StudySession } from "@/types/study";
import { Brain, Book, Video, PenTool, Users, HelpCircle, CheckCircle, Clock, Award, Trash2, History, TrendingUp, Plus, Edit2, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { activityTypes, difficultyLevels, calculateSessionXP } from "@/lib/xpSystem";
import { toast } from "@/components/ui/use-toast";

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

interface ProgressDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: {
    name: string;
    masteryLevel: number;
    xp: number;
    activities?: {
      id: string;
      type: string;
      status: string;
      duration: number;
      completedAt?: string;
      xpGained?: number;
      masteryGained?: number;
      description?: string;
    }[];
    studySessions?: StudySession[];
    progressHistory?: {
      date: string;
      type: string;
      description: string;
      xpChange: number;
      masteryChange: number;
    }[];
  };
  type: 'subject' | 'topic' | 'concept';
  onDeleteProgress?: (type: string, id: string) => Promise<void>;
  onAddSession?: (session: Partial<StudySession>) => Promise<void>;
  onUpdateSession?: (sessionId: string, updates: Partial<StudySession>) => Promise<void>;
}

interface EditingSession extends Partial<StudySession> {
  id: string;
}

const activityIcons = {
  video: Video,
  book: Book,
  recall: Brain,
  mindmap: Brain,
  questions: HelpCircle,
  teaching: Users,
};

const ProgressDetailsModal = ({ 
  open, 
  onOpenChange, 
  item, 
  type, 
  onDeleteProgress,
  onAddSession,
  onUpdateSession 
}: ProgressDetailsModalProps) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');
  const [editingSession, setEditingSession] = useState<EditingSession | null>(null);
  const [isAddingSession, setIsAddingSession] = useState(false);
  const [newSession, setNewSession] = useState<Partial<StudySession>>({
    date: new Date().toISOString(),
    duration: 30,
    notes: '',
    activityType: 'study' as keyof typeof activityTypes,
    difficulty: 'medium' as keyof typeof difficultyLevels,
    xpGained: 0,
    masteryGained: 0,
  });

  // Add function to calculate and update XP
  const updateSessionXP = (
    session: Partial<StudySession>,
    setter: (session: Partial<StudySession>) => void
  ) => {
    if (!session.duration || !session.activityType || !session.difficulty) return;

    const { xp, masteryGained } = calculateSessionXP({
      activityType: session.activityType,
      difficulty: session.difficulty,
      duration: session.duration,
      currentLevel: item.masteryLevel || 1,
    });

    setter({
      ...session,
      xpGained: xp,
      masteryGained: masteryGained,
    });
  };

  // Update XP whenever duration, activity type, or difficulty changes
  useEffect(() => {
    updateSessionXP(newSession, setNewSession);
  }, [newSession.duration, newSession.activityType, newSession.difficulty]);

  useEffect(() => {
    if (editingSession) {
      updateSessionXP(editingSession, setEditingSession);
    }
  }, [editingSession?.duration, editingSession?.activityType, editingSession?.difficulty]);

  const handleStartAddSession = () => {
    setIsAddingSession(true);
    setNewSession({
      date: new Date().toISOString(),
      duration: 30,
      notes: '',
      activityType: 'study' as keyof typeof activityTypes,
      difficulty: 'medium' as keyof typeof difficultyLevels,
      xpGained: 0,
      masteryGained: 0,
    });
  };

  const handleSaveNewSession = async () => {
    if (!onAddSession) return;
    
    // Calculate final XP and mastery before saving
    const { xp, masteryGained } = calculateSessionXP({
      activityType: newSession.activityType || 'study',
      difficulty: newSession.difficulty || 'medium',
      duration: newSession.duration || 0,
      currentLevel: item.masteryLevel || 1,
    });

    const sessionToAdd = {
      ...newSession,
      xpGained: xp,
      masteryGained: masteryGained,
    };
    
    try {
      await onAddSession(sessionToAdd);
      setIsAddingSession(false);
      setNewSession({
        date: new Date().toISOString(),
        duration: 30,
        notes: '',
        activityType: 'study',
        difficulty: 'medium',
        xpGained: 0,
        masteryGained: 0,
      });
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

  const handleStartEditSession = (session: StudySession) => {
    setEditingSession({
      id: session.id,
      date: session.date,
      duration: session.duration,
      notes: session.notes,
      activityType: session.activityType,
      difficulty: session.difficulty,
      xpGained: session.xpGained,
      masteryGained: session.masteryGained,
    });
  };

  const handleSaveEditSession = async () => {
    if (!editingSession || !onUpdateSession) return;
    
    // Calculate final XP and mastery before saving
    const { xp, masteryGained } = calculateSessionXP({
      activityType: editingSession.activityType || 'study',
      difficulty: editingSession.difficulty || 'medium',
      duration: editingSession.duration || 0,
      currentLevel: item.masteryLevel || 1,
    });

    const updatedSession = {
      ...editingSession,
      xpGained: xp,
      masteryGained: masteryGained,
    };
    
    try {
      await onUpdateSession(editingSession.id, updatedSession);
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

  const getActivityTypeIcon = (type: string) => {
    return activityIcons[type as keyof typeof activityIcons] || Brain;
  };

  const calculateActivityCompletion = () => {
    if (!item.activities || item.activities.length === 0) return 0;
    const completedActivities = item.activities.filter(a => a.status === "completed").length;
    return (completedActivities / item.activities.length) * 100;
  };

  const calculateTotalStudyTime = () => {
    if (!item.activities) return 0;
    return item.activities.reduce((total, activity) => total + activity.duration, 0) / 60;
  };

  const getProgressBreakdown = () => {
    const breakdown = {
      activities: calculateActivityCompletion(),
      studyTime: Math.min((calculateTotalStudyTime() / 10) * 100, 100),
      xp: ((item.xp || 0) / 1000) * 100,
      conceptMastery: item.masteryLevel || 0,
    };

    return breakdown;
  };

  const overallProgress = Object.values(getProgressBreakdown()).reduce((a, b) => a + b, 0) / 4;

  // Sort activities by completion date
  const sortedActivities = item.activities 
    ? [...item.activities].sort((a, b) => {
        if (!a.completedAt || !b.completedAt) return 0;
        return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
      })
    : [];

  // Sort study sessions by date
  const sortedSessions = item.studySessions 
    ? [...item.studySessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Progress Details for {item.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 mb-6 border-b">
          <button
            onClick={() => setActiveTab('overview')}
            className={cn(
              "pb-2 px-4 transition-colors",
              activeTab === 'overview' 
                ? "border-b-2 border-primary text-primary font-medium" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              "pb-2 px-4 transition-colors",
              activeTab === 'history' 
                ? "border-b-2 border-primary text-primary font-medium" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Progress History
          </button>
        </div>

        {activeTab === 'overview' ? (
          <div className="space-y-6">
            {/* Overall Progress */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Overall Progress</h3>
              <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300 ease-in-out"
                  style={{ width: `${Math.round(overallProgress)}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {Math.round(overallProgress)}% Complete
              </p>
            </div>

            {/* Progress Breakdown */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Contributing Factors</h3>
              <div className="space-y-4">
                {Object.entries(getProgressBreakdown()).map(([key, value]) => (
                  <div key={key}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                      <span>{Math.round(value)}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all duration-300 ease-in-out",
                          key === "activities" && "bg-blue-500",
                          key === "studyTime" && "bg-green-500",
                          key === "xp" && "bg-yellow-500",
                          key === "conceptMastery" && "bg-purple-500"
                        )}
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Study Time and XP Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-4">
                <Clock className="h-6 w-6" />
                <div>
                  <h3 className="font-semibold">Total Study Time</h3>
                  <p className="text-muted-foreground">
                    {calculateTotalStudyTime().toFixed(1)} hours
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Award className="h-6 w-6" />
                <div>
                  <h3 className="font-semibold">Experience Points</h3>
                  <p className="text-muted-foreground">{item.xp || 0} XP</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Completed Activities */}
            {sortedActivities.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Completed Activities</h3>
                <div className="space-y-3">
                  {sortedActivities.map((activity) => {
                    if (activity.status !== 'completed') return null;
                    const Icon = getActivityTypeIcon(activity.type);
                    return (
                      <div key={activity.id} className="bg-gray-50 p-4 rounded-lg border">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Icon className="h-5 w-5" />
                            <div>
                              <p className="font-medium">{activity.type}</p>
                              <p className="text-sm text-muted-foreground">
                                {activity.completedAt && formatDate(activity.completedAt)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {activity.xpGained && (
                              <span className="text-sm font-medium text-yellow-600">
                                +{activity.xpGained} XP
                              </span>
                            )}
                            {activity.masteryGained && (
                              <span className="text-sm font-medium text-purple-600">
                                +{activity.masteryGained}% Mastery
                              </span>
                            )}
                            {onDeleteProgress && (
                              <button
                                onClick={() => onDeleteProgress('activity', activity.id)}
                                className="text-red-500 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Study Sessions */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Study Sessions</h3>
                <button
                  onClick={handleStartAddSession}
                  className="flex items-center gap-2 px-3 py-1 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
                >
                  <Plus className="h-4 w-4" />
                  Add Session
                </button>
              </div>

              <div className="space-y-3">
                {/* Add New Session Form */}
                {isAddingSession && (
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Activity Type</label>
                          <select
                            value={newSession.activityType}
                            onChange={(e) => setNewSession({
                              ...newSession,
                              activityType: e.target.value as keyof typeof activityTypes
                            })}
                            className="w-full px-3 py-1.5 rounded border bg-white"
                          >
                            {Object.entries(activityTypes).map(([key, value]) => (
                              <option key={key} value={key}>{value.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                          <select
                            value={newSession.difficulty}
                            onChange={(e) => setNewSession({
                              ...newSession,
                              difficulty: e.target.value as keyof typeof difficultyLevels
                            })}
                            className="w-full px-3 py-1.5 rounded border bg-white"
                          >
                            {Object.entries(difficultyLevels).map(([key, value]) => (
                              <option key={key} value={key}>{value.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
                          <input
                            type="datetime-local"
                            value={new Date(newSession.date || '').toISOString().slice(0, 16)}
                            onChange={(e) => setNewSession({ ...newSession, date: new Date(e.target.value).toISOString() })}
                            className="w-full px-3 py-1.5 rounded border bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                          <input
                            type="number"
                            min="1"
                            max="480"
                            value={newSession.duration}
                            onChange={(e) => {
                              const value = Math.max(1, Math.min(480, parseInt(e.target.value) || 0));
                              setNewSession({ ...newSession, duration: value });
                            }}
                            placeholder="Duration (minutes)"
                            className="w-full px-3 py-1.5 rounded border bg-white"
                          />
                          <p className="text-xs text-gray-500 mt-1">Min: 1 minute, Max: 8 hours</p>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea
                          value={newSession.notes}
                          onChange={(e) => setNewSession({ ...newSession, notes: e.target.value })}
                          placeholder="What did you study? What did you learn?"
                          className="w-full px-3 py-1.5 rounded border bg-white h-24"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">XP to be Gained</label>
                          <div className="w-full px-3 py-1.5 rounded border bg-gray-100 text-gray-700">
                            {newSession.xpGained || 0} XP
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Mastery to be Gained</label>
                          <div className="w-full px-3 py-1.5 rounded border bg-gray-100 text-gray-700">
                            {newSession.masteryGained || 0}%
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setIsAddingSession(false)}
                          className="p-2 text-red-500 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <button
                          onClick={handleSaveNewSession}
                          className="p-2 text-green-500 hover:text-green-600"
                          disabled={!newSession.duration || newSession.duration < 1}
                        >
                          <Save className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Existing Sessions */}
                {item.studySessions?.map((session) => (
                  <div key={session.id} className="bg-gray-50 p-4 rounded-lg border">
                    {editingSession?.id === session.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Activity Type</label>
                            <select
                              value={editingSession.activityType}
                              onChange={(e) => setEditingSession({
                                ...editingSession,
                                activityType: e.target.value as keyof typeof activityTypes
                              })}
                              className="w-full px-3 py-1.5 rounded border bg-white"
                            >
                              {Object.entries(activityTypes).map(([key, value]) => (
                                <option key={key} value={key}>{value.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                            <select
                              value={editingSession.difficulty}
                              onChange={(e) => setEditingSession({
                                ...editingSession,
                                difficulty: e.target.value as keyof typeof difficultyLevels
                              })}
                              className="w-full px-3 py-1.5 rounded border bg-white"
                            >
                              {Object.entries(difficultyLevels).map(([key, value]) => (
                                <option key={key} value={key}>{value.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
                            <input
                              type="datetime-local"
                              value={new Date(editingSession.date || '').toISOString().slice(0, 16)}
                              onChange={(e) => setEditingSession({ 
                                ...editingSession, 
                                date: new Date(e.target.value).toISOString() 
                              })}
                              className="w-full px-3 py-1.5 rounded border bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                            <input
                              type="number"
                              min="1"
                              max="480"
                              value={editingSession.duration}
                              onChange={(e) => {
                                const value = Math.max(1, Math.min(480, parseInt(e.target.value) || 0));
                                setEditingSession({ 
                                  ...editingSession, 
                                  duration: value
                                });
                              }}
                              placeholder="Duration (minutes)"
                              className="w-full px-3 py-1.5 rounded border bg-white"
                            />
                            <p className="text-xs text-gray-500 mt-1">Min: 1 minute, Max: 8 hours</p>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                          <textarea
                            value={editingSession.notes}
                            onChange={(e) => setEditingSession({ 
                              ...editingSession, 
                              notes: e.target.value 
                            })}
                            placeholder="What did you study? What did you learn?"
                            className="w-full px-3 py-1.5 rounded border bg-white h-24"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">XP to be Gained</label>
                            <div className="w-full px-3 py-1.5 rounded border bg-gray-100 text-gray-700">
                              {editingSession.xpGained || 0} XP
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Mastery to be Gained</label>
                            <div className="w-full px-3 py-1.5 rounded border bg-gray-100 text-gray-700">
                              {editingSession.masteryGained || 0}%
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingSession(null)}
                            className="p-2 text-red-500 hover:text-red-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                          <button
                            onClick={handleSaveEditSession}
                            className="p-2 text-green-500 hover:text-green-600"
                            disabled={!editingSession.duration || editingSession.duration < 1}
                          >
                            <Save className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <History className="h-5 w-5" />
                          <div>
                            <p className="font-medium">Study Session</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(session.date)} • {session.duration} minutes
                            </p>
                            {session.notes && (
                              <p className="text-sm text-muted-foreground mt-1">{session.notes}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {session.xpGained > 0 && (
                            <span className="text-sm font-medium text-yellow-600">
                              +{session.xpGained} XP
                            </span>
                          )}
                          {session.masteryGained > 0 && (
                            <span className="text-sm font-medium text-purple-600">
                              +{session.masteryGained}% Mastery
                            </span>
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleStartEditSession(session)}
                              className="p-1 text-slate-400 hover:text-slate-600"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            {onDeleteProgress && (
                              <button
                                onClick={() => onDeleteProgress('session', session.id)}
                                className="p-1 text-red-400 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Other Progress Events */}
            {item.progressHistory && item.progressHistory.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Other Progress Events</h3>
                <div className="space-y-3">
                  {item.progressHistory.map((event, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <TrendingUp className="h-5 w-5" />
                          <div>
                            <p className="font-medium">{event.type}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(event.date)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {event.xpChange > 0 && (
                            <span className="text-sm font-medium text-yellow-600">
                              +{event.xpChange} XP
                            </span>
                          )}
                          {event.masteryChange > 0 && (
                            <span className="text-sm font-medium text-purple-600">
                              +{event.masteryChange}% Mastery
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">{event.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProgressDetailsModal; 