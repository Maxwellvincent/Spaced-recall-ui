"use client";

import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { getFirebaseDb } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { Loader2, BookOpen, Brain, Clock, Star, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/contexts/theme-context";
import { ThemedHeader } from '@/components/ui/themed-header';

interface StudyNode {
  id: string;
  label: string;
  type: 'subject' | 'topic' | 'concept';
  level: number;
  progress: number;
  xp: number;
  concepts: string[];
  children?: StudyNode[];
}

export default function StudyOverviewPage() {
  const [user, loading] = useAuthState(auth);
  const { theme } = useTheme();
  const [subjectNodes, setSubjectNodes] = useState<StudyNode[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to get theme-specific styles
  const getThemeStyles = () => {
    switch (theme.toLowerCase()) {
      case 'dbz':
        return {
          primary: 'bg-yellow-600 hover:bg-yellow-700',
          accent: 'text-yellow-500',
          statBg: 'bg-yellow-500/20',
          header: 'Training Overview'
        };
      case 'naruto':
        return {
          primary: 'bg-orange-600 hover:bg-orange-700',
          accent: 'text-orange-500',
          statBg: 'bg-orange-500/20',
          header: 'Jutsu Training Overview'
        };
      case 'hogwarts':
        return {
          primary: 'bg-purple-600 hover:bg-purple-700',
          accent: 'text-purple-500',
          statBg: 'bg-purple-500/20',
          header: 'Magical Studies Overview'
        };
      default:
        return {
          primary: 'bg-blue-600 hover:bg-blue-700',
          accent: 'text-blue-500',
          statBg: 'bg-blue-500/20',
          header: 'Study Overview'
        };
    }
  };

  const themeStyles = getThemeStyles();

  useEffect(() => {
    if (loading) return;
    if (!user) return;

    const fetchSubjects = async () => {
      setIsLoading(true);
      try {
        const db = getFirebaseDb();
        const subjectsRef = collection(db, 'subjects');
        const q = query(
          subjectsRef, 
          where('userId', '==', user.uid),
          orderBy('name')
        );
        
        const querySnapshot = await getDocs(q);
        const subjects: StudyNode[] = [];
        
        querySnapshot.forEach(doc => {
          const data = doc.data();
          const topics = data.topics || [];
          
          // Count all concepts across topics
          const conceptsList: string[] = [];
          topics.forEach((topic: any) => {
            if (topic.concepts && Array.isArray(topic.concepts)) {
              topic.concepts.forEach((concept: any) => {
                if (concept && concept.name) {
                  conceptsList.push(concept.name);
                }
              });
            }
          });
          
          // Calculate average mastery
          let totalMastery = 0;
          let masteryCount = 0;
          
          topics.forEach((topic: any) => {
            if (topic.masteryLevel !== undefined) {
              totalMastery += topic.masteryLevel;
              masteryCount++;
            }
            
            if (topic.concepts && Array.isArray(topic.concepts)) {
              topic.concepts.forEach((concept: any) => {
                if (concept && concept.masteryLevel !== undefined) {
                  totalMastery += concept.masteryLevel;
                  masteryCount++;
                }
              });
            }
          });
          
          const averageMastery = masteryCount > 0 ? Math.round(totalMastery / masteryCount) : 0;
          
          subjects.push({
            id: doc.id,
            label: data.name || 'Unnamed Subject',
            type: 'subject',
            level: data.level || 0,
            progress: averageMastery,
            xp: data.xp || 0,
            concepts: conceptsList
          });
        });
        
        setSubjectNodes(subjects);
        
        // Select first subject by default if none selected
        if (subjects.length > 0 && !selectedSubject) {
          setSelectedSubject(subjects[0].id);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching subjects:', err);
        setError('Failed to load your study data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSubjects();
  }, [user, loading]);

  const getSubjectDetails = (subjectId: string) => {
    const subject = subjectNodes.find(node => node.id === subjectId);
    if (!subject) return null;
    
    // Calculate stats
    const totalTopics = 0; // Would need to fetch from subject data
    const completedTopics = 0; // Would need to fetch from subject data
    const totalConcepts = subject.concepts.length;
    const completedConcepts = 0; // Would need to fetch from subject data
    
    return {
      subject,
      stats: {
        totalTopics,
        completedTopics,
        totalConcepts,
        completedConcepts
      }
    };
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-slate-200">Loading your study data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-900/20 p-8 rounded-lg text-center max-w-md">
          <h2 className="text-2xl font-bold text-red-400 mb-4">Error</h2>
          <p className="text-slate-300 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-md"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Luxury Top Bar */}
      <div className="px-4 pt-8 pb-4">
        <ThemedHeader
          theme={theme}
          title={themeStyles.header}
          subtitle="Visualize your mastery and progress"
          className="mb-6 shadow-lg"
        />
      </div>

      <div className="flex-1 w-full max-w-7xl mx-auto px-4 pb-8 flex flex-col gap-8">
        {/* XP Ring luxury widget */}
        <div className="luxury-card p-8 animate-fadeIn mb-8 flex items-center gap-6">
          <div className="flex flex-col items-center justify-center">
            <span className="text-4xl font-bold animate-spin-slow">🟢</span>
            <span className="text-lg font-semibold mt-2">XP Ring</span>
            <span className="text-2xl font-bold mt-1">{subjectNodes.reduce((acc, s) => acc + s.xp, 0)} XP</span>
            <span className="text-xs text-slate-400">Total XP across all subjects</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Subjects List luxury card */}
          <div className="lg:col-span-1">
            <div className="luxury-card p-6 animate-fadeIn">
              <h2 className="text-xl font-semibold mb-4 text-white">Subjects</h2>
              <div className="space-y-3">
                {subjectNodes.map(node => (
                  <button
                    key={node.id}
                    onClick={() => setSelectedSubject(node.id)}
                    className={`w-full text-left p-4 rounded-lg transition luxury-card border-2 ${selectedSubject === node.id ? 'border-blue-500' : 'border-transparent hover:border-blue-400'}`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{node.label}</span>
                      <span className="text-sm">Level {node.level}</span>
                    </div>
                    <div className="mt-2">
                      <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${themeStyles.accent}`}
                          style={{ width: `${node.progress}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-xs">{node.concepts.length} concepts</span>
                        <span className="text-xs">{node.progress}% mastered</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Subject Details luxury card */}
          <div className="lg:col-span-2">
            {selectedSubject ? (
              <div className="space-y-6">
                {/* Subject Overview luxury card */}
                <div className="luxury-card p-6 animate-fadeIn">
                  {(() => {
                    const details = getSubjectDetails(selectedSubject);
                    if (!details) return <p className="text-slate-300">Subject not found</p>;

                    const { subject, stats } = details;
                    return (
                      <>
                        <h2 className="text-2xl font-bold text-white mb-4">{subject.label}</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                          <div className="luxury-card p-4">
                            <div className="text-sm text-slate-400">Topics</div>
                            <div className="text-xl text-white">{stats.completedTopics}/{stats.totalTopics}</div>
                          </div>
                          <div className="luxury-card p-4">
                            <div className="text-sm text-slate-400">Concepts</div>
                            <div className="text-xl text-white">{stats.completedConcepts}/{stats.totalConcepts}</div>
                          </div>
                          <div className="luxury-card p-4">
                            <div className="text-sm text-slate-400">Level</div>
                            <div className="text-xl text-white">{subject.level}</div>
                          </div>
                          <div className="luxury-card p-4">
                            <div className="text-sm text-slate-400">XP</div>
                            <div className="text-xl text-white">{subject.xp}</div>
                          </div>
                        </div>

                        {/* Concepts luxury cards */}
                        <div>
                          <h3 className="text-lg font-semibold mb-3 text-white">Concepts</h3>
                          {subject.concepts.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {subject.concepts.map((concept, index) => (
                                <div
                                  key={`concept-${index}`}
                                  className="luxury-card p-3 flex items-center justify-between animate-fadeIn"
                                >
                                  <div className="flex items-center">
                                    <span className="text-2xl mr-3">🧠</span>
                                    <span className="text-slate-200">{concept}</span>
                                  </div>
                                  <ChevronRight className="h-4 w-4 text-slate-500" />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-slate-400">No concepts found for this subject.</p>
                          )}
                        </div>

                        <div className="mt-6 flex justify-end">
                          <Link
                            href={`/subjects/${subject.id}`}
                            className="luxury-card px-4 py-2 flex items-center gap-2 hover:shadow-lg transition-all"
                          >
                            View Subject
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <div className="luxury-card p-8 text-center animate-fadeIn">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-slate-500" />
                <h2 className="text-xl font-semibold mb-2 text-white">No Subject Selected</h2>
                <p className="text-slate-400">
                  {subjectNodes.length > 0
                    ? "Select a subject from the list to view details"
                    : "You haven't created any subjects yet"}
                </p>
                {subjectNodes.length === 0 && (
                  <Link
                    href="/subjects/create"
                    className="luxury-card px-4 py-2 inline-flex items-center gap-2 mt-4 hover:shadow-lg transition-all"
                  >
                    Create Your First Subject
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 