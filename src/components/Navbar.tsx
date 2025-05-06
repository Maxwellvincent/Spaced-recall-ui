"use client";

import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import { Home, BookOpen, Clock, Gift, LogOut, LogIn, User, Brain } from "lucide-react";

export default function Navbar() {
  const router = useRouter();
  const { user } = useAuth();

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  return (
    <nav className="flex justify-between items-center px-6 py-4 bg-slate-800/50 backdrop-blur-sm text-white shadow-lg sticky top-0 z-50">
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="text-xl font-bold hover:text-blue-300 transition">
          Spaced Recall
        </Link>
        {user && (
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-slate-200 hover:text-blue-300 transition"
            >
              <Home className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>
            <Link
              href="/subjects"
              className="flex items-center gap-2 text-slate-200 hover:text-blue-300 transition"
            >
              <BookOpen className="h-4 w-4" />
              <span>Subjects</span>
            </Link>
            <Link
              href="/study-logger"
              className="flex items-center gap-2 text-slate-200 hover:text-blue-300 transition"
            >
              <Clock className="h-4 w-4" />
              <span>Study Logger</span>
            </Link>
            <Link
              href="/spaced-recall"
              className="flex items-center gap-2 text-slate-200 hover:text-blue-300 transition"
            >
              <Brain className="h-4 w-4" />
              <span>Spaced Recall</span>
            </Link>
            <Link
              href="/rewards"
              className="flex items-center gap-2 text-slate-200 hover:text-blue-300 transition"
            >
              <Gift className="h-4 w-4" />
              <span>Rewards</span>
            </Link>
          </div>
        )}
      </div>
      <div className="flex items-center gap-4">
        {user && (
          <Link
            href="/profile"
            className="flex items-center gap-2 text-slate-200 hover:text-blue-300 transition"
          >
            <User className="h-4 w-4" />
            <span>Profile</span>
          </Link>
        )}
        {user ? (
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-600/80 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        ) : (
          <button
            onClick={() => router.push("/login")}
            className="flex items-center gap-2 bg-blue-600/80 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
          >
            <LogIn className="h-4 w-4" />
            <span>Login</span>
          </button>
        )}
      </div>
    </nav>
  );
}
