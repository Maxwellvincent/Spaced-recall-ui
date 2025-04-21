"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [subjectName, setSubjectName] = useState("");
  const [studyStyle, setStudyStyle] = useState("concept_mastery");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        router.push("/");
      } else {
        setUser(firebaseUser as any); // Type assertion to fix type error
        const ref = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();
          setUserData(data);
          if (!data.username) {
            router.push("/onboarding");
          }
        } else {
          await setDoc(ref, {
            username: "",
            xp: 0,
            subjects: {},
          });
          router.push("/onboarding");
        }
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleCreateSubject = async () => {
    if (!user || !subjectName.trim()) return;
    const ref = doc(db, "users", (user as any).uid);
    const current = (await getDoc(ref)).data() || {};
    const updated = {
      ...(current.subjects || {}),
      [subjectName]: {
        study_style: studyStyle,
        created_at: new Date().toISOString(),
      },
    };
    await setDoc(ref, { subjects: updated }, { merge: true });
    setSubjectName("");
    setShowCreate(false);
    const refreshed = await getDoc(ref);
    setUserData(refreshed.data());
  };

  if (loading) return <div className="text-center mt-10">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">📊 Dashboard</h1>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button>➕ New Subject</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Subject</DialogTitle>
            </DialogHeader>
            <input
              className="w-full border rounded p-2 my-2"
              placeholder="Enter subject name"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
            />
            <select
              className="w-full border rounded p-2 my-2"
              value={studyStyle}
              onChange={(e) => setStudyStyle(e.target.value)}
            >
              <option value="concept_mastery">Concept Mastery</option>
              <option value="exam_mode">Exam Mode</option>
              <option value="reading">Reading</option>
              <option value="book_study">Book Study</option>
            </select>
            <Button onClick={handleCreateSubject}>Create</Button>
          </DialogContent>
        </Dialog>
      </div>

      {userData && Object.keys(userData.subjects || {}).length > 0 ? (
        <ul className="space-y-3">
          {Object.entries(userData.subjects).map(([name, data]: [string, any]) => (
            <li key={name} className="bg-slate-800 p-4 rounded shadow">
              <h2 className="text-lg font-semibold">{name}</h2>
              <p className="text-sm text-gray-400">Study Style: {data.study_style}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p>No subjects found. Start by creating one from the navbar or onboarding page.</p>
      )}
    </div>
  );
}
