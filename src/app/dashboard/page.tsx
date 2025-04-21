'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebaseConfig';
import { doc, onSnapshot, DocumentData } from 'firebase/firestore';

export default function DashboardPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<DocumentData | null>(null);
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) {
      router.push('/login');
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'users', uid), (docSnap: DocumentData) => {
      if (docSnap.exists()) {
        setUserData(docSnap.data());
      }
    });

    return () => unsubscribe();
  }, [uid, router]);

  if (!userData) {
    return <p className="p-4">🔐 Loading your data...</p>;
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Welcome, {userData.username}!</h1>
      {userData.subjects ? (
        <div>
          <h2 className="text-xl mb-2">📚 Your Subjects:</h2>
          <ul className="list-disc ml-6">
            {Object.entries(userData.subjects).map(([key, value]: [string, DocumentData]) => (
              <li key={key}>
                <strong>{key}</strong> — {value.study_style ?? 'No style set'}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p>🙈 You haven't added any subjects yet.</p>
      )}
    </div>
  );
}
