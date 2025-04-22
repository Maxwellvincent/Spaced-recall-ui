"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import Link from "next/link";
import type { Subject, Topic } from "@/types/study";

interface SubjectNode {
  id: string;
  label: string;
  level: number;
  progress: number;
  relatedSubjects: string[];
  concepts: Array<{
    name: string;
    masteryLevel: number;
    lastStudied: string;
  }>;
}

export default function StudyOverviewPage() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const [subjectNodes, setSubjectNodes] = useState<SubjectNode[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchSubjects = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const subjectsQuery = query(collection(db, 'subjects'), where('userId', '==', user.uid));
        const subjectsSnapshot = await getDocs(subjectsQuery);
        const subjectsData = subjectsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Subject[];

        // Transform subjects into nodes for visualization
        const nodes: SubjectNode[] = subjectsData.map(subject => {
          // Get all concepts from all topics
          const allConcepts = subject.topics?.flatMap(topic => 
            (topic.concepts || []).map(concept => ({
              name: concept.name,
              masteryLevel: concept.masteryLevel || 0,
              lastStudied: concept.lastStudied
            }))
          ) || [];

          // Find related subjects based on similar concepts
          const relatedSubjects = subjectsData
            .filter(otherSubject => {
              if (otherSubject.id === subject.id) return false;
              
              // Check for concept similarity
              const otherConcepts = new Set(
                otherSubject.topics?.flatMap(topic => 
                  (topic.concepts || []).map(c => c.name.toLowerCase())
                ) || []
              );
              
              const commonConcepts = allConcepts.filter(concept => 
                otherConcepts.has(concept.name.toLowerCase())
              );

              return commonConcepts.length > 0;
            })
            .map(s => s.id);

          return {
            id: subject.id,
            label: subject.name,
            level: subject.level || 1,
            progress: subject.masteryPath?.progress || 0,
            relatedSubjects,
            concepts: allConcepts
          };
        });

        setSubjectNodes(nodes);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching subjects:', error);
        setError('Failed to load subjects. Please try again later.');
        setIsLoading(false);
      }
    };

    fetchSubjects();
  }, [user]);

  const getSubjectDetails = (subjectId: string) => {
    if (!user) return null;
    
    const subjectNode = subjectNodes.find(node => node.id === subjectId);
    if (!subjectNode) return null;

    return {
      subject: subjectNode,
      stats: {
        totalConcepts: subjectNode.concepts.length,
        completedConcepts: subjectNode.concepts.filter(c => (c.masteryLevel || 0) >= 80).length,
      }
    };
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-red-500">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Study Overview</h1>
        <Link 
          href="/dashboard"
          className="text-blue-400 hover:text-blue-300 transition"
        >
          Back to Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Subjects List */}
        <div className="lg:col-span-1">
          <div className="bg-slate-900 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-white">Subjects</h2>
            <div className="space-y-3">
              {subjectNodes.map(node => (
                <button
                  key={node.id}
                  onClick={() => setSelectedSubject(node.id)}
                  className={`w-full text-left p-4 rounded-lg transition ${
                    selectedSubject === node.id 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{node.label}</span>
                    <span className="text-sm">Level {node.level}</span>
                  </div>
                  <div className="mt-2">
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div 
                        className="bg-blue-400 rounded-full h-2" 
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

        {/* Subject Details */}
        <div className="lg:col-span-2">
          {selectedSubject ? (
            <div className="space-y-6">
              {/* Subject Overview */}
              <div className="bg-slate-900 p-6 rounded-lg shadow-lg">
                {(() => {
                  const details = getSubjectDetails(selectedSubject);
                  if (!details) return <p className="text-slate-300">Subject not found</p>;

                  const { subject, stats } = details;
                  return (
                    <>
                      <h2 className="text-2xl font-bold text-white mb-4">{subject.label}</h2>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-slate-800 p-4 rounded-lg">
                          <div className="text-sm text-slate-400">Topics</div>
                          <div className="text-xl text-white">{stats.completedTopics}/{stats.totalTopics}</div>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-lg">
                          <div className="text-sm text-slate-400">Concepts</div>
                          <div className="text-xl text-white">{stats.completedConcepts}/{stats.totalConcepts}</div>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-lg">
                          <div className="text-sm text-slate-400">Level</div>
                          <div className="text-xl text-white">{subject.level}</div>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-lg">
                          <div className="text-sm text-slate-400">XP</div>
                          <div className="text-xl text-white">{subject.xp}</div>
                        </div>
                      </div>

                      {/* Topics and Concepts */}
                      <div className="space-y-4">
                        {subject.topics.map(topic => (
                          <div key={topic.name} className="bg-slate-800 p-4 rounded-lg">
                            <div className="flex justify-between items-center mb-3">
                              <h3 className="text-lg font-medium text-white">{topic.name}</h3>
                              <span className="text-sm text-slate-300">
                                Mastery: {topic.masteryLevel || 0}%
                              </span>
                            </div>
                            {topic.concepts && topic.concepts.length > 0 && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {topic.concepts.map(concept => (
                                  <Link
                                    key={concept.name}
                                    href={`/subjects/${encodeURIComponent(subject.id)}?concept=${encodeURIComponent(concept.name)}`}
                                    className="block bg-slate-700 p-3 rounded hover:bg-slate-600 transition"
                                  >
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm text-white">{concept.name}</span>
                                      <span className={`text-xs px-2 py-1 rounded ${
                                        (concept.masteryLevel || 0) >= 80 ? 'bg-green-900 text-green-200' :
                                        (concept.masteryLevel || 0) >= 50 ? 'bg-yellow-900 text-yellow-200' :
                                        'bg-red-900 text-red-200'
                                      }`}>
                                        {concept.masteryLevel || 0}%
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">
                                      Last studied: {new Date(concept.lastStudied).toLocaleDateString()}
                                    </p>
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Related Subjects */}
              <div className="bg-slate-900 p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold mb-4 text-white">Related Subjects</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {subjectNodes
                    .find(node => node.id === selectedSubject)
                    ?.relatedSubjects.map(relatedId => {
                      const relatedNode = subjectNodes.find(node => node.id === relatedId);
                      if (!relatedNode) return null;

                      return (
                        <button
                          key={relatedId}
                          onClick={() => setSelectedSubject(relatedId)}
                          className="bg-slate-800 p-4 rounded-lg hover:bg-slate-700 transition text-left"
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-white">{relatedNode.label}</span>
                            <span className="text-sm text-slate-300">Level {relatedNode.level}</span>
                          </div>
                          <div className="w-full bg-slate-700 rounded-full h-2">
                            <div 
                              className="bg-blue-400 rounded-full h-2" 
                              style={{ width: `${relatedNode.progress}%` }}
                            />
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 p-6 rounded-lg shadow-lg">
              <p className="text-slate-300">Select a subject to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 