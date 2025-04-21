"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebaseConfig";
import { useAuthState } from "react-firebase-hooks/auth";
import { doc, getDoc } from "firebase/firestore";

export default function StudyLoggerPage() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [studyTime, setStudyTime] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setSubjects(Object.keys(userData.subjects || {}));
        }
      } catch (err: unknown) {
        console.error("Error fetching user data:", err);
        setError("Failed to load subjects");
      }
    };

    fetchUserData();
  }, [user]);

  if (loading) return <div>Loading...</div>;
  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">📚 Study Logger</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <select
        className="w-full p-2 border rounded mb-4"
        value={selectedSubject}
        onChange={(e) => setSelectedSubject(e.target.value)}
      >
        <option value="">Select a subject</option>
        {subjects.map((subject) => (
          <option key={subject} value={subject}>
            {subject}
          </option>
        ))}
      </select>
      <input
        type="number"
        className="w-full p-2 border rounded mb-4"
        value={studyTime}
        onChange={(e) => setStudyTime(Number(e.target.value))}
        placeholder="Study time in minutes"
        min="1"
      />
      <button
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
        onClick={() => {
          // Add your study logging logic here
        }}
      >
        Log Study Session
      </button>
    </div>
  );
} 