"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { getUserPathways, getLearningPathways } from '@/lib/firestoreHelpers';
import type { UserPathway } from '@/types/userPathway';
import type { LearningPathway } from '@/types/learningPathway';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function YourPathwaysPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [userPathways, setUserPathways] = useState<UserPathway[]>([]);
  const [allPathways, setAllPathways] = useState<LearningPathway[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPathways() {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const [userPathwaysRes, allPathwaysRes] = await Promise.all([
          getUserPathways(user.uid),
          getLearningPathways(),
        ]);
        setUserPathways(userPathwaysRes);
        setAllPathways(allPathwaysRes);
      } catch (err) {
        setError('Failed to load pathways. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    if (!authLoading) {
      fetchPathways();
    }
  }, [user, authLoading]);

  // Map userPathways to full pathway info
  const joinedPathways = userPathways
    .map(up => allPathways.find(p => p.id === up.pathwayId))
    .filter(Boolean) as LearningPathway[];

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500 border-4 border-blue-500 rounded-full border-t-transparent" />
          <p className="text-slate-200">Loading your pathways...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="bg-red-900/20 p-8 rounded-lg text-center max-w-md">
          <h2 className="text-2xl font-bold text-red-400 mb-4">Error Loading Pathways</h2>
          <p className="text-slate-300 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-200 mb-4">Sign In Required</h2>
          <p className="text-slate-400 mb-6">Please sign in to view your pathways.</p>
          <button
            onClick={() => router.push('/login')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Your Learning Pathways</h1>
      {joinedPathways.length === 0 ? (
        <div>
          No pathways joined yet. <br />
          <Link href="/dashboard/pathways/explore" className="text-blue-600 hover:underline">Explore pathways</Link> to get started!
        </div>
      ) : (
        <div className="grid gap-6">
          {joinedPathways.map(pathway => (
            <div key={pathway.id} className="rounded-lg border bg-white dark:bg-slate-900 p-6 shadow-md flex flex-col gap-2">
              <h2 className="text-xl font-semibold">{pathway.name}</h2>
              <p className="text-slate-600 dark:text-slate-300">{pathway.description}</p>
              <button
                className="self-end mt-2 px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => router.push(`/dashboard/pathways/${pathway.id}`)}
              >
                Continue
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 