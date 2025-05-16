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
    <div className="h-full bg-slate-900 border-r border-slate-800 w-64 overflow-y-auto">
      <div className="p-4 border-b border-slate-800">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold text-white">Content</h2>
          <Button size="sm" variant="outline" onClick={() => onCreateItem && onCreateItem(undefined, 'folder')}>
            <Plus className="h-4 w-4 mr-1" />
            New
          </Button>
        </div>
      </div>
      
      <div className="py-2">
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
      </div>
    </div>
  );
} 