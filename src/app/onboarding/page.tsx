"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebaseConfig";
import { useAuthState } from "react-firebase-hooks/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function OnboardingPage() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [theme, setTheme] = useState("dbz");

  useEffect(() => {
    const checkUser = async () => {
      if (!user) return;
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        router.push("/dashboard");
      }
    };
    checkUser();
  }, [user, router]);

  const handleSubmit = async () => {
    if (!user) return;
    if (!username.trim()) {
      alert("Please enter a valid username.");
      return;
    }
    const ref = doc(db, "users", user.uid);
    try {
      await setDoc(ref, {
        username,
        theme,
        xp: 0,
        subjects: {},
      });
      router.push("/dashboard");
    } catch (err) {
      console.error("❌ Error saving user profile:", err);
      alert("Something went wrong. Please try again.");
    }
  };

  if (loading) return <p className="text-center mt-6">Loading...</p>;

  return (
    <div className="max-w-lg mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">🎉 Welcome to Spaced Recall</h1>
      <p className="mb-2">Choose your username and theme to get started:</p>
      <input
        className="border p-2 w-full rounded mb-4"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="e.g. madballer9898"
      />
      <select
        className="border p-2 w-full rounded mb-4"
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
      >
        <option value="dbz">Dragon Ball Z</option>
        <option value="naruto">Naruto</option>
        <option value="points">Neutral (Points Only)</option>
      </select>
      <button
        onClick={handleSubmit}
        className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
      >
        ✅ Save and Continue
      </button>
    </div>
  );
}
