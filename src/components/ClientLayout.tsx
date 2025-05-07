'use client';

import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/contexts/theme-context";
import { Toaster } from "sonner";
import { useState, useEffect } from "react";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  // Only show the UI after first render on the client
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a minimal layout during client-side mounting
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-center">
          <p>Loading application...</p>
        </div>
      </div>
    );
  }

  // Full application with providers after client-side hydration
  return (
    <AuthProvider>
      <ThemeProvider>
        {children}
        <Toaster position="top-center" />
      </ThemeProvider>
    </AuthProvider>
  );
} 