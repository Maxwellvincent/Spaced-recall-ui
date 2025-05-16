import { 
  getFirebaseDb, 
  getFirebaseAuth 
} from '@/lib/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp, 
  runTransaction,
  DocumentReference
} from 'firebase/firestore';
import { 
  ContentItem, 
  ContentTree, 
  ContentItemType,
  SubjectItem,
  TopicItem,
  ConceptItem,
  NoteItem,
  FolderItem,
  ResourceItem
} from '@/types/content';

const db = getFirebaseDb();

/**
 * Get the current user ID
 */
export async function getCurrentUserId(): Promise<string> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  return user.uid;
}

/**
 * Get a content item by ID
 */
export async function getContentItem(itemId: string): Promise<ContentItem | null> {
  try {
    const docRef = doc(db, 'contentItems', itemId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    return { id: docSnap.id, ...docSnap.data() } as ContentItem;
  } catch (error) {
    console.error('Error getting content item:', error);
    throw error;
  }
}

/**
 * Get all content items for a user
 */
export async function getUserContentItems(userId: string): Promise<ContentItem[]> {
  try {
    const q = query(
      collection(db, 'contentItems'),
      where('userId', '==', userId),
      where('isArchived', '==', false),
      orderBy('updatedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }) as ContentItem);
  } catch (error) {
    console.error('Error getting user content items:', error);
    throw error;
  }
}

/**
 * Get the content tree for a user
 */
export async function getUserContentTree(userId: string): Promise<ContentTree> {
  try {
    const docRef = doc(db, 'contentTrees', userId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      // Create default tree if it doesn't exist
      return {
        userId,
        rootItems: [],
        itemsById: {},
        lastUpdated: new Date().toISOString()
      };
    }
    
    return docSnap.data() as ContentTree;
  } catch (error) {
    console.error('Error getting content tree:', error);
    throw error;
  }
}

/**
 * Create a new content item
 */
export async function createContentItem(
  item: Omit<ContentItem, 'id' | 'createdAt' | 'updatedAt'>,
  parentId?: string
): Promise<ContentItem> {
  try {
    const userId = await getCurrentUserId();
    
    // Start a transaction to ensure consistency
    return await runTransaction(db, async (transaction) => {
      // Create the new item
      const newItemRef = doc(collection(db, 'contentItems'));
      const now = new Date().toISOString();
      
      const newItem: ContentItem = {
        ...item,
        id: newItemRef.id,
        userId,
        createdAt: now,
        updatedAt: now,
        parentId,
        children: item.children || [],
      };
      
      transaction.set(newItemRef, newItem);
      
      // Update the content tree
      const treeRef = doc(db, 'contentTrees', userId);
      const treeSnap = await transaction.get(treeRef);
      
      let tree: ContentTree;
      
      if (!treeSnap.exists()) {
        // Create new tree if it doesn't exist
        tree = {
          userId,
          rootItems: [],
          itemsById: {},
          lastUpdated: now
        };
      } else {
        tree = treeSnap.data() as ContentTree;
      }
      
      // Add the new item to the tree
      tree.itemsById[newItem.id] = {
        name: newItem.name,
        type: newItem.type,
        parentId: newItem.parentId,
        children: newItem.children || [],
        order: Object.keys(tree.itemsById).length // Simple ordering
      };
      
      // Update parent references
      if (parentId) {
        // Add to parent's children
        if (!tree.itemsById[parentId]) {
          throw new Error(`Parent item ${parentId} not found`);
        }
        
        tree.itemsById[parentId].children = [
          ...tree.itemsById[parentId].children,
          newItem.id
        ];
      } else {
        // Add to root items
        tree.rootItems = [...tree.rootItems, newItem.id];
      }
      
      tree.lastUpdated = now;
      
      transaction.set(treeRef, tree);
      
      return newItem;
    });
  } catch (error) {
    console.error('Error creating content item:', error);
    throw error;
  }
}

/**
 * Update a content item
 */
export async function updateContentItem(
  itemId: string,
  updates: Partial<ContentItem>
): Promise<ContentItem> {
  try {
    const itemRef = doc(db, 'contentItems', itemId);
    const now = new Date().toISOString();
    
    // Remove fields that shouldn't be updated directly
    const { id, userId, createdAt, children, parentId, ...validUpdates } = updates;
    
    await updateDoc(itemRef, {
      ...validUpdates,
      updatedAt: now
    });
    
    // If name was updated, update the tree as well
    if (updates.name) {
      const userId = await getCurrentUserId();
      const treeRef = doc(db, 'contentTrees', userId);
      const treeSnap = await getDoc(treeRef);
      
      if (treeSnap.exists()) {
        const tree = treeSnap.data() as ContentTree;
        
        if (tree.itemsById[itemId]) {
          tree.itemsById[itemId].name = updates.name;
          tree.lastUpdated = now;
          
          await updateDoc(treeRef, tree);
        }
      }
    }
    
    // Get the updated item
    const updatedDoc = await getDoc(itemRef);
    return { id: updatedDoc.id, ...updatedDoc.data() } as ContentItem;
  } catch (error) {
    console.error('Error updating content item:', error);
    throw error;
  }
}

/**
 * Move a content item to a new parent
 */
export async function moveContentItem(
  itemId: string,
  newParentId?: string
): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    
    return await runTransaction(db, async (transaction) => {
      // Get the item
      const itemRef = doc(db, 'contentItems', itemId);
      const itemSnap = await transaction.get(itemRef);
      
      if (!itemSnap.exists()) {
        throw new Error(`Item ${itemId} not found`);
      }
      
      const item = { id: itemSnap.id, ...itemSnap.data() } as ContentItem;
      const oldParentId = item.parentId;
      
      // Update the item's parent reference
      transaction.update(itemRef, { 
        parentId: newParentId,
        updatedAt: new Date().toISOString()
      });
      
      // Update the content tree
      const treeRef = doc(db, 'contentTrees', userId);
      const treeSnap = await transaction.get(treeRef);
      
      if (!treeSnap.exists()) {
        throw new Error('Content tree not found');
      }
      
      const tree = treeSnap.data() as ContentTree;
      
      // Update the tree item's parent reference
      if (tree.itemsById[itemId]) {
        tree.itemsById[itemId].parentId = newParentId;
      }
      
      // Remove from old parent's children or root items
      if (oldParentId && tree.itemsById[oldParentId]) {
        tree.itemsById[oldParentId].children = tree.itemsById[oldParentId].children.filter(
          id => id !== itemId
        );
      } else {
        tree.rootItems = tree.rootItems.filter(id => id !== itemId);
      }
      
      // Add to new parent's children or root items
      if (newParentId && tree.itemsById[newParentId]) {
        tree.itemsById[newParentId].children = [
          ...tree.itemsById[newParentId].children,
          itemId
        ];
      } else {
        tree.rootItems = [...tree.rootItems, itemId];
      }
      
      tree.lastUpdated = new Date().toISOString();
      
      transaction.set(treeRef, tree);
    });
  } catch (error) {
    console.error('Error moving content item:', error);
    throw error;
  }
}

/**
 * Delete a content item and all its children
 */
export async function deleteContentItem(itemId: string): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    
    return await runTransaction(db, async (transaction) => {
      // Get the item
      const itemRef = doc(db, 'contentItems', itemId);
      const itemSnap = await transaction.get(itemRef);
      
      if (!itemSnap.exists()) {
        throw new Error(`Item ${itemId} not found`);
      }
      
      const item = { id: itemSnap.id, ...itemSnap.data() } as ContentItem;
      const parentId = item.parentId;
      
      // Delete the item and all its children recursively
      const deleteItemAndChildren = async (id: string) => {
        const ref = doc(db, 'contentItems', id);
        const snap = await transaction.get(ref);
        
        if (snap.exists()) {
          const data = snap.data();
          
          // Delete all children first
          if (data.children && Array.isArray(data.children)) {
            for (const childId of data.children) {
              await deleteItemAndChildren(childId);
            }
          }
          
          // Delete the item itself
          transaction.delete(ref);
        }
      };
      
      await deleteItemAndChildren(itemId);
      
      // Update the content tree
      const treeRef = doc(db, 'contentTrees', userId);
      const treeSnap = await transaction.get(treeRef);
      
      if (!treeSnap.exists()) {
        throw new Error('Content tree not found');
      }
      
      const tree = treeSnap.data() as ContentTree;
      
      // Remove from parent's children or root items
      if (parentId && tree.itemsById[parentId]) {
        tree.itemsById[parentId].children = tree.itemsById[parentId].children.filter(
          id => id !== itemId
        );
      } else {
        tree.rootItems = tree.rootItems.filter(id => id !== itemId);
      }
      
      // Remove the item and all its children from the tree
      const removeFromTree = (id: string) => {
        if (tree.itemsById[id]) {
          const children = [...tree.itemsById[id].children];
          delete tree.itemsById[id];
          
          // Remove all children
          for (const childId of children) {
            removeFromTree(childId);
          }
        }
      };
      
      removeFromTree(itemId);
      
      tree.lastUpdated = new Date().toISOString();
      
      transaction.set(treeRef, tree);
    });
  } catch (error) {
    console.error('Error deleting content item:', error);
    throw error;
  }
}

