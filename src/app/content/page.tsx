"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { getUserContentTree, getUserContentItems, createFolder } from '@/lib/contentService';
import { ContentTree, ContentItem } from '@/types/content';
import { Loader2, Plus, FolderIcon, BookOpen, FileText, Search } from 'lucide-react';
import ContentSidebar from '@/components/ContentSidebar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ThemedHeader } from '@/components/ui/themed-header';
import { useTheme } from '@/contexts/theme-context';

export default function ContentPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const [contentTree, setContentTree] = useState<ContentTree | null>(null);
  const [recentItems, setRecentItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ContentItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [folderDescription, setFolderDescription] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  
  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push('/login');
      return;
    }
    
    async function loadContent() {
      try {
        // Load the content tree
        const tree = await getUserContentTree(user.uid);
        setContentTree(tree);
        
        // Load recent items
        const items = await getUserContentItems(user.uid);
        
        // Sort by most recently updated
        items.sort((a, b) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        
        // Take the 6 most recent items
        setRecentItems(items.slice(0, 6));
      } catch (err) {
        console.error('Error loading content:', err);
        toast.error('Failed to load content');
      } finally {
        setLoading(false);
      }
    }
    
    loadContent();
  }, [user, authLoading, router]);
  
  // Search functionality
  useEffect(() => {
    if (!searchQuery.trim() || !user) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    
    setIsSearching(true);
    
    const delaySearch = setTimeout(async () => {
      try {
        // Get all items and filter by search query
        const items = await getUserContentItems(user.uid);
        
        const filteredItems = items.filter(item => 
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
        );
        
        setSearchResults(filteredItems);
      } catch (err) {
        console.error('Error searching content:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    
    return () => clearTimeout(delaySearch);
  }, [searchQuery, user]);
  
  const handleCreateFolder = async () => {
    if (!folderName.trim()) {
      toast.error('Please enter a folder name');
      return;
    }
    
    setCreateLoading(true);
    
    try {
      const newFolder = await createFolder(folderName, folderDescription);
      toast.success('Folder created successfully');
      
      // Navigate to the new folder
      router.push(`/content/${newFolder.id}`);
    } catch (err) {
      console.error('Error creating folder:', err);
      toast.error('Failed to create folder');
    } finally {
      setCreateLoading(false);
      setCreateDialogOpen(false);
    }
  };
  
  const getItemIcon = (type: string) => {
    switch (type) {
      case 'folder':
        return <div className="w-10 h-10 bg-yellow-600/30 rounded-md flex items-center justify-center">📁</div>;
      case 'subject':
        return <div className="w-10 h-10 bg-blue-600/30 rounded-md flex items-center justify-center">📚</div>;
      case 'topic':
        return <div className="w-10 h-10 bg-green-600/30 rounded-md flex items-center justify-center">📝</div>;
      case 'concept':
        return <div className="w-10 h-10 bg-purple-600/30 rounded-md flex items-center justify-center">💡</div>;
      case 'note':
        return <div className="w-10 h-10 bg-orange-600/30 rounded-md flex items-center justify-center">📄</div>;
      default:
        return <div className="w-10 h-10 bg-slate-600/30 rounded-md flex items-center justify-center">❓</div>;
    }
  };
  
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }
  
  if (!user) {
    return null; // The useEffect will handle the redirect
  }
  
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Luxury Top Bar */}
      <div className="px-4 pt-8 pb-4">
        <ThemedHeader
          theme={theme}
          title="Content Library"
          subtitle="Organize your knowledge"
          className="mb-6 shadow-lg"
        />
      </div>

      <div className="flex-1 w-full max-w-7xl mx-auto px-4 pb-8 flex flex-col gap-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Sidebar luxury card (hidden on mobile, handled by Navbar) */}
          <div className="hidden md:block col-span-1">
            {contentTree && (
              <div className="luxury-card p-0 h-full">
                <ContentSidebar
                  tree={contentTree}
                  onCreateItem={(parentId, type) => {
                    if (type === 'folder') {
                      setCreateDialogOpen(true);
                    } else {
                      router.push(`/content/create?type=${type}${parentId ? `&parentId=${parentId}` : ''}`);
                    }
                  }}
                  onDeleteItem={(id) => {
                    router.push(`/content/${id}`);
                  }}
                />
              </div>
            )}
          </div>

          {/* Main content area luxury card */}
          <div className="col-span-1 md:col-span-3">
            <div className="luxury-card p-8 flex flex-col gap-6 animate-fadeIn">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
                <h1 className="text-3xl font-bold tracking-tight">Content Library</h1>
                <div className="flex gap-2 w-full md:w-auto">
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      type="text"
                      placeholder="Search content..."
                      className="pl-9 w-full md:w-64 rounded-lg shadow focus:ring-2 focus:ring-blue-500"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button onClick={() => setCreateDialogOpen(true)} className="rounded-lg shadow bg-blue-600 hover:bg-blue-700 transition-all">
                    <Plus className="h-4 w-4 mr-2" />
                    New Folder
                  </Button>
                </div>
              </div>

              {/* Search Results luxury card */}
              {searchQuery && (
                <div className="luxury-card p-6 animate-fadeIn">
                  <h2 className="text-xl font-semibold mb-4">Search Results</h2>
                  {isSearching ? (
                    <div className="flex items-center gap-2 text-blue-400"><Loader2 className="animate-spin" /> Searching...</div>
                  ) : searchResults.length === 0 ? (
                    <div className="text-slate-400">No results found.</div>
                  ) : (
                    <ul className="space-y-2">
                      {searchResults.map((item) => (
                        <li key={item.id} className="p-3 rounded-lg hover:bg-blue-50/10 transition cursor-pointer flex items-center gap-3">
                          {getItemIcon(item.type)}
                          <span className="font-medium text-lg text-slate-100">{item.name}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Recent Items luxury card */}
              <div className="luxury-card p-6 animate-fadeIn">
                <h2 className="text-xl font-semibold mb-4">Recent Items</h2>
                {recentItems.length === 0 ? (
                  <div className="text-slate-400">No recent items yet.</div>
                ) : (
                  <ul className="space-y-2">
                    {recentItems.map((item) => (
                      <li key={item.id} className="p-3 rounded-lg hover:bg-blue-50/10 transition cursor-pointer flex items-center gap-3">
                        {getItemIcon(item.type)}
                        <span className="font-medium text-lg text-slate-100">{item.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Create Folder Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Folder Name</Label>
              <Input
                id="name"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="Enter folder name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={folderDescription}
                onChange={(e) => setFolderDescription(e.target.value)}
                placeholder="Enter folder description"
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={createLoading}>
              {createLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create Folder'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 