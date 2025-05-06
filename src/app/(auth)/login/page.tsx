"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup,
  onAuthStateChanged
} from "firebase/auth";

// Initialize Firebase directly in this component
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push("/dashboard");
      }
      setIsInitialized(true);
    });

    return () => unsubscribe();
  }, [router]);

  const handleEmailLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLoading) return;
    
    try {
      setIsLoading(true);
      setError("");
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Login failed", err);
      setError(err.message || "Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (isLoading) return;
    
    try {
      setIsLoading(true);
      setError("");
      
      // Create a fresh provider instance each time
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      // Use signInWithPopup with the local auth instance
      const result = await signInWithPopup(auth, provider);
      console.log("Google sign-in successful", result.user.displayName);
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Google login failed", err);
      setError(err.message || "Google sign-in failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

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