"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import type { Subject } from "@/types/study";
import { useAuth } from "@/lib/auth";
import { Loader2, Plus } from "lucide-react";
import { MigrationButton } from '@/components/MigrationButton';
import { SubjectAnalytics } from '@/components/SubjectAnalytics';
import { SubjectReviewDashboard } from '@/components/SubjectReviewDashboard';
import { ExamModeSettings } from '@/components/ExamModeSettings';

interface ExtendedSubject extends Subject {
  id: string;
  userId: string;
}

interface PageProps {
  params: { subjectId: string }
}

export default function SubjectDetailsPage({ params }: PageProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [subject, setSubject] = useState<ExtendedSubject | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSubject = async () => {
    if (!user) return;

    try {
      const subjectId = decodeURIComponent(params.subjectId);
      console.log('Attempting to fetch subject with ID:', subjectId);
      
      const subjectRef = doc(db, 'subjects', subjectId);
      const subjectDoc = await getDoc(subjectRef);
      
      if (!subjectDoc.exists()) {
        console.error('Subject not found:', subjectId);
        setError('Subject not found. Please try again later.');
        return;
      }

      const subjectData = subjectDoc.data() as ExtendedSubject;
      
      if (subjectData.userId !== user.uid) {
        console.error('Access denied: Subject does not belong to current user');
        setError('Access denied');
        return;
      }

      // Calculate progress if it doesn't exist
      if (!subjectData.progress) {
        const totalXP = subjectData.topics.reduce((sum, t) => sum + (t.xp || 0), 0);
        const averageMastery = Math.floor(
          subjectData.topics.reduce((sum, t) => sum + (t.masteryLevel || 0), 0) / 
          (subjectData.topics.length || 1)
        );
        
        subjectData.progress = {
          totalXP,
          averageMastery,
          completedTopics: subjectData.topics.filter(t => (t.masteryLevel || 0) >= 80).length,
          totalTopics: subjectData.topics.length,
          lastStudied: new Date().toISOString()
        };
      }

      const fullSubjectData = {
        ...subjectData,
        id: subjectDoc.id,
        topics: subjectData.topics || [],
        masteryPath: subjectData.masteryPath || {
          currentLevel: 1,
          nextLevel: 2,
          progress: 0
        }
      };

      console.log('Subject data loaded:', {
        id: fullSubjectData.id,
        name: fullSubjectData.name,
        progress: fullSubjectData.progress,
        topicsCount: fullSubjectData.topics.length,
        totalXP: fullSubjectData.topics.reduce((sum, t) => sum + (t.xp || 0), 0)
      });

      setSubject(fullSubjectData);
    } catch (error) {
      console.error('Error fetching subject:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack);
        setError('Error loading subject. Please try again later.');
      } else {
        setError('An unexpected error occurred. Please try again later.');
      }
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    fetchSubject();
  }, [user, loading, params.subjectId, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-slate-200">Loading subject...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="bg-red-900/20 p-8 rounded-lg text-center max-w-md">
          <h2 className="text-2xl font-bold text-red-400 mb-4">Subject Not Found</h2>
          <p className="text-slate-300 mb-6">
            The subject you're looking for could not be found. It may have been deleted or you might not have access to it.
          </p>
          <Link 
            href="/subjects" 
            className="inline-block bg-slate-800 text-white px-6 py-2 rounded-lg hover:bg-slate-700 transition"
          >
            Return to Subjects
          </Link>
        </div>
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-slate-200">Loading subject...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <Link 
              href="/subjects"
              className="text-blue-400 hover:text-blue-300 transition mb-2 inline-block"
            >
              ← Back to Subjects
            </Link>
            <h1 className="text-3xl font-bold">{subject.name}</h1>
          </div>
          <button
            onClick={() => router.push(`/subjects/${subject.id}/topics/new`)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="h-5 w-5" />
            Add Topic
          </button>
        </div>
        
        <div className="space-y-8">
          <div className="hidden">
            Debug Progress: {JSON.stringify(subject?.progress)}
          </div>
          
          <SubjectAnalytics 
            subjectId={params.subjectId} 
            topics={subject.topics}
            progress={subject.progress}
          />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div 
              className="bg-slate-800 p-6 rounded-lg shadow-lg"
              onClick={() => {
                console.log('Progress Card Values:', {
                  level: subject.level,
                  xp: subject.xp,
                  masteryPath: subject.masteryPath,
                  calculatedXP: subject.topics.reduce((sum, t) => sum + (t.xp || 0), 0),
                  topicsXP: subject.topics.map(t => ({ name: t.name, xp: t.xp })),
                  progress: subject.progress
                });
              }}
            >
              <h2 className="text-xl font-semibold mb-4">Progress</h2>
              <div className="flex justify-between mb-4">
                <div>
                  <p className="text-sm text-slate-400">Level</p>
                  <p className="text-2xl font-bold">{subject.level}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-400">XP</p>
                  <p className="text-2xl font-bold">{subject.xp}</p>
                </div>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div 
                  className="bg-blue-500 rounded-full h-2 transition-all duration-500" 
                  style={{ width: `${subject.masteryPath.progress}%` }}
                />
              </div>
              <p className="text-sm text-slate-400 mt-2">
                {subject.masteryPath.progress}% progress to level {subject.masteryPath.nextLevel}
              </p>
            </div>
            
            <div className="bg-slate-800 p-6 rounded-lg shadow-lg lg:col-span-2">
              <h2 className="text-xl font-semibold mb-4">Study Style</h2>
              <p className="text-slate-300">{subject.studyStyle}</p>
              <p className="text-slate-400 mt-4">{subject.description}</p>
            </div>
          </div>

          <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Topics</h2>
              <p className="text-slate-400">
                {subject.topics.length} topic{subject.topics.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subject.topics.map(topic => {
                const formattedTopicName = topic.name.trim();
                return (
                  <div 
                    key={formattedTopicName} 
                    className="bg-slate-700 p-4 rounded-lg hover:bg-slate-600 transition cursor-pointer"
                    onClick={() => {
                      console.log('Navigating to topic:', formattedTopicName);
                      router.push(`/subjects/${subject.id}/topics/${encodeURIComponent(formattedTopicName)}`);
                    }}
                  >
                    <h3 className="font-semibold mb-2">{formattedTopicName}</h3>
                    <p className="text-sm text-slate-400 mb-3">{topic.description}</p>
                    <div className="flex justify-between text-sm">
                      <div>
                        <p className="text-slate-400">Mastery</p>
                        <p className="font-medium">{topic.masteryLevel}%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-400">XP</p>
                        <p className="font-medium">{topic.xp}</p>
                      </div>
                    </div>
                    <div className="mt-2 w-full bg-slate-600 rounded-full h-1.5">
                      <div 
                        className="bg-blue-500 rounded-full h-1.5" 
                        style={{ width: `${topic.masteryLevel}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">{subject?.name}</h1>
          <MigrationButton 
            subjectId={params.subjectId} 
            onMigrationComplete={() => {
              // Refresh the subject data after migration
              fetchSubject();
            }}
          />
        </div>

        {subject && (
          <div className="grid gap-8">
            <SubjectReviewDashboard 
              subject={subject} 
              onSync={() => {
                router.refresh();
              }} 
            />
            
            <ExamModeSettings
              subject={subject}
              onUpdate={() => {
                fetchSubject();
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
} 