"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";

type Subject = {
  study_style?: string;
  xp?: number;
};

export default function DashboardPage() {
  const [subjects, setSubjects] = useState<Record<string, Subject>>({});
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  // Listen to Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const uid = firebaseUser.displayName || firebaseUser.uid;
        setUsername(uid); // use displayName as Firestore doc ID if available
      } else {
        setUser(null);
        setUsername(null);
      }
    });

    return () => unsubscribe(); // clean up listener
  }, []);

  // Fetch subjects from Firestore
  useEffect(() => {
    const fetchSubjects = async () => {
      if (!username) return;

      try {
        const docRef = doc(db, "users", username);
        const snapshot = await getDoc(docRef);

        if (snapshot.exists()) {
          const data = snapshot.data();
          console.log("✅ Loaded subjects:", data.subjects);
          setSubjects(data.subjects || {});
        } else {
          console.log("❌ No document found for user:", username);
        }
      } catch (error) {
        console.error("Error loading subjects:", error);
      }
    };

    fetchSubjects();
  }, [username]);

  return (
    <main className="min-h-screen p-6 bg-gray-100">
      <h1 className="text-3xl font-bold mb-6">📊 Dashboard</h1>

      {!user ? (
        <p className="text-gray-600">🔐 Please log in to view your dashboard.</p>
      ) : Object.keys(subjects).length === 0 ? (
        <p>No subjects found for <strong>{username}</strong>.</p>
      ) : (
        <div className="grid gap-4">
          {Object.entries(subjects).map(([key, subject]) => (
            <div key={key} className="bg-white p-4 rounded shadow">
              <h2 className="text-xl font-semibold">{key}</h2>
              <p className="text-sm text-gray-700">
                Study Style: {subject.study_style || "N/A"}
              </p>
              {subject.xp !== undefined && (
                <p className="text-sm mt-1">XP: {subject.xp}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
