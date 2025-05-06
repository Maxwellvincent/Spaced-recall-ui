"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white">
          <div className="text-center px-4">
            <h1 className="text-6xl font-bold text-red-500 mb-4">Fatal Error</h1>
            <h2 className="text-2xl font-semibold mb-6">Application crashed</h2>
            <p className="text-slate-400 mb-8 max-w-md mx-auto">
              A critical error occurred in the application. Please try reloading the page.
            </p>
            <button
              onClick={() => reset()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
} 