"use client";

import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebaseConfig";

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState(() => auth.currentUser);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(setUser);
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  return (
    <nav className="flex justify-between items-center px-6 py-4 bg-slate-900 text-white shadow-lg sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold">Spaced Recall</h1>
        {user && (
          <div className="flex space-x-4">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-white hover:text-blue-300"
            >
              Dashboard
            </button>
            <button
              onClick={() => router.push("/subjects")}
              className="text-white hover:text-blue-300"
            >
              Subjects
            </button>
            <button
              onClick={() => router.push("/study-logger")}
              className="text-white hover:text-blue-300"
            >
              Study Logger
            </button>
            <button
              onClick={() => router.push("/rewards")}
              className="text-white hover:text-blue-300"
            >
              Rewards
            </button>
          </div>
        )}
      </div>
      {user ? (
        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded transition-colors"
        >
          🚪 Logout
        </button>
      ) : (
        <button
          onClick={() => router.push("/login")}
          className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded transition-colors"
        >
          🔐 Login
        </button>
      )}
    </nav>
  );
}
