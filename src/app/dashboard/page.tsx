// === src/app/dashboard/page.tsx ===
"use client";
import { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebaseConfig";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";

export default function DashboardPage() {
  const [user, loading] = useAuthState(auth);
  const [userData, setUserData] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      const fetchData = async () => {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          router.push("/onboarding");
          return;
        }
        setUserData(snap.data());
      };
      fetchData();
    }
  }, [user, loading]);

  if (loading || !user) return <p>Loading...</p>;
  if (!userData) return <p>Loading your dashboard...</p>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-2">Welcome back, {userData.username}!</h1>
      <p className="mb-4">Theme: {userData.theme} | XP: {userData.xp}</p>
      <h2 className="text-xl font-semibold mb-2">Your Subjects:</h2>
      {userData.subjects && Object.keys(userData.subjects).length > 0 ? (
        <ul className="list-disc pl-6">
          {Object.entries(userData.subjects).map(([subject, data]) => {
            const sectionOrTopicData = data as any; // 👈 Add this line
            return (
              <li key={subject} className="mb-1">
                {subject} — {Object.keys(sectionOrTopicData.sections || sectionOrTopicData.topics || {}).length} items
              </li>
            );
          })}
        </ul>
      ) : (
        <p>You haven’t added any subjects yet.</p>
      )}
    </div>
  );
}
