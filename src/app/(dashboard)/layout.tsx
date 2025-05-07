"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import { Loader2 } from "lucide-react";
import { ThemeWrapper } from "@/components/ThemeWrapper";
import { ThemeDebug } from "@/components/ThemeDebug";
import { LoginNotification } from "@/components/LoginNotification";
import { StreakDebug } from "@/components/StreakDebug";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  // Mark when we're running on the client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Handle authentication redirect with debounce
  useEffect(() => {
    // Only check auth state when we're on the client and auth is initialized
    if (!isClient || loading) return;
    
    // If no user and not already redirecting, redirect to login
    if (!user && !redirecting) {
      setRedirecting(true);
      
      // Add a small delay to avoid rapid redirects
      const redirectTimeout = setTimeout(() => {
        router.push("/login");
      }, 300);
      
      return () => clearTimeout(redirectTimeout);
    }
  }, [user, loading, router, isClient, redirecting]);

  // Show a static loading state during SSR
  if (!isClient) {
    return (
      <div className="min-h-screen bg-slate-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
          <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-2">Loading...</h2>
            <p className="text-slate-400">Please wait</p>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while auth is initializing
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-slate-200">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // If redirecting to login, show a minimal loading state
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-slate-200">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // User is authenticated, render the dashboard
  return (
    <ThemeWrapper className="min-h-screen transition-colors duration-300">
      <Navbar />
      <main>{children}</main>
      <LoginNotification />
      {process.env.NODE_ENV !== 'production' && (
        <>
          <ThemeDebug />
          <StreakDebug />
        </>
      )}
    </ThemeWrapper>
  );
} 