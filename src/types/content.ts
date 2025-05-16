// Content types for Notion-like hierarchical structure

/**
 * Content item types in the hierarchical structure
 */
export type ContentItemType = 'folder' | 'subject' | 'topic' | 'concept' | 'note' | 'resource';

/**
 * Base content item interface - represents any item in the content hierarchy
 */
export interface ContentItem {
  id: string;
  type: ContentItemType;
  name: string;
  description?: string;
  parentId?: string;  // Reference to parent item (null for root items)
  children?: string[]; // References to child item IDs
  order: number;      // For ordering within the parent
  createdAt: string;
  updatedAt: string;
  userId: string;
  isArchived?: boolean;
  tags?: string[];
}

/**
 * Folder content item - can contain any other content items
 */
export interface FolderItem extends ContentItem {
  type: 'folder';
  icon?: string;  // Optional icon for the folder
  color?: string; // Optional color for the folder
}

/**
 * Subject content item - represents a study subject
 */
export interface SubjectItem extends ContentItem {
  type: 'subject';
  studyStyle?: string;
  progress?: {
    totalXP: number;
    averageMastery: number;
    completedItems: number;
    totalItems: number;
    lastStudied?: string;
  };
  xp: number;
  level: number;
}

/**
 * Topic content item - represents a study topic
 */
export interface TopicItem extends ContentItem {
  type: 'topic';
  masteryLevel: number;
  xp: number;
  lastStudied?: string;
  nextReview?: string;
  reviewInterval?: number;
}

/**
 * Concept content item - represents a specific concept to learn
 */
export interface ConceptItem extends ContentItem {
  type: 'concept';
  content: string;
  masteryLevel: number;
  lastStudied?: string;
  nextReview?: string;
  reviewInterval?: number;
}

/**
 * Note content item - represents a note or document
 */
export interface NoteItem extends ContentItem {
  type: 'note';
  content: string;
  format: 'markdown' | 'rich-text';
}

/**
 * Resource content item - represents a study resource
 */
export interface ResourceItem extends ContentItem {
  type: 'resource';
  resourceType: 'video' | 'book' | 'article' | 'website' | 'other';
  url?: string;
  content?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  estimatedTime?: number;
}

/**
 * Type guard functions to check content item types
 */
export function isFolder(item: ContentItem): item is FolderItem {
  return item.type === 'folder';
}

export function isSubject(item: ContentItem): item is SubjectItem {
  return item.type === 'subject';
}

export function isTopic(item: ContentItem): item is TopicItem {
  return item.type === 'topic';
}

export function isConcept(item: ContentItem): item is ConceptItem {
  return item.type === 'concept';
}

export function isNote(item: ContentItem): item is NoteItem {
  return item.type === 'note';
}

export function isResource(item: ContentItem): item is ResourceItem {
  return item.type === 'resource';
}

/**
 * Content tree for efficient navigation
 */
export interface ContentTree {
  userId: string;
  rootItems: string[];  // IDs of root level items
  itemsById: {
    [id: string]: {
      name: string;
      type: ContentItemType;
      parentId?: string;
      children: string[];
      order: number;
    }
  };
  lastUpdated: string;
} 