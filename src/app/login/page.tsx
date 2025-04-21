"use client";

import { auth } from "@/lib/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      const user = result.user;
      console.log("✅ Logged in as:", user.displayName || user.email);

      router.push("/dashboard");
    } catch (error: any) {
      console.error("❌ Login failed:", error.message);
      alert("Login error: " + error.message);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-6 rounded shadow">
        <h1 className="text-2xl font-bold mb-4">🔐 Login</h1>
        <button
          onClick={handleGoogleLogin}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Sign in with Google
        </button>
      </div>
    </main>
  );
}