/**
 * Create a folder
 */
export async function createFolder(
  name: string,
  description?: string,
  parentId?: string
): Promise<FolderItem> {
  const folder: Omit<FolderItem, 'id' | 'createdAt' | 'updatedAt'> = {
    type: 'folder',
    name,
    description,
    parentId,
    order: 0,
    userId: await getCurrentUserId(),
    children: []
  };
  
  return createContentItem(folder, parentId) as Promise<FolderItem>;
}

/**
 * Create a subject
 */
export async function createSubject(
  name: string,
  description?: string,
  parentId?: string
): Promise<SubjectItem> {
  const subject: Omit<SubjectItem, 'id' | 'createdAt' | 'updatedAt'> = {
    type: 'subject',
    name,
    description,
    parentId,
    order: 0,
    userId: await getCurrentUserId(),
    children: [],
    xp: 0,
    level: 1,
    progress: {
      totalXP: 0,
      averageMastery: 0,
      completedItems: 0,
      totalItems: 0
    }
  };
  
  return createContentItem(subject, parentId) as Promise<SubjectItem>;
}

/**
 * Create a topic
 */
export async function createTopic(
  name: string,
  description?: string,
  parentId?: string
): Promise<TopicItem> {
  const topic: Omit<TopicItem, 'id' | 'createdAt' | 'updatedAt'> = {
    type: 'topic',
    name,
    description,
    parentId,
    order: 0,
    userId: await getCurrentUserId(),
    children: [],
    xp: 0,
    masteryLevel: 0
  };
  
  return createContentItem(topic, parentId) as Promise<TopicItem>;
}

/**
 * Create a concept
 */
export async function createConcept(
  name: string,
  content: string,
  parentId?: string
): Promise<ConceptItem> {
  const concept: Omit<ConceptItem, 'id' | 'createdAt' | 'updatedAt'> = {
    type: 'concept',
    name,
    content,
    parentId,
    order: 0,
    userId: await getCurrentUserId(),
    children: [],
    masteryLevel: 0
  };
  
  return createContentItem(concept, parentId) as Promise<ConceptItem>;
}

/**
 * Create a note
 */
export async function createNote(
  name: string,
  content: string,
  parentId?: string
): Promise<NoteItem> {
  const note: Omit<NoteItem, 'id' | 'createdAt' | 'updatedAt'> = {
    type: 'note',
    name,
    content,
    parentId,
    order: 0,
    userId: await getCurrentUserId(),
    children: [],
    format: 'markdown'
  };
  
  return createContentItem(note, parentId) as Promise<NoteItem>;
} 