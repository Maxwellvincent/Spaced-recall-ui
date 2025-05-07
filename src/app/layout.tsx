import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/contexts/theme-context";
import { Toaster } from "sonner";
import { StreakProvider } from "@/contexts/streak-context";
import Script from "next/script";

// Force dynamic rendering for the entire application
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Load Inter font
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Spaced Recall",
  description: "Spaced repetition learning platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Add bootstrap script to fix the error */}
        <Script id="bootstrap" strategy="beforeInteractive">
          {`window.__NEXT_DATA__ = window.__NEXT_DATA__ || {};`}
        </Script>
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <ThemeProvider>
            <StreakProvider>
              {children}
              <Toaster position="top-right" richColors />
            </StreakProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
