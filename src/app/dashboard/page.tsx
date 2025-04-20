// src/app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc } from "firebase/firestore";

export default function Dashboard() {
  const [subjects, setSubjects] = useState<any>({});
  const [username, setUsername] = useState("louis"); // 👈 hardcoded for now

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
  }, []);

  return (
    <main className="min-h-screen px-6 py-10 bg-gray-100">
      <h1 className="text-4xl font-bold mb-6">📊 Your Dashboard</h1>

      {Object.keys(subjects).length === 0 ? (
        <p>No subjects found. Create one to get started!</p>
      ) : (
        <div className="grid gap-4">
          {Object.entries(subjects).map(([name, subject]: any) => (
            <div key={name} className="bg-white p-4 rounded shadow">
              <h2 className="text-xl font-semibold">{name}</h2>
              <p className="text-sm text-gray-600">
                Study Style: {subject.study_style}
              </p>
              {subject.xp && (
                <p className="text-sm mt-1">XP: {subject.xp}</p>
              )}
              <button
                onClick={() => console.log("TODO: link to subject view")}
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
