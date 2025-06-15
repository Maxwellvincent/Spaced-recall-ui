"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Plus, ChevronRight, Edit, Trash } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from '@/components/ui/breadcrumb';
import ContentSidebar from '@/components/ContentSidebar';
import { 
  ContentItem, 
  ContentTree, 
  ContentItemType,
  isFolder,
  isSubject,
  isTopic,
  isConcept,
  isNote
} from '@/types/content';
import { 
  getContentItem, 
  getUserContentTree,
  createFolder,
  createSubject,
  createTopic,
  createConcept,
  createNote,
  moveContentItem,
  deleteContentItem
} from '@/lib/contentService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { ThemedHeader } from '@/components/ui/themed-header';
import { useTheme } from '@/contexts/theme-context';

export default function ContentItemPage() {
  const { user, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const params = useParams();
  const itemId = params.itemId as string;
  
  const [contentItem, setContentItem] = useState<ContentItem | null>(null);
  const [contentTree, setContentTree] = useState<ContentTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<ContentItem[]>([]);
  const [childItems, setChildItems] = useState<ContentItem[]>([]);
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createType, setCreateType] = useState<ContentItemType>('folder');
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createContent, setCreateContent] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push('/login');
      return;
    }
    
    async function loadContent() {
      setLoading(true);
      setError(null);
      
      try {
        // Load the content tree
        const tree = await getUserContentTree(user.uid);
        setContentTree(tree);
        
        // Load the current content item
        const item = await getContentItem(itemId);
        
        if (!item) {
          setError('Content item not found');
          setLoading(false);
          return;
        }
        
        setContentItem(item);
        
        // Build breadcrumbs
        const breadcrumbItems: ContentItem[] = [];
        let currentId = item.parentId;
        
        while (currentId) {
          const parentItem = await getContentItem(currentId);
          if (parentItem) {
            breadcrumbItems.unshift(parentItem);
            currentId = parentItem.parentId;
          } else {
            currentId = undefined;
          }
        }
        
        setBreadcrumbs(breadcrumbItems);
        
        // Load child items
        if (item.children && item.children.length > 0) {
          const childItemPromises = item.children.map(childId => getContentItem(childId));
          const childItemsResult = await Promise.all(childItemPromises);
          const validChildItems = childItemsResult.filter(item => item !== null) as ContentItem[];
          
          // Sort by order
          validChildItems.sort((a, b) => a.order - b.order);
          
          setChildItems(validChildItems);
        } else {
          setChildItems([]);
        }
      } catch (err) {
        console.error('Error loading content:', err);
        setError('Failed to load content. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    
    loadContent();
  }, [user, authLoading, itemId, router]);
  
  const handleCreateItem = async () => {
    if (!createName.trim()) {
      toast.error('Please enter a name');
      return;
    }
    
    setCreateLoading(true);
    
    try {
      let newItem: ContentItem;
      
      switch (createType) {
        case 'folder':
          newItem = await createFolder(createName, createDescription, itemId);
          break;
        case 'subject':
          newItem = await createSubject(createName, createDescription, itemId);
          break;
        case 'topic':
          newItem = await createTopic(createName, createDescription, itemId);
          break;
        case 'concept':
          newItem = await createConcept(createName, createContent, itemId);
          break;
        case 'note':
          newItem = await createNote(createName, createContent, itemId);
          break;
        default:
          throw new Error(`Unsupported content type: ${createType}`);
      }
      
      toast.success(`${createType} created successfully`);
      
      // Add to child items
      setChildItems(prev => [...prev, newItem]);
      
      // Reset form
      setCreateName('');
      setCreateDescription('');
      setCreateContent('');
      setCreateDialogOpen(false);
      
      // Navigate to the new item
      router.push(`/content/${newItem.id}`);
    } catch (err) {
      console.error('Error creating item:', err);
      toast.error('Failed to create item. Please try again.');
    } finally {
      setCreateLoading(false);
    }
  };
  
  const handleDeleteItem = async () => {
    if (!contentItem) return;
    
    setDeleteLoading(true);
    
    try {
      await deleteContentItem(contentItem.id);
      toast.success('Item deleted successfully');
      
      // Navigate to parent or root
      if (contentItem.parentId) {
        router.push(`/content/${contentItem.parentId}`);
      } else {
        router.push('/content');
      }
    } catch (err) {
      console.error('Error deleting item:', err);
      toast.error('Failed to delete item. Please try again.');
    } finally {
      setDeleteLoading(false);
      setDeleteDialogOpen(false);
    }
  };
  
  const renderContentByType = () => {
    if (!contentItem) return null;
    
    // Render specific content based on type
    if (isFolder(contentItem) || isSubject(contentItem)) {
      return (
        <div>
          <div className="prose prose-invert max-w-none">
            {contentItem.description && (
              <p>{contentItem.description}</p>
            )}
          </div>
          
          {isSubject(contentItem) && (
            <div className="mt-4">
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4">
                  <h3 className="text-lg font-medium">XP</h3>
                  <p className="text-2xl font-bold">{contentItem.xp}</p>
                </Card>
                <Card className="p-4">
                  <h3 className="text-lg font-medium">Level</h3>
                  <p className="text-2xl font-bold">{contentItem.level}</p>
                </Card>
              </div>
              
              {contentItem.progress && (
                <div className="mt-4">
                  <h3 className="text-lg font-medium mb-2">Progress</h3>
                  <div className="w-full bg-slate-700 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{ width: `${contentItem.progress.averageMastery}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span>Mastery: {contentItem.progress.averageMastery}%</span>
                    <span>
                      {contentItem.progress.completedItems}/{contentItem.progress.totalItems} items completed
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="mt-6">
            <h3 className="text-xl font-semibold mb-4">Contents</h3>
            
            {childItems.length === 0 ? (
              <p className="text-slate-400">No items yet. Create some using the button above.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {childItems.map(item => (
                  <Card 
                    key={item.id}
                    className="p-4 hover:bg-slate-800 cursor-pointer transition-colors"
                    onClick={() => router.push(`/content/${item.id}`)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {getItemIcon(item.type)}
                      <h4 className="font-medium">{item.name}</h4>
                    </div>
                    {item.description && (
                      <p className="text-sm text-slate-400 line-clamp-2">{item.description}</p>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }
    
    if (isTopic(contentItem)) {
      return (
        <div>
          <div className="prose prose-invert max-w-none">
            {contentItem.description && (
              <p>{contentItem.description}</p>
            )}
          </div>
          
          <div className="mt-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <h3 className="text-lg font-medium">XP</h3>
                <p className="text-2xl font-bold">{contentItem.xp}</p>
              </Card>
              <Card className="p-4">
                <h3 className="text-lg font-medium">Mastery</h3>
                <p className="text-2xl font-bold">{contentItem.masteryLevel}%</p>
              </Card>
            </div>
          </div>
          
          <div className="mt-6">
            <h3 className="text-xl font-semibold mb-4">Concepts</h3>
            
            {childItems.length === 0 ? (
              <p className="text-slate-400">No concepts yet. Create some using the button above.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {childItems.map(item => (
                  <Card 
                    key={item.id}
                    className="p-4 hover:bg-slate-800 cursor-pointer transition-colors"
                    onClick={() => router.push(`/content/${item.id}`)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {getItemIcon(item.type)}
                      <h4 className="font-medium">{item.name}</h4>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }
    
    if (isConcept(contentItem)) {
      return (
        <div>
          <Tabs defaultValue="content">
            <TabsList>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="progress">Progress</TabsTrigger>
            </TabsList>
            <TabsContent value="content" className="mt-4">
              <div className="prose prose-invert max-w-none">
                <ReactMarkdown>{contentItem.content}</ReactMarkdown>
              </div>
            </TabsContent>
            <TabsContent value="progress" className="mt-4">
              <Card className="p-4">
                <h3 className="text-lg font-medium mb-2">Mastery Level</h3>
                <div className="w-full bg-slate-700 rounded-full h-2.5 mb-4">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${contentItem.masteryLevel}%` }}
                  ></div>
                </div>
                <p className="text-sm">
                  Mastery: {contentItem.masteryLevel}%
                </p>
                
                {contentItem.lastStudied && (
                  <p className="text-sm text-slate-400 mt-2">
                    Last studied: {new Date(contentItem.lastStudied).toLocaleDateString()}
                  </p>
                )}
                
                {contentItem.nextReview && (
                  <p className="text-sm text-slate-400 mt-1">
                    Next review: {new Date(contentItem.nextReview).toLocaleDateString()}
                  </p>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      );
    }
    
    if (isNote(contentItem)) {
      return (
        <div className="prose prose-invert max-w-none">
          <ReactMarkdown>{contentItem.content}</ReactMarkdown>
        </div>
      );
    }
    
    return (
      <div className="text-slate-400">
        Unknown content type: {contentItem.type}
      </div>
    );
  };
  
  const getItemIcon = (type: ContentItemType) => {
    switch (type) {
      case 'folder':
        return <div className="w-6 h-6 bg-yellow-600/30 rounded-md flex items-center justify-center">📁</div>;
      case 'subject':
        return <div className="w-6 h-6 bg-blue-600/30 rounded-md flex items-center justify-center">📚</div>;
      case 'topic':
        return <div className="w-6 h-6 bg-green-600/30 rounded-md flex items-center justify-center">📝</div>;
      case 'concept':
        return <div className="w-6 h-6 bg-purple-600/30 rounded-md flex items-center justify-center">💡</div>;
      case 'note':
        return <div className="w-6 h-6 bg-orange-600/30 rounded-md flex items-center justify-center">📄</div>;
      default:
        return <div className="w-6 h-6 bg-slate-600/30 rounded-md flex items-center justify-center">❓</div>;
    }
  };
  
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold text-red-500 mb-4">Error</h1>
        <p className="text-slate-300 mb-6">{error}</p>
        <Button onClick={() => router.push('/content')}>
          Go to Content Home
        </Button>
      </div>
    );
  }
  
  if (!contentItem || !contentTree) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold text-slate-300 mb-4">Content Not Found</h1>
        <p className="text-slate-400 mb-6">The requested content could not be found.</p>
        <Button onClick={() => router.push('/content')}>
          Go to Content Home
        </Button>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Luxury Top Bar */}
      <div className="px-4 pt-8 pb-4">
        <ThemedHeader
          theme={theme}
          title={contentItem.name}
          subtitle={contentItem.type.charAt(0).toUpperCase() + contentItem.type.slice(1)}
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
                  currentItemId={itemId}
                  onCreateItem={(parentId, type) => {
                    setCreateType(type);
                    setCreateDialogOpen(true);
                  }}
                  onDeleteItem={(id) => {
                    if (id === itemId) {
                      setDeleteDialogOpen(true);
                    }
                  }}
                />
              </div>
            )}
          </div>

          {/* Main content area luxury card */}
          <div className="col-span-1 md:col-span-3">
            <div className="luxury-card p-8 flex flex-col gap-6 animate-fadeIn">
              {/* Breadcrumbs luxury card */}
              <div className="flex items-center gap-2 mb-4">
                <Breadcrumb>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/content">Content</BreadcrumbLink>
                  </BreadcrumbItem>
                  {breadcrumbs.map((item) => (
                    <BreadcrumbItem key={item.id}>
                      <ChevronRight className="h-4 w-4 text-blue-400" />
                      <BreadcrumbLink href={`/content/${item.id}`}>{item.name}</BreadcrumbLink>
                    </BreadcrumbItem>
                  ))}
                  <BreadcrumbItem>
                    <ChevronRight className="h-4 w-4 text-blue-400" />
                    <span className="font-semibold text-slate-100">{contentItem.name}</span>
                  </BreadcrumbItem>
                </Breadcrumb>
              </div>

              {/* Main content luxury card */}
              <div className="flex flex-col gap-4">
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  {getItemIcon(contentItem.type)}
                  {contentItem.name}
                </h1>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setCreateDialogOpen(true)} className="rounded-lg shadow hover:shadow-lg transition-all">
                    <Plus className="h-4 w-4 mr-2" />
                    Create
                  </Button>
                  <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)} className="rounded-lg shadow hover:shadow-lg transition-all">
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-6">
                  {renderContentByType()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New {createType.charAt(0).toUpperCase() + createType.slice(1)}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder={`Enter ${createType} name`}
              />
            </div>
            
            {(createType === 'folder' || createType === 'subject' || createType === 'topic') && (
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  placeholder={`Enter ${createType} description`}
                  rows={3}
                />
              </div>
            )}
            
            {(createType === 'concept' || createType === 'note') && (
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={createContent}
                  onChange={(e) => setCreateContent(e.target.value)}
                  placeholder={`Enter ${createType} content`}
                  rows={10}
                />
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateItem} disabled={createLoading}>
              {createLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {contentItem.name}</DialogTitle>
          </DialogHeader>
          
          <p>
            Are you sure you want to delete this {contentItem.type}?
            {contentItem.children && contentItem.children.length > 0 && (
              <span className="text-red-400 block mt-2">
                This will also delete {contentItem.children.length} child item(s).
              </span>
            )}
          </p>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteItem} disabled={deleteLoading}>
              {deleteLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 