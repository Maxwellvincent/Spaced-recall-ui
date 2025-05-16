"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { getUserContentTree, createFolder } from '@/lib/contentService';
import { ContentTree } from '@/types/content';
import { Loader2 } from 'lucide-react';
import ContentSidebar from '@/components/ContentSidebar';
import { toast } from 'sonner';

export default function ContentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [contentTree, setContentTree] = useState<ContentTree | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push('/login');
      return;
    }
    
    async function loadContentTree() {
      try {
        const tree = await getUserContentTree(user.uid);
        
        // If the tree is empty, create a default folder structure
        if (tree.rootItems.length === 0) {
          try {
            // Create a default "My Content" folder
            const myContentFolder = await createFolder('My Content', 'Your personal content');
            
            // Update the tree
            const updatedTree = await getUserContentTree(user.uid);
            setContentTree(updatedTree);
          } catch (err) {
            console.error('Error creating default content:', err);
            // Still set the original tree even if we fail to create defaults
            setContentTree(tree);
          }
        } else {
          setContentTree(tree);
        }
      } catch (err) {
        console.error('Error loading content tree:', err);
        toast.error('Failed to load content structure');
      } finally {
        setLoading(false);
      }
    }
    
    loadContentTree();
  }, [user, authLoading, router]);
  
  // Show loading state
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }
  
  // Redirect to login if not authenticated
  if (!user) {
    return null; // The useEffect will handle the redirect
  }
  
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {children}
    </div>
  );
} 