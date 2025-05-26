"use client";

import { useState, useEffect } from "react";
import { 
  GoogleAuthProvider, 
  signInWithPopup,
  getFirebaseAuth
} from "firebase/auth";
import { initializeApp } from "firebase/app";

export default function TestAuthPage() {
  const [status, setStatus] = useState("Loading...");
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  
  useEffect(() => {
    const firebaseConfig = {
      apiKey: "AIzaSyCstJ-ot4vGUaoHoNZ6GZ56i_m-cL2wmpw",
      authDomain: "spacedrecallapp-e142c.firebaseapp.com",
      projectId: "spacedrecallapp-e142c",
      storageBucket: "spacedrecallapp-e142c.appspot.com",
      messagingSenderId: "1034168752304",
      appId: "1:1034168752304:web:363d6db135bc02aa4b0375"
    };
    
    try {
      // Initialize Firebase
      const app = initializeApp(firebaseConfig, "test-auth-app");
      const auth = getFirebaseAuth();
      
      setStatus("Firebase initialized");
      
      // Listen for auth state changes
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        if (currentUser) {
          setUser(currentUser);
          setStatus("User is signed in");
        } else {
          setUser(null);
          setStatus("No user is signed in");
        }
      });
      
      return () => unsubscribe();
    } catch (err) {
      setStatus("Firebase initialization failed");
      setError(err.message);
    }
  }, []);
  
  const handleGoogleSignIn = async () => {
    try {
      setStatus("Attempting Google Sign-In...");
      setError("");
      
      // Get a fresh auth instance
      const app = initializeApp({
        apiKey: "AIzaSyCstJ-ot4vGUaoHoNZ6GZ56i_m-cL2wmpw",
        authDomain: "spacedrecallapp-e142c.firebaseapp.com",
        projectId: "spacedrecallapp-e142c"
      }, "google-sign-in-test");
      
      const auth = getFirebaseAuth();
      
      // Create provider
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      // Sign in
      const result = await signInWithPopup(auth, provider);
      
      // Handle result
      setUser(result.user);
      setStatus("Google Sign-In successful");
    } catch (err) {
      console.error("Google Sign-In error:", err);
      setStatus("Google Sign-In failed");
      setError(err.message);
    }
  };
  
  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-4">Firebase Authentication Test</h1>
      
      <div className="bg-blue-50 p-4 rounded-lg mb-4">
        <h2 className="font-medium">Status: {status}</h2>
        {error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 text-red-700 rounded">
            <p className="font-bold">Error:</p>
            <p>{error}</p>
          </div>
        )}
      </div>
      
      <div className="mb-4">
        <button
          onClick={handleGoogleSignIn}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Sign in with Google
        </button>
      </div>
      
      {user && (
        <div className="bg-green-50 p-4 rounded-lg">
          <h2 className="font-medium mb-2">User Info:</h2>
          <p><strong>Display Name:</strong> {user.displayName}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>UID:</strong> {user.uid}</p>
        </div>
      )}
      
      <div className="mt-8 p-4 bg-yellow-50 rounded-lg">
        <h2 className="font-medium mb-2">Firebase Config:</h2>
        <pre className="whitespace-pre-wrap">
          {JSON.stringify({
            apiKey: "AIzaSyCstJ-ot4vGUaoHoNZ6GZ56i_m-cL2wmpw".substring(0, 5) + "...",
            authDomain: "spacedrecallapp-e142c.firebaseapp.com",
            projectId: "spacedrecallapp-e142c"
          }, null, 2)}
        </pre>
      </div>
    </div>
  );
}
