"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";

export default function LoginPage() {
  const router = useRouter();

  const createOrMigrateUser = async (user: any) => {
    const uid = user.uid;
    const username = user.displayName || user.email?.split("@")[0];
    const newDocRef = doc(db, "users", uid);
    const oldDocRef = doc(db, "users", username);

    const [newSnap, oldSnap] = await Promise.all([
      getDoc(newDocRef),
      getDoc(oldDocRef),
    ]);

    if (newSnap.exists()) return; // Already exists, skip

    if (oldSnap.exists()) {
      const legacyData = oldSnap.data();
      await setDoc(newDocRef, { ...legacyData, username }, { merge: true });
      await deleteDoc(oldDocRef);
      console.log(`✅ Migrated legacy doc: ${username} → ${uid}`);
    } else {
      await setDoc(newDocRef, {
        username,
        email: user.email,
        subjects: {},
      });
      console.log(`✅ Created new doc for: ${uid}`);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      await createOrMigrateUser(user);
      router.push("/dashboard");
    } catch (error) {
      alert("Login failed. See console.");
      console.error(error);
    }
  };

  return (
    <main className="flex items-center justify-center h-screen bg-gray-100">
      <div className="bg-white shadow p-6 rounded-md">
        <h1 className="text-2xl font-bold mb-4">🔐 Sign In</h1>
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
          onClick={handleGoogleLogin}
        >
          Sign in with Google
        </button>
      </div>
    </main>
  );
}
