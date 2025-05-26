import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { getLearningPathways, getUserPathways, joinPathway } from '@/lib/firestoreHelpers';

export default function DashboardPathways() {
  const { user, loading: authLoading } = useAuth();
  const [allPathways, setAllPathways] = useState([]);
  const [userPathways, setUserPathways] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      setLoading(true);
      const [all, joined] = await Promise.all([
        getLearningPathways(),
        getUserPathways(user.uid)
      ]);
      setAllPathways(all);
      setUserPathways(joined.map(j => j.pathwayId));
      setLoading(false);
    }
    if (!authLoading) fetchData();
  }, [user, authLoading]);

  const handleJoin = async (e, pathwayId) => {
    e.stopPropagation(); // Prevent card click
    if (!user) return;
    await joinPathway(user.uid, pathwayId);
    setUserPathways(prev => [...prev, pathwayId]);
  };

  if (authLoading || loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {allPathways.map(pathway => {
          const joined = userPathways.includes(pathway.id);
          return (
            <Link
              key={pathway.id}
              href={`/dashboard/pathways/${pathway.id}`}
              className={`group block rounded-lg border bg-white dark:bg-slate-900 p-4 shadow-md transition hover:shadow-lg hover:border-blue-500 focus:ring-2 focus:ring-blue-400 cursor-pointer relative min-h-[120px]`}
            >
              <div className="flex flex-col gap-1 h-full">
                <h2 className="text-lg font-semibold group-hover:text-blue-600 mb-1">{pathway.name}</h2>
                <p className="text-slate-600 dark:text-slate-300 text-sm line-clamp-3 flex-1">{pathway.description}</p>
                {joined ? (
                  <button
                    className="absolute top-3 right-3 bg-green-600 text-white px-3 py-1 rounded text-xs cursor-default opacity-90"
                    disabled
                  >
                    Joined
                  </button>
                ) : (
                  <button
                    className="absolute top-3 right-3 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs"
                    onClick={e => handleJoin(e, pathway.id)}
                  >
                    Join
                  </button>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
} 