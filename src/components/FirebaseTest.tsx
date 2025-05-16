"use client";

import { useState, useEffect } from 'react';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';

export default function FirebaseTest() {
  const [status, setStatus] = useState('Loading...');
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function testFirebase() {
      try {
        // Log environment variables
        console.log("Testing Firebase connection...");
        console.log("API Key from env:", process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
        
        // Initialize Firebase directly in this component for testing
        const firebaseConfig = {
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
        };
        
        // Log the config
        console.log("Firebase config:", {
          apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 5)}...` : "Not set",
          authDomain: firebaseConfig.authDomain,
          projectId: firebaseConfig.projectId
        });
        
        // Initialize Firebase
        const app = initializeApp(firebaseConfig, "test-app");
        setStatus('Firebase initialized successfully');
        
        // Test authentication
        const auth = getAuth(app);
        const result = await signInAnonymously(auth);
        setStatus('Authentication successful: ' + result.user.uid);
        
        // Test Firestore
        const db = getFirestore(app);
        const docRef = await addDoc(collection(db, "test_collection"), {
          timestamp: new Date().toISOString(),
          test: true
        });
        setStatus('All tests passed! Document written with ID: ' + docRef.id);
      } catch (err) {
        console.error("Firebase test error:", err);
        setError(err.message || 'Unknown error');
        setStatus('Test failed');
      }
    }
    
    testFirebase();
  }, []);
  
  return (
    <div className="p-4 bg-slate-800 rounded-lg text-white">
      <h2 className="text-xl font-bold mb-4">Firebase Connection Test</h2>
      <div className="mb-2">Status: <span className={error ? 'text-red-500' : 'text-green-500'}>{status}</span></div>
      {error && (
        <div className="text-red-500 bg-red-900/30 p-2 rounded">
          Error: {error}
        </div>
      )}
    </div>
  );
} 