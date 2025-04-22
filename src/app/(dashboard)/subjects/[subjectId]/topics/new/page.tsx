"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import Link from "next/link";
import type { Subject, Topic } from "@/types/study";
import { useAuth } from "@/lib/auth";
import { Loader2, ArrowLeft } from "lucide-react";

interface PageProps {
  params: {
    subjectId: string;
  }
}

interface ExtendedSubject extends Subject {
  id: string;
  userId: string;
}

export default function NewTopicPage({ params }: PageProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [subject, setSubject] = useState<ExtendedSubject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [topicName, setTopicName] = useState("");
  const [topicDescription, setTopicDescription] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    const fetchSubject = async () => {
      if (!user) return;

      try {
        const subjectRef = doc(db, 'subjects', params.subjectId);
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

        setSubject(fullSubjectData);
      } catch (error) {
        console.error('Error fetching subject:', error);
        setError('Error loading subject');
      }
    };

    fetchSubject();
  }, [user, loading, params.subjectId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !user || isSubmitting) return;

    // Check if topic name already exists
    const topicExists = subject.topics.some(
      t => t.name.trim().toLowerCase() === topicName.trim().toLowerCase()
    );

    if (topicExists) {
      setError('A topic with this name already exists');
      return;
    }

    setIsSubmitting(true);
    try {
      const newTopic: Topic = {
        name: topicName.trim(),
        description: topicDescription.trim(),
        masteryLevel: 0,
        xp: 0,
        lastStudied: new Date().toISOString(),
        studySessions: [],
        concepts: []
      };

      // Add new topic to subject
      const updatedTopics = [...subject.topics, newTopic];

      // Update in Firestore
      const subjectRef = doc(db, 'subjects', subject.id);
      await updateDoc(subjectRef, {
        topics: updatedTopics
      });

      // Navigate back to subject page
      router.push(`/subjects/${subject.id}`);
    } catch (error) {
      console.error('Error creating topic:', error);
      setError('Failed to create topic. Please try again.');
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
            Unable to add a new topic. Please try again later.
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

  if (!subject) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-slate-200">Loading subject details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link 
            href={`/subjects/${subject.id}`}
            className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Subject</span>
          </Link>
          <h1 className="text-3xl font-bold mb-2">Add New Topic</h1>
          <p className="text-slate-400">Add a new topic to {subject.name}</p>
        </div>

        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="bg-slate-800 p-6 rounded-lg shadow-lg space-y-6">
            <div>
              <label htmlFor="topicName" className="block text-sm font-medium text-slate-300 mb-2">
                Topic Name
              </label>
              <input
                id="topicName"
                type="text"
                value={topicName}
                onChange={(e) => setTopicName(e.target.value)}
                className="w-full bg-slate-700 text-white rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Enter topic name"
                required
              />
            </div>

            <div>
              <label htmlFor="topicDescription" className="block text-sm font-medium text-slate-300 mb-2">
                Description
              </label>
              <textarea
                id="topicDescription"
                value={topicDescription}
                onChange={(e) => setTopicDescription(e.target.value)}
                className="w-full bg-slate-700 text-white rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none h-32"
                placeholder="Enter topic description"
              />
            </div>

            <div className="flex justify-end space-x-4">
              <Link
                href={`/subjects/${subject.id}`}
                className="px-4 py-2 text-sm font-medium text-white bg-slate-700 rounded-lg hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Creating..." : "Create Topic"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 