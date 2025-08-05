'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getLearningPathways } from '@/lib/firestoreHelpers';
import { getSubjectsByPathway } from '@/lib/firestoreHelpers';
import type { LearningPathway } from '@/types/learningPathway';
import type { Subject } from '@/types/subject';

export default function PathwayDetailPage() {
  const params = useParams();
  const router = useRouter();
  const pathwayId = typeof params?.pathwayId === 'string' ? params.pathwayId : Array.isArray(params?.pathwayId) ? params.pathwayId[0] : '';
  const [pathway, setPathway] = useState<LearningPathway | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const pathways = await getLearningPathways();
        const found = pathways.find(p => p.id === pathwayId);
        if (!found) {
          setError('Pathway not found.');
          setLoading(false);
          return;
        }
        setPathway(found);
        // Fetch subjects for this pathway
        let fetchedSubjects: Subject[] = [];
        if (found.subjectIds && found.subjectIds.length > 0) {
          // Option 1: If you have getSubjectsByPathway, use it
          fetchedSubjects = await getSubjectsByPathway(found.id);
          // Option 2: If you need to fetch by IDs, do it here (not shown)
        }
        setSubjects(fetchedSubjects);
      } catch (err) {
        setError('Failed to load pathway details.');
      } finally {
        setLoading(false);
      }
    }
    if (pathwayId) fetchData();
  }, [pathwayId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500 border-4 border-blue-500 rounded-full border-t-transparent" />
          <p className="text-slate-200">Loading pathway details...</p>
        </div>
      </div>
    );
  }

  if (error || !pathway) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="bg-red-900/20 p-8 rounded-lg text-center max-w-md">
          <h2 className="text-2xl font-bold text-red-400 mb-4">Error</h2>
          <p className="text-slate-300 mb-6">{error || 'Pathway not found.'}</p>
          <Link href="/dashboard/pathways" className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded">Back to Pathways</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <Link href="/dashboard/pathways" className="text-blue-600 hover:underline mb-4 inline-block">&larr; Back to Pathways</Link>
      <h1 className="text-3xl font-bold mb-2">{pathway.name}</h1>
      <p className="text-lg text-slate-600 dark:text-slate-300 mb-6">{pathway.description}</p>
      {/* Optionally add pathway-level progress here if available */}
      <div className="mb-6">
        <div className="font-semibold mb-2">Included Subjects</div>
        {subjects.length === 0 ? (
          <p className="text-slate-400">No subjects found for this pathway.</p>
        ) : (
          <ul className="list-disc ml-6 text-slate-700 dark:text-slate-200">
            {subjects.map(subject => (
              <li key={subject.id} className="mb-2 flex items-center justify-between">
                <span>{subject.name}</span>
                <button
                  className="ml-4 px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                  onClick={() => router.push(`/dashboard/subjects/${subject.id}`)}
                >
                  Go to Subject
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* Add more pathway details, stats, or actions here if desired */}
    </div>
  );
} 