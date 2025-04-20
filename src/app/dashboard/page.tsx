"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

type SubjectData = {
  study_style?: string;
  xp?: number;
  sections?: Record<string, any>;
  topics?: Record<string, any>;
};

export default function Dashboard() {
  const [subjects, setSubjects] = useState<Record<string, SubjectData>>({});
  const username = "louis"; // mock user

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", username));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setSubjects(data.subjects || {});
        }
      } catch (error) {
        console.error("Failed to load subjects:", error);
      }
    };

    fetchSubjects();
  }, [username]);

  return (
    <main className="min-h-screen px-6 py-10 bg-gray-100">
      <h1 className="text-4xl font-bold mb-6">📊 Your Dashboard</h1>

      {Object.keys(subjects).length === 0 ? (
        <p>No subjects found. Create one to get started!</p>
      ) : (
        <div className="grid gap-4">
          {Object.entries(subjects).map(([name, subject]) => (
            <div key={name} className="bg-white p-4 rounded shadow">
              <h2 className="text-xl font-semibold">{name}</h2>
              <p className="text-sm text-gray-600">
                Study Style: {subject.study_style}
              </p>
              {subject.xp && (
                <p className="text-sm mt-1">XP: {subject.xp}</p>
              )}
              <button
                onClick={() => console.log("TODO: View subject")}
                className="mt-3 inline-block px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                View Subject
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
