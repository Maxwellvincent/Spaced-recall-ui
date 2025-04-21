// === src/app/onboarding/page.tsx ===
"use client";
import { useState, useEffect } from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebaseConfig";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const [username, setUsername] = useState("");
  const [theme, setTheme] = useState("dragonball");
  const [user, loading] = useAuthState(auth);
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      const checkIfUserExists = async () => {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          router.push("/dashboard");
        }
      };
      checkIfUserExists();
    }
  }, [user, loading]);

  const handleSubmit = async () => {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, {
      username,
      theme,
      xp: 0,
      subjects: {},
    });
    router.push("/dashboard");
  };

  return (
    <div className="p-8 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Finish Setting Up Your Profile</h2>
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Choose a username"
        className="w-full p-2 border rounded mb-4"
      />
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
        className="w-full p-2 border rounded mb-4"
      >
        <option value="dragonball">Dragon Ball</option>
        <option value="naruto">Naruto</option>
        <option value="neutral">Neutral</option>
      </select>
      <button
        onClick={handleSubmit}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Save & Continue
      </button>
    </div>
  );
}
