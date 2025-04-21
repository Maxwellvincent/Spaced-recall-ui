"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

const effortTiers = [
  { label: "📖 Reading + Notes", xp: 5 },
  { label: "🧠 Note Consolidation / Mind Mapping", xp: 10 },
  { label: "📝 Quizzes + Review", xp: 15 },
  { label: "👨‍🏫 Teaching the Concept", xp: 20 },
  { label: "💥 Practice Exam", xp: 25 },
];

export default function StudyLoggerPage() {
  const router = useRouter();
  const [uid, setUid] = useState("");
  const [subjects, setSubjects] = useState<any>({});
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [effort, setEffort] = useState(effortTiers[0].label);
  const [duration, setDuration] = useState(30); // minutes
  const [logNote, setLogNote] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUid(user.uid);
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          setSubjects(snap.data().subjects || {});
        }
      } else {
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async () => {
    if (!uid || !selectedSubject || !selectedTopic) return;

    const xp = effortTiers.find((e) => e.label === effort)?.xp || 0;
    const logEntry = {
      effort,
      duration,
      note: logNote,
      xp,
      timestamp: serverTimestamp(),
    };

    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

if (!userSnap.exists()) {
  alert("❌ User data not found in Firestore.");
  return;
}

const userData = userSnap.data();
if (!userData?.subjects?.[selectedSubject]?.topics?.[selectedTopic]) {
  alert("❌ Selected topic not found.");
  return;
}

const subject = userData.subjects[selectedSubject];
    if (!subject.topics[selectedTopic].logs) {
      subject.topics[selectedTopic].logs = [];
    }

    subject.topics[selectedTopic].logs.push(logEntry);
    subject.topics[selectedTopic].xp =
      (subject.topics[selectedTopic].xp || 0) + xp;

    await updateDoc(userRef, {
      subjects: userData.subjects,
    });

    alert(`✅ Log saved! You earned ${xp} XP.`);
    router.push("/dashboard");
  };

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">📝 Log Study Session</h1>

      <div className="space-y-4">
        <div>
          <label className="block mb-1">Subject</label>
          <select
            value={selectedSubject}
            onChange={(e) => {
              setSelectedSubject(e.target.value);
              setSelectedTopic("");
            }}
            className="p-2 border w-full"
          >
            <option value="">Select subject</option>
            {Object.keys(subjects).map((subj) => (
              <option key={subj} value={subj}>
                {subj}
              </option>
            ))}
          </select>
        </div>

        {selectedSubject && (
          <div>
            <label className="block mb-1">Topic</label>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="p-2 border w-full"
            >
              <option value="">Select topic</option>
              {Object.keys(subjects[selectedSubject]?.topics || {}).map(
                (topic) => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                )
              )}
            </select>
          </div>
        )}

        <div>
          <label className="block mb-1">Effort Type</label>
          <select
            value={effort}
            onChange={(e) => setEffort(e.target.value)}
            className="p-2 border w-full"
          >
            {effortTiers.map((e) => (
              <option key={e.label}>{e.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1">Duration (minutes)</label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="p-2 border w-full"
          />
        </div>

        <div>
          <label className="block mb-1">Notes</label>
          <textarea
            value={logNote}
            onChange={(e) => setLogNote(e.target.value)}
            className="p-2 border w-full"
          />
        </div>

        <button
          onClick={handleSubmit}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Save Log
        </button>
      </div>
    </main>
  );
}
