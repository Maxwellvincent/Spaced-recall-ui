"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function RedirectToCreatePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/subjects/create");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
        <p className="text-slate-200">Redirecting to subject creation...</p>
      </div>
    </div>
  );
} 