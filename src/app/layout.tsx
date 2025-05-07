import { Inter } from "next/font/google";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";

// Force dynamic rendering for the entire application
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Load Inter font
const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Spaced Recall App",
  description: "A spaced repetition learning application",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
