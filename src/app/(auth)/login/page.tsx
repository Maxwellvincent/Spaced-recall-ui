"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getFirebaseAuth } from "@/lib/firebase";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLoading) return;
    
    try {
      setIsLoading(true);
      setError("");
      const auth = getFirebaseAuth();
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      console.error("Login failed", err);
      setError("Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (isLoading) return;
    
    try {
      setIsLoading(true);
      setError("");
      const auth = getFirebaseAuth();
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      await signInWithPopup(auth, provider);
      router.push("/dashboard");
    } catch (err: unknown) {
      console.error("Google login failed", err);
      setError("Google sign-in failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 text-center">
      <h1 className="text-3xl font-bold mb-4">🔐 Log In</h1>

      <form onSubmit={handleEmailLogin} className="mb-4">
        <input
          type="email"
          id="email"
          name="email"
          placeholder="Email"
          className="w-full p-2 rounded border mb-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          required
        />
        <input
          type="password"
          id="password"
          name="password"
          placeholder="Password"
          className="w-full p-2 rounded border mb-4"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          required
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-full"
          disabled={isLoading}
        >
          {isLoading ? "Logging in..." : "Login with Email"}
        </button>
      </form>

      <div className="text-sm text-gray-400 my-2">or</div>

      <button
        onClick={handleGoogleLogin}
        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded w-full"
        disabled={isLoading}
      >
        {isLoading ? "Logging in..." : "Login with Google"}
      </button>

      {error && <p className="text-red-500 mt-4">{error}</p>}
    </div>
  );
} 