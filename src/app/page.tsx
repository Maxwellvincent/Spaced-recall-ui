"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import { ArrowRight, BookOpen, Brain, Clock, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isClient, setIsClient] = useState(false);

  // Mark when we're running on the client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (isClient && !loading && user) {
      router.push("/dashboard");
    }
  }, [isClient, loading, user, router]);

  // Show loading state during authentication check
  if (loading || !isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 to-blue-900">
        <div className="animate-pulse text-blue-300">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-blue-900 text-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
            Spaced Recall
          </h1>
          <p className="text-xl text-slate-300 mb-10">
            Master any subject with the power of spaced repetition learning
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {!user ? (
              <>
                <Button 
                  onClick={() => router.push("/login")}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 rounded-lg text-lg"
                >
                  Log In
                </Button>
                <Button 
                  onClick={() => router.push("/login?signup=true")}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-6 rounded-lg text-lg"
                >
                  Sign Up
                </Button>
              </>
            ) : (
              <Button 
                onClick={() => router.push("/dashboard")}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 rounded-lg text-lg flex items-center gap-2"
              >
                Go to Dashboard <ArrowRight className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-slate-900/80 py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-slate-800/50 p-6 rounded-lg">
              <div className="bg-blue-900/50 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <BookOpen className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Organized Subjects</h3>
              <p className="text-slate-400">Structure your learning with subjects, topics, and concepts</p>
            </div>
            
            <div className="bg-slate-800/50 p-6 rounded-lg">
              <div className="bg-purple-900/50 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <Brain className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Spaced Repetition</h3>
              <p className="text-slate-400">Review concepts at optimal intervals for maximum retention</p>
            </div>
            
            <div className="bg-slate-800/50 p-6 rounded-lg">
              <div className="bg-green-900/50 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Study Logger</h3>
              <p className="text-slate-400">Track your study sessions and monitor your progress</p>
            </div>
            
            <div className="bg-slate-800/50 p-6 rounded-lg">
              <div className="bg-yellow-900/50 p-3 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <Star className="h-6 w-6 text-yellow-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Themed Learning</h3>
              <p className="text-slate-400">Choose fun themes to make your learning journey more engaging</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* CTA Section */}
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl font-bold mb-6">Ready to start learning?</h2>
        <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
          Join thousands of students using Spaced Recall to master their subjects and achieve their learning goals.
        </p>
        
        {!user ? (
          <Button 
            onClick={() => router.push("/login?signup=true")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 rounded-lg text-lg"
          >
            Get Started Now
          </Button>
        ) : (
          <Button 
            onClick={() => router.push("/dashboard")}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 rounded-lg text-lg"
          >
            Continue Learning
          </Button>
        )}
      </div>
      
      {/* Footer */}
      <footer className="bg-slate-900 py-8 border-t border-slate-800">
        <div className="container mx-auto px-4 text-center text-slate-400">
          <p>© {new Date().getFullYear()} Spaced Recall. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
