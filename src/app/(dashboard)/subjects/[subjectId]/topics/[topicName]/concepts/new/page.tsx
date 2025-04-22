"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import Link from "next/link";
import type { Subject, Topic, Concept } from "@/types/study";
import { useAuth } from "@/lib/auth";
import { Loader2, ArrowLeft } from "lucide-react";

interface PageProps {
  params: {
    subjectId: string;
    topicName: string;
  }
}

interface ExtendedSubject extends Subject {
  id: string;
  userId: string;
}

export default function NewConceptPage({ params }: PageProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [subject, setSubject] = useState<ExtendedSubject | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [conceptName, setConceptName] = useState("");
  const [conceptDescription, setConceptDescription] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    const fetchSubjectAndTopic = async () => {
      if (!user) return;

      try {
        const subjectId = params.subjectId;
        const topicName = decodeURIComponent(params.topicName).trim();
        
        const subjectRef = doc(db, 'subjects', subjectId);
        const subjectDoc = await getDoc(subjectRef);
        
        if (!subjectDoc.exists()) {
          setError('Subject not found');
          return;
        }

        const subjectData = subjectDoc.data() as ExtendedSubject;
        
        if (subjectData.userId !== user.uid) {
          setError('Access denied');
          return;
        }

        const fullSubjectData = {
          ...subjectData,
          id: subjectDoc.id,
          topics: subjectData.topics || [],
        };
        
        const foundTopic = fullSubjectData.topics.find(t => 
          t.name.trim().toLowerCase() === topicName.toLowerCase()
        );

        if (!foundTopic) {
          setError('Topic not found');
          return;
        }

        setSubject(fullSubjectData);
        setTopic(foundTopic);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Error loading topic');
      }
    };

    fetchSubjectAndTopic();
  }, [user, loading, params.subjectId, params.topicName, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !topic || !user || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const newConcept: Concept = {
        name: conceptName.trim(),
        description: conceptDescription.trim(),
        masteryLevel: 0,
        lastStudied: new Date().toISOString(),
      };

      // Update topic with new concept
      const updatedTopics = subject.topics.map(t => {
        if (t.name === topic.name) {
          return {
            ...t,
            concepts: [...(t.concepts || []), newConcept]
          };
        }
        return t;
      });

      // Update in Firestore
      const subjectRef = doc(db, 'subjects', subject.id);
      await updateDoc(subjectRef, {
        topics: updatedTopics
      });

      // Navigate back to topic page
      router.push(`/subjects/${subject.id}/topics/${encodeURIComponent(topic.name)}`);
    } catch (error) {
      console.error('Error creating concept:', error);
      setError('Failed to create concept. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-slate-200">Loading...</p>
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
            Unable to add a new concept. Please try again later.
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

  if (!subject || !topic) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-slate-200">Loading topic details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link 
            href={`/subjects/${subject.id}/topics/${encodeURIComponent(topic.name)}`}
            className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Topic</span>
          </Link>
          <h1 className="text-3xl font-bold mb-2">Add New Concept</h1>
          <p className="text-slate-400">Add a new concept to {topic.name}</p>
        </div>

        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="bg-slate-800 p-6 rounded-lg shadow-lg">
            <div className="mb-6">
              <label htmlFor="conceptName" className="block text-sm font-medium text-slate-300 mb-2">
                Concept Name
              </label>
              <input
                id="conceptName"
                type="text"
                value={conceptName}
                onChange={(e) => setConceptName(e.target.value)}
                className="w-full bg-slate-700 text-white rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Enter concept name"
                required
              />
            </div>

            <div className="mb-6">
              <label htmlFor="conceptDescription" className="block text-sm font-medium text-slate-300 mb-2">
                Description
              </label>
              <textarea
                id="conceptDescription"
                value={conceptDescription}
                onChange={(e) => setConceptDescription(e.target.value)}
                className="w-full h-32 bg-slate-700 text-white rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Describe the concept..."
                required
              />
            </div>

            <div className="flex justify-end gap-4">
              <Link
                href={`/subjects/${subject.id}/topics/${encodeURIComponent(topic.name)}`}
                className="px-4 py-2 text-slate-300 hover:text-white transition"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting || !conceptName.trim() || !conceptDescription.trim()}
                className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                ) : (
                  'Add Concept'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 