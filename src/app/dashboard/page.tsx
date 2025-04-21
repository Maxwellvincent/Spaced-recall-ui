"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import { app } from "@/lib/firebaseConfig";
import SubjectCard from "@/components/SubjectCard";
import CreateSubjectModal from "@/components/CreateSubjectModal";

export default function DashboardPage() {
  const router = useRouter();
  const auth = getAuth(app);
  const db = getFirestore(app);

  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        router.push("/login");
      } else {
        setUser(firebaseUser);
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists()) {
          setUserData(userSnap.data());
        }
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [auth, db, router]);

  if (loading) return <div className="text-center mt-10">Loading...</div>;
  if (!userData)
    return <div className="text-center mt-10">No subjects found for {user?.displayName || "User"}.</div>;

  const subjects = userData.subjects || {};

  return (
    <div className="max-w-4xl mx-auto px-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold mb-4">📊 Dashboard</h1>
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
          onClick={() => setShowCreateModal(true)}
        >
          ➕ New Subject
        </button>
      </div>

      {Object.entries(subjects).map(([subjectName, subjectData]) => (
        <SubjectCard
          key={subjectName}
          name={subjectName}
          data={subjectData}
        />
      ))}

      {showCreateModal && (
        <CreateSubjectModal
          onClose={() => setShowCreateModal(false)}
          userId={user.uid}
        />
      )}
    </div>
  );
}
