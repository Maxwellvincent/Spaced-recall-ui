"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebaseConfig";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleEmailLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      console.error("Login failed", err);
      setError("Invalid email or password");
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push("/dashboard");
    } catch (err: unknown) {
      console.error("Google login failed", err);
      setError("Google sign-in failed");
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 text-center">
      <h1 className="text-3xl font-bold mb-4">🔐 Log In</h1>

      <input
        type="email"
        placeholder="Email"
        className="w-full p-2 rounded border mb-2"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        className="w-full p-2 rounded border mb-4"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button
        onClick={handleEmailLogin}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-full mb-2"
      >
        Login with Email
      </button>

      <div className="text-sm text-gray-400 my-2">or</div>

      <button
        onClick={handleGoogleLogin}
        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded w-full"
      >
        Login with Google
      </button>

      {error && <p className="text-red-500 mt-4">{error}</p>}
    </div>
  );
} 