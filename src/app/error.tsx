"use client";

import { useEffect } from "react";
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console for debugging
    console.error('Application error:', error);
    
    // Check if this is the clientModules error
    const isClientModulesError = error.message?.includes('clientModules');
    if (isClientModulesError) {
      console.log('Detected clientModules error, will attempt recovery');
      // We can try to clear any query params or state that might be causing the issue
      if (typeof window !== 'undefined') {
        // Remove any query parameters that might be causing issues
        if (window.location.search) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    }
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 text-white">
      <div className="w-full max-w-md p-8 bg-slate-800 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
        <p className="mb-6 text-slate-300">
          {error.message?.includes('clientModules') 
            ? 'The application encountered a module loading error. This is often temporary.'
            : 'The application encountered an unexpected error.'}
        </p>
        <div className="flex gap-4">
          <Button 
            onClick={() => window.location.href = '/dashboard'}
            variant="outline"
          >
            Go to Dashboard
          </Button>
          <Button 
            onClick={() => {
              // Clear local storage before resetting
              if (typeof window !== 'undefined') {
                // Only clear app-related items
                const appKeys = ['userTheme'];
                appKeys.forEach(key => localStorage.removeItem(key));
              }
              reset();
            }}
          >
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
} 