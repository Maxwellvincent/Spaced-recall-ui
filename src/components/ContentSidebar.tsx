import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronRight, 
  ChevronDown, 
  Folder, 
  BookOpen, 
  FileText, 
  Lightbulb, 
  File, 
  Plus,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContentItem, ContentTree, ContentItemType } from '@/types/content';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface ContentSidebarProps {
  tree: ContentTree;
  currentItemId?: string;
  onCreateItem?: (parentId: string | undefined, type: ContentItemType) => void;
  onMoveItem?: (itemId: string, newParentId: string | undefined) => void;
  onDeleteItem?: (itemId: string) => void;
}

interface TreeItemProps {
  itemId: string;
  tree: ContentTree;
  level: number;
  currentItemId?: string;
  expandedItems: Set<string>;
  onToggleExpand: (itemId: string) => void;
  onSelectItem: (itemId: string) => void;
  onCreateItem?: (parentId: string | undefined, type: ContentItemType) => void;
  onMoveItem?: (itemId: string, newParentId: string | undefined) => void;
  onDeleteItem?: (itemId: string) => void;
}

const getItemIcon = (type: ContentItemType) => {
  switch (type) {
    case 'folder':
      return <Folder className="h-4 w-4" />;
    case 'subject':
      return <BookOpen className="h-4 w-4" />;
    case 'topic':
      return <FileText className="h-4 w-4" />;
    case 'concept':
      return <Lightbulb className="h-4 w-4" />;
    default:
      return <File className="h-4 w-4" />;
  }
};

const TreeItem: React.FC<TreeItemProps> = ({
  itemId,
  tree,
  level,
  currentItemId,
  expandedItems,
  onToggleExpand,
  onSelectItem,
  onCreateItem,
  onMoveItem,
  onDeleteItem,
}) => {
  const item = tree.itemsById[itemId];
  
  if (!item) return null;
  
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expandedItems.has(itemId);
  const isSelected = currentItemId === itemId;
  
  return (
    <div>
      <div 
        className={cn(
          "flex items-center py-1 px-2 rounded-md text-sm",
          isSelected ? "bg-slate-700 text-white" : "hover:bg-slate-800 text-slate-300",
          "transition-colors duration-100"
        )}
        style={{ paddingLeft: `${level * 12 + 4}px` }}
      >
        {hasChildren ? (
          <button 
            onClick={() => onToggleExpand(itemId)} 
            className="mr-1 p-1 hover:bg-slate-700 rounded-sm"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        ) : (
          <div className="w-5" />
        )}
        
        <div 
          className="flex items-center flex-1 cursor-pointer py-1"
          onClick={() => onSelectItem(itemId)}
        >
          <span className="mr-2">{getItemIcon(item.type)}</span>
          <span className="truncate">{item.name}</span>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onCreateItem && onCreateItem(itemId, 'folder')}>
              Add Folder
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCreateItem && onCreateItem(itemId, 'subject')}>
              Add Subject
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCreateItem && onCreateItem(itemId, 'topic')}>
              Add Topic
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCreateItem && onCreateItem(itemId, 'concept')}>
              Add Concept
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCreateItem && onCreateItem(itemId, 'note')}>
              Add Note
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDeleteItem && onDeleteItem(itemId)}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {isExpanded && hasChildren && (
        <div>
          {item.children
            .sort((a, b) => {
              const itemA = tree.itemsById[a];
              const itemB = tree.itemsById[b];
              return (itemA?.order || 0) - (itemB?.order || 0);
            })
            .map(childId => (
              <TreeItem
                key={childId}
                itemId={childId}
                tree={tree}
                level={level + 1}
                currentItemId={currentItemId}
                expandedItems={expandedItems}
                onToggleExpand={onToggleExpand}
                onSelectItem={onSelectItem}
                onCreateItem={onCreateItem}
                onMoveItem={onMoveItem}
                onDeleteItem={onDeleteItem}
              />
            ))}
        </div>
      )}
    </div>
  );
};

export default function ContentSidebar({
  tree,
  currentItemId,
  onCreateItem,
  onMoveItem,
  onDeleteItem,
}: ContentSidebarProps) {
  const router = useRouter();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  
  const handleToggleExpand = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };
  
  const handleSelectItem = (itemId: string) => {
    router.push(`/content/${itemId}`);
  };
  
  return (
    <aside
      className="hidden md:block h-full w-72 p-0 bg-transparent"
      aria-label="Sidebar navigation"
    >
      <div className="luxury-card h-full w-full flex flex-col overflow-y-auto">
        <div className="p-6 border-b border-white/10 dark:border-slate-800/60 flex justify-between items-center">
          <h2 className="font-semibold text-lg tracking-tight text-slate-900 dark:text-white">Content</h2>
          <Button size="sm" variant="outline" className="rounded-full px-3 py-1.5 text-base font-semibold shadow-md hover:shadow-lg" onClick={() => onCreateItem && onCreateItem(undefined, 'folder')}>
            <Plus className="h-5 w-5 mr-2" />
            New
          </Button>
        </div>
        <nav className="py-4 px-2 flex-1">
          {tree.rootItems
            .sort((a, b) => {
              const itemA = tree.itemsById[a];
              const itemB = tree.itemsById[b];
              return (itemA?.order || 0) - (itemB?.order || 0);
            })
            .map(itemId => (
              <TreeItem
                key={itemId}
                itemId={itemId}
                tree={tree}
                level={0}
                currentItemId={currentItemId}
                expandedItems={expandedItems}
                onToggleExpand={handleToggleExpand}
                onSelectItem={handleSelectItem}
                onCreateItem={onCreateItem}
                onMoveItem={onMoveItem}
                onDeleteItem={onDeleteItem}
              />
            ))}
        </nav>
      </div>
    </aside>
  );
}

// Mobile version: sidebar in a Dialog (sheet/drawer)
export function ContentSidebarMobile({
  open,
  onOpenChange,
  ...props
}: ContentSidebarProps & { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-xs left-0 top-0 translate-x-0 translate-y-0 h-full rounded-none border-none shadow-2xl bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl">
        <div className="h-full w-72 flex flex-col">
          <ContentSidebar {...props} />
        </div>
      </DialogContent>
    </Dialog>
  );
} 