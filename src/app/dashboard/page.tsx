import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function DashboardPage() {
  const [username, setUsername] = useState("");
  const [subjects, setSubjects] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setUsername(data.username || user.email);
          setSubjects(data.subjects || {});
        }
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <p>Loading dashboard...</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">📊 Welcome, {username}!</h1>
      {/* render subject list, XP, progress, etc. */}
    </div>
  );
}
