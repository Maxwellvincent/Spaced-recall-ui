"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

type Subject = {
  study_style?: string;
  xp?: number;
};

export default function DashboardPage() {
  const [subjects, setSubjects] = useState<Record<string, Subject>>({});
  const username = "louis"; // hardcoded for now

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const docRef = doc(db, "users", username);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          const data = snapshot.data();
          setSubjects(data.subjects || {});
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
      {Object.keys(subjects).length === 0 ? (
        <p>No subjects found.</p>
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
