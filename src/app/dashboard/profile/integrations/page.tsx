"use client";

import { useState, useEffect } from "react";
import { ThemedHeader } from "@/components/ui/themed-components";
import { useTheme } from "@/contexts/theme-context";
import NotionIntegrationSetup from "@/components/NotionIntegrationSetup";
import ObsidianIntegrationSetup from "@/components/ObsidianIntegrationSetup";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function IntegrationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    
    // Simple timeout to ensure components are ready
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div>
      <ThemedHeader
        theme={theme}
        title="Integrations"
        subtitle="Connect your favorite tools and services"
        className="mb-8"
      />
      
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-200 p-4 rounded-md mb-6">
          {error}
        </div>
      )}
      
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-semibold mb-4">Notion Integration</h2>
          <div className="bg-slate-900/50 rounded-lg border border-slate-800">
            <NotionIntegrationSetup />
          </div>
        </div>
        
        <div>
          <h2 className="text-2xl font-semibold mb-4">Obsidian Integration</h2>
          <div className="bg-slate-900/50 rounded-lg border border-slate-800">
            <ObsidianIntegrationSetup />
          </div>
        </div>
      </div>
    </div>
  );
} 