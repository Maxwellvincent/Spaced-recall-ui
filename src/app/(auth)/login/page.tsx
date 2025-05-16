"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup,
  onAuthStateChanged,
  getAuth
} from "firebase/auth";
import { initializeApp, getApps } from "firebase/app";
import { auth, isFirebaseInitialized, initializeFirebase } from "@/lib/firebase";
import Image from "next/image";
import Link from "next/link";

// For debugging purposes only - create a separate Firebase instance
// to test if the environment variables are working correctly
const testFirebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

console.log("Login page - API Key from env:", process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
console.log("Login page - Config:", {
  apiKey: testFirebaseConfig.apiKey ? `${testFirebaseConfig.apiKey.substring(0, 5)}...` : "Not set",
  authDomain: testFirebaseConfig.authDomain,
  projectId: testFirebaseConfig.projectId
});

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [firebaseReady, setFirebaseReady] = useState(false);

  useEffect(() => {
    // Check if Firebase is initialized
    const checkFirebase = () => {
      if (isFirebaseInitialized()) {
        setFirebaseReady(true);
        console.log("Firebase is ready");
      } else {
        console.log("Firebase not ready yet, retrying...");
        // Try to initialize Firebase manually
        const initialized = initializeFirebase();
        if (initialized) {
          setFirebaseReady(true);
          console.log("Firebase manually initialized successfully");
        } else {
          setTimeout(checkFirebase, 500);
        }
      }
    };

    checkFirebase();

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
      
      // Make sure Firebase is initialized
      if (!isFirebaseInitialized()) {
        const initialized = initializeFirebase();
        if (!initialized) {
          throw new Error("Could not initialize Firebase. Please check your internet connection and try again.");
        }
      }
      
      // Use the global auth instance for actual login
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
      
      console.log("Starting Google sign-in");
      
      // Make sure Firebase is initialized
      if (!isFirebaseInitialized()) {
        const initialized = initializeFirebase();
        if (!initialized) {
          throw new Error("Could not initialize Firebase. Please check your internet connection and try again.");
        }
      }
      
      // Create the provider here, after Firebase is initialized
      const provider = new GoogleAuthProvider();
      // Add custom parameters for proper authentication
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      // Add scopes
      provider.addScope('email');
      provider.addScope('profile');
      
      // Make sure we're using the correct auth instance
      const currentAuth = getAuth();
      console.log("Using auth instance:", currentAuth ? "Valid" : "Invalid");
      
      try {
        // Use signInWithPopup with the current auth instance
        const result = await signInWithPopup(currentAuth, provider);
        console.log("Google sign-in successful", result.user.displayName);
        router.push("/dashboard");
      } catch (authError: any) {
        console.error("Google sign-in error:", authError.code, authError.message);
        
        // Handle specific Firebase auth errors
        if (authError.code === 'auth/configuration-not-found') {
          console.error("Firebase project configuration issue detected");
          setError("Authentication configuration error. Please make sure Google Sign-In is enabled in the Firebase console and localhost is added to authorized domains.");
        } else if (authError.code === 'auth/popup-closed-by-user') {
          setError("Sign-in cancelled. Please try again.");
        } else if (authError.code === 'auth/popup-blocked') {
          setError("Pop-up blocked by browser. Please allow pop-ups for this site and try again.");
        } else if (authError.code === 'auth/cancelled-popup-request') {
          setError("Sign-in cancelled. Please try again.");
        } else if (authError.code === 'auth/network-request-failed') {
          setError("Network error. Please check your internet connection and try again.");
        } else {
          // For other errors, show the error message
          setError(authError.message || "Google sign-in failed");
        }
      }
    } catch (err: any) {
      console.error("Google login failed", err);
      setError(err.message || "Google sign-in failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden">
        <div className="bg-indigo-600 p-6 text-center">
          <h1 className="text-2xl font-bold text-white">Spaced Recall</h1>
          <p className="text-indigo-200 mt-1">Sign in to your account</p>
        </div>
        
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              <p className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </p>
            </div>
          )}
          
          {!firebaseReady && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm rounded-lg">
              <p className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Firebase is still initializing. Some features may not work yet.
              </p>
            </div>
          )}
          
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="you@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                <Link href="#" className="text-xs text-indigo-600 hover:text-indigo-500">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : "Sign in"}
            </button>
          </form>
          
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>
            
            <div className="mt-6">
              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center py-2.5 px-4 border border-gray-300 rounded-lg shadow-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200"
                disabled={isLoading || !firebaseReady}
              >
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Sign in with Google
              </button>
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link href="#" className="font-medium text-indigo-600 hover:text-indigo-500">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 