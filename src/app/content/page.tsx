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

export default function ContentPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
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
    <div className="flex h-screen bg-slate-950 text-white">
      {contentTree && (
        <ContentSidebar 
          tree={contentTree}
          onCreateItem={(parentId, type) => {
            if (type === 'folder') {
              setCreateDialogOpen(true);
            } else {
              // For other types, navigate to the create page with the parent ID
              router.push(`/content/create?type=${type}${parentId ? `&parentId=${parentId}` : ''}`);
            }
          }}
          onDeleteItem={(id) => {
            // Handle delete in the item page
            router.push(`/content/${id}`);
          }}
        />
      )}
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">Content Library</h1>
            
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  type="text"
                  placeholder="Search content..."
                  className="pl-9 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Folder
              </Button>
            </div>
          </div>
          
          {/* Search Results */}
          {searchQuery && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">
                Search Results {isSearching && <Loader2 className="inline h-4 w-4 animate-spin ml-2" />}
              </h2>
              
              {searchResults.length === 0 && !isSearching ? (
                <p className="text-slate-400">No results found for "{searchQuery}"</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {searchResults.map(item => (
                    <Card 
                      key={item.id}
                      className="p-4 hover:bg-slate-800 cursor-pointer transition-colors"
                      onClick={() => router.push(`/content/${item.id}`)}
                    >
                      <div className="flex items-start gap-3">
                        {getItemIcon(item.type)}
                        <div>
                          <h3 className="font-medium">{item.name}</h3>
                          {item.description && (
                            <p className="text-sm text-slate-400 mt-1 line-clamp-2">{item.description}</p>
                          )}
                          <p className="text-xs text-slate-500 mt-2">
                            Updated {new Date(item.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Recent Items */}
          {!searchQuery && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Recent Items</h2>
              
              {recentItems.length === 0 ? (
                <p className="text-slate-400">No recent items. Create some content to get started!</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recentItems.map(item => (
                    <Card 
                      key={item.id}
                      className="p-4 hover:bg-slate-800 cursor-pointer transition-colors"
                      onClick={() => router.push(`/content/${item.id}`)}
                    >
                      <div className="flex items-start gap-3">
                        {getItemIcon(item.type)}
                        <div>
                          <h3 className="font-medium">{item.name}</h3>
                          {item.description && (
                            <p className="text-sm text-slate-400 mt-1 line-clamp-2">{item.description}</p>
                          )}
                          <p className="text-xs text-slate-500 mt-2">
                            Updated {new Date(item.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Getting Started */}
          {!searchQuery && recentItems.length === 0 && (
            <div className="bg-slate-800/50 rounded-lg p-6 mt-8">
              <h2 className="text-xl font-semibold mb-4">Getting Started</h2>
              <p className="text-slate-300 mb-6">
                Welcome to your Content Library! This is where you can organize all your study materials in a flexible, hierarchical structure.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 bg-slate-800">
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <FolderIcon className="h-5 w-5 text-yellow-500" />
                    Create Folders
                  </h3>
                  <p className="text-sm text-slate-400">
                    Organize your content into folders and subfolders, just like in Notion.
                  </p>
                </Card>
                
                <Card className="p-4 bg-slate-800">
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-blue-500" />
                    Add Subjects & Topics
                  </h3>
                  <p className="text-sm text-slate-400">
                    Create subjects and topics to organize your study materials.
                  </p>
                </Card>
                
                <Card className="p-4 bg-slate-800">
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-green-500" />
                    Take Notes
                  </h3>
                  <p className="text-sm text-slate-400">
                    Create notes and concepts to capture your knowledge.
                  </p>
                </Card>
              </div>
              
              <div className="mt-6 flex justify-center">
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Folder
                </Button>
              </div>
            </div>
          )}
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