"use client";

import { useState } from 'react';
import { useLoginStreak } from '@/hooks/useLoginStreak';
import { useAuth } from '@/lib/auth';

export function StreakDebug() {
  const { streak, highestStreak, loading, error, refreshStreak, forceUpdate } = useLoginStreak();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [manualStreak, setManualStreak] = useState('1');
  const [manualHighestStreak, setManualHighestStreak] = useState('1');
  const [updateStatus, setUpdateStatus] = useState('');
  
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const handleManualUpdate = async () => {
    if (!user) return;
    
    try {
      setUpdateStatus('Updating...');
      
      // Parse input values
      const newStreak = parseInt(manualStreak, 10);
      const newHighestStreak = parseInt(manualHighestStreak, 10);
      
      if (isNaN(newStreak) || isNaN(newHighestStreak)) {
        setUpdateStatus('Error: Invalid numbers');
        return;
      }
      
      // Use the forceUpdate function from context
      const success = await forceUpdate(newStreak, newHighestStreak);
      
      if (success) {
        setUpdateStatus('Update successful');
      } else {
        setUpdateStatus('Update failed. Check console for details.');
      }
    } catch (err) {
      console.error('StreakDebug: Manual update error:', err);
      setUpdateStatus(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };
  
  return (
    <div className="fixed bottom-4 left-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-slate-800 text-white px-3 py-1 rounded-md text-xs"
      >
        {isOpen ? 'Hide' : 'Show'} Streak Debug
      </button>
      
      {isOpen && (
        <div className="mt-2 p-4 bg-slate-900 border border-slate-700 rounded-md text-white text-xs w-72 shadow-lg">
          <h3 className="font-bold mb-2">Streak Debug Info</h3>
          <div className="space-y-1">
            <div>User ID: {user?.uid?.substring(0, 8)}...</div>
            <div>Current Streak: {streak}</div>
            <div>Highest Streak: {highestStreak}</div>
            <div>Loading: {loading ? 'Yes' : 'No'}</div>
            <div>Error: {error ? error.message : 'None'}</div>
          </div>
          
          <div className="mt-4 border-t border-slate-700 pt-3">
            <h4 className="font-bold mb-2">Manual Update</h4>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="block mb-1">Current Streak</label>
                <input
                  type="number"
                  value={manualStreak}
                  onChange={(e) => setManualStreak(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-1 text-white"
                  min="0"
                />
              </div>
              <div>
                <label className="block mb-1">Highest Streak</label>
                <input
                  type="number"
                  value={manualHighestStreak}
                  onChange={(e) => setManualHighestStreak(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-1 text-white"
                  min="0"
                />
              </div>
            </div>
            <button
              onClick={handleManualUpdate}
              className="w-full bg-blue-600 text-white px-2 py-1 rounded-md text-xs"
            >
              Set Values
            </button>
            {updateStatus && (
              <div className="mt-2 text-xs">
                Status: {updateStatus}
              </div>
            )}
          </div>
          
          <div className="mt-3 flex gap-2">
            <button
              onClick={refreshStreak}
              className="bg-blue-600 text-white px-2 py-1 rounded-md text-xs"
            >
              Refresh Streak
            </button>
            <button
              onClick={async () => {
                if (!user) return;
                try {
                  await forceUpdate(streak + 1, Math.max(highestStreak, streak + 1));
                } catch (err) {
                  console.error(err);
                }
              }}
              className="bg-green-600 text-white px-2 py-1 rounded-md text-xs"
            >
              Increment
            </button>
            <button
              onClick={async () => {
                if (!user) return;
                try {
                  await forceUpdate(Math.max(0, streak - 1), highestStreak);
                } catch (err) {
                  console.error(err);
                }
              }}
              className="bg-red-600 text-white px-2 py-1 rounded-md text-xs"
            >
              Decrement
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 