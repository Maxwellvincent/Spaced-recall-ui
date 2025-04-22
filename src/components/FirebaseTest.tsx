'use client';

import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function FirebaseTest() {
  const [status, setStatus] = useState<string>('Checking...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          setStatus('Connected to Firebase! User is signed in.');
        } else {
          setStatus('Connected to Firebase! No user signed in.');
        }
      });

      return () => unsubscribe();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setStatus('Failed to connect to Firebase');
    }
  }, []);

  return (
    <div className="p-4 border rounded-lg">
      <h2 className="text-lg font-bold mb-2">Firebase Connection Test</h2>
      <p className="mb-2">Status: {status}</p>
      {error && (
        <p className="text-red-500">Error: {error}</p>
      )}
    </div>
  );
} 