"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig"; // ✅ make sure db is exported properly

export default function DashboardPage() {
  const { data: session } = useSession();
  console.log("🔐 Logged in UID:", session?.user?.uid); // This might be undefined
  console.log("🧠 Session:", session);
  const router = useRouter();

  const [userData, setUserData] = useState<any>(null);
  const [subjects, setSubjects] = useState<Record<string, any>>({});

  const uid = session?.user?.uid;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }

    if (status === "authenticated" && uid) {
      const fetchUserData = async () => {
        try {
          const userRef = doc(db, "users", uid);
          const userSnap = await getDoc(userRef);

          console.log("UID:", uid); // ✅ Confirm UID
          console.log("Doc exists?", userSnap.exists());
          console.log("🔐 Logged in UID:", session?.user?.uid);
          const docRef = doc(db, "users", session?.user?.uid ?? "undefined");
          console.log("📄 Trying to access Firestore path: users/" + session?.user?.uid);


          if (userSnap.exists()) {
            const data = userSnap.data();
            console.log("🔥 User data fetched:", data);

            setUserData(data);
            setSubjects(data.subjects || {});
          } else {
            console.warn("No document found for this UID");
          }
        } catch (err) {
          console.error("Error loading user data:", err);
        }
      };

      fetchUserData();
    }
  }, [status, uid, router]);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">📊 Study Dashboard</h1>

      {session?.user?.email && (
        <p className="mb-4 text-sm text-gray-400">Welcome, {session.user.email}</p>
      )}

      {Object.keys(subjects).length === 0 ? (
        <p className="text-gray-500">No subjects found. Add some to get started!</p>
      ) : (
        <div className="space-y-4">
          {Object.entries(subjects).map(([subjectName, subjectData]) => (
            <div key={subjectName} className="p-4 border rounded bg-slate-800">
              <h2 className="text-xl font-semibold">{subjectName}</h2>
              <p className="text-sm text-gray-400">Style: {subjectData.study_style}</p>

              {subjectData.sections &&
                Object.entries(subjectData.sections as Record<string, any>).map(([secName, secData]) => (
                  <div key={secName} className="ml-4 mt-2">
                    <h3 className="text-md font-semibold text-green-400">{secName}</h3>
                    <p className="text-sm">Type: {secData.study_style}</p>
                  </div>
                ))}

              {subjectData.topics &&
                Object.entries(subjectData.topics).map(([topicName, topicData]) => (
                  <div key={topicName} className="ml-4 mt-2">
                    <p className="text-sm">📘 {topicName}</p>
                  </div>
                ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
