"use client";

import { useState, useEffect } from "react";
import { getFirebaseDb, isFirebaseInitialized } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

export default function TestFirebasePage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function testFirebase() {
      try {
        // Check if Firebase is initialized
        const isInitialized = isFirebaseInitialized();
        
        if (!isInitialized) {
          setStatus("error");
          setError("Firebase is not initialized properly");
          return;
        }
        
        const db = getFirebaseDb();
        const collections = ["projects", "activities", "users"];
        const results: Record<string, any> = {};

        // Test each collection
        for (const collectionName of collections) {
          try {
            const collectionRef = collection(db, collectionName);
            const snapshot = await getDocs(collectionRef);
            
            results[collectionName] = {
              success: true,
              count: snapshot.size,
              firstDocId: snapshot.size > 0 ? snapshot.docs[0].id : null
            };
          } catch (err: any) {
            results[collectionName] = {
              success: false,
              error: err.message
            };
          }
        }

        setResults(results);
        setStatus("success");
      } catch (err: any) {
        console.error("Error testing Firebase:", err);
        setStatus("error");
        setError(err.message);
      }
    }

    testFirebase();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Firebase Connection Test</h1>
      
      {status === "loading" && (
        <div className="text-blue-500">Testing Firebase connection...</div>
      )}
      
      {status === "error" && (
        <div className="text-red-500">
          <p className="font-bold">Error connecting to Firebase:</p>
          <p>{error}</p>
        </div>
      )}
      
      {status === "success" && (
        <div>
          <p className="text-green-500 font-bold">Firebase connection successful!</p>
          
          <div className="mt-4">
            <h2 className="text-xl font-semibold">Collection Results:</h2>
            
            {Object.entries(results).map(([collection, result]: [string, any]) => (
              <div key={collection} className="mt-2 p-4 border rounded">
                <h3 className="font-medium">{collection}</h3>
                
                {result.success ? (
                  <div className="text-green-500">
                    <p>Success! Found {result.count} documents</p>
                    {result.firstDocId && (
                      <p className="text-sm">First document ID: {result.firstDocId}</p>
                    )}
                  </div>
                ) : (
                  <div className="text-red-500">
                    <p>Error: {result.error}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 