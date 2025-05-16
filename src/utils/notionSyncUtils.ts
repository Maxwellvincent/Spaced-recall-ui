import { NotionSyncOptions, SyncRecord, SyncResult } from '@/types/sync';
import { Subject, Topic, Concept } from '@/types/study';
import { getNotionClientForUser, createNotionPage, getNotionPageContent, getNotionDatabaseContent } from '@/utils/notionClient';
import { createContentHash, determineSyncStatus, resolveConflict, updateSyncRecord, getSyncRecords } from '@/utils/syncUtils';
import { Client } from '@notionhq/client';
import { initializeFirebaseAdmin } from '@/lib/firebaseAdmin';
import { doc, updateDoc } from 'firebase/firestore';

// Push a subject to Notion
export async function pushSubjectToNotion(
  subject: Subject,
  options: NotionSyncOptions,
  userId: string
): Promise<SyncRecord> {
  const notionClient = await getNotionClientForUser(userId);
  
  if (!notionClient) {
    throw new Error('Notion client not available');
  }
  
  // Get existing sync record if available
  const syncRecords = await getSyncRecords(userId, 'notion');
  const existingRecord = syncRecords.find(
    record => record.sourceId === subject.id && record.contentType === 'subject'
  );
  
  // Prepare content for Notion
  const children = prepareNotionBlocks(subject, options);
  
  let notionPageId: string;
  let lastModifiedExternal: string;
  
  if (existingRecord?.externalId) {
    // Update existing page
    try {
      // Get current page info
      const pageInfo = await notionClient.pages.retrieve({ 
        page_id: existingRecord.externalId 
      });
      
      lastModifiedExternal = pageInfo.last_edited_time;
      
      // Update page content
      await notionClient.blocks.children.append({
        block_id: existingRecord.externalId,
        children
      });
      
      notionPageId = existingRecord.externalId;
    } catch (error) {
      console.error('Error updating Notion page:', error);
      // If page not found, create a new one
      notionPageId = await createNewNotionPage(subject, children, options, notionClient);
      lastModifiedExternal = new Date().toISOString();
    }
  } else {
    // Create new page
    notionPageId = await createNewNotionPage(subject, children, options, notionClient);
    lastModifiedExternal = new Date().toISOString();
  }
  
  // Create or update sync record
  const currentHash = createContentHash(subject);
  const lastModifiedLocal = subject.updatedAt || new Date().toISOString();
  
  const syncStatus = existingRecord 
    ? determineSyncStatus(lastModifiedLocal, lastModifiedExternal, currentHash, existingRecord.hash)
    : 'local_ahead';
  
  const syncRecord: Omit<SyncRecord, 'id'> = {
    sourceId: subject.id,
    externalId: notionPageId,
    externalSystem: 'notion',
    contentType: 'subject',
    lastSyncedAt: new Date().toISOString(),
    lastModifiedLocal,
    lastModifiedExternal,
    syncStatus,
    userId,
    hash: currentHash
  };
  
  const recordId = await updateSyncRecord(existingRecord ? { ...syncRecord, id: existingRecord.id } : syncRecord);
  
  return {
    ...syncRecord,
    id: recordId
  };
}

// Pull a subject from Notion
export async function pullSubjectFromNotion(
  syncRecord: SyncRecord,
  options: NotionSyncOptions,
  userId: string
): Promise<Subject> {
  const notionClient = await getNotionClientForUser(userId);
  
  if (!notionClient) {
    throw new Error('Notion client not available');
  }
  
  // Get page content from Notion
  const pageContent = await getNotionPageContent(syncRecord.externalId, userId);
  
  // Extract subject structure from Notion content
  const { subject, lastModifiedExternal } = await extractSubjectFromNotion(
    pageContent, 
    syncRecord.externalId,
    userId
  );
  
  // Get current subject from database
  const db = initializeFirebaseAdmin();
  const subjectDoc = await db.collection('subjects').doc(syncRecord.sourceId).get();
  
  if (!subjectDoc.exists) {
    throw new Error('Subject not found in local database');
  }
  
  const localSubject = { id: subjectDoc.id, ...subjectDoc.data() } as Subject;
  
  // Determine sync status
  const localHash = createContentHash(localSubject);
  const lastModifiedLocal = localSubject.updatedAt || new Date().toISOString();
  
  const syncStatus = determineSyncStatus(
    lastModifiedLocal,
    lastModifiedExternal,
    localHash,
    syncRecord.hash
  );
  
  // Resolve conflicts if needed
  let finalSubject: Subject;
  
  if (syncStatus === 'conflict' || syncStatus === 'external_ahead') {
    finalSubject = resolveConflict(
      localSubject,
      subject,
      options.conflictResolution,
      lastModifiedLocal,
      lastModifiedExternal
    );
  } else {
    // If local is ahead or synced, keep local version
    finalSubject = localSubject;
  }
  
  // Update local database if needed
  if (syncStatus === 'conflict' || syncStatus === 'external_ahead') {
    await db.collection('subjects').doc(syncRecord.sourceId).update({
      ...finalSubject,
      updatedAt: new Date().toISOString()
    });
  }
  
  // Update sync record
  const newHash = createContentHash(finalSubject);
  await updateSyncRecord({
    ...syncRecord,
    hash: newHash,
    lastModifiedLocal: new Date().toISOString(),
    lastModifiedExternal,
    syncStatus: 'synced'
  });
  
  return finalSubject;
}

// Helper function to create a new Notion page
async function createNewNotionPage(
  subject: Subject,
  children: any[],
  options: NotionSyncOptions,
  notionClient: Client
): Promise<string> {
  if (options.targetDatabase) {
    // Create in database
    const properties: Record<string, any> = {
      Name: {
        title: [
          {
            text: {
              content: subject.name,
            },
          },
        ],
      },
      Description: {
        rich_text: [
          {
            text: {
              content: subject.description || '',
            },
          },
        ],
      },
    };
    
    if (options.includeProgress) {
      properties['Progress'] = {
        number: subject.progress?.averageMastery || 0,
      };
    }
    
    const response = await notionClient.pages.create({
      parent: {
        database_id: options.targetDatabase,
      },
      properties,
      children
    });
    
    return response.id;
  } else if (options.targetPage) {
    // Create as child page
    const response = await notionClient.pages.create({
      parent: {
        page_id: options.targetPage,
      },
      properties: {
        title: [
          {
            text: {
              content: subject.name,
            },
          },
        ],
      },
      children
    });
    
    return response.id;
  } else {
    // Create as workspace page
    const response = await notionClient.pages.create({
      parent: {
        workspace: true,
      },
      properties: {
        title: [
          {
            text: {
              content: subject.name,
            },
          },
        ],
      },
      children
    });
    
    return response.id;
  }
}

// Helper function to prepare Notion blocks from subject
function prepareNotionBlocks(subject: Subject, options: NotionSyncOptions): any[] {
  const children = [
    {
      object: 'block',
      type: 'heading_1',
      heading_1: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: subject.name,
            },
          },
        ],
      },
    },
    {
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: subject.description || '',
            },
          },
        ],
      },
    },
  ];
  
  // Add topics
  for (const topic of subject.topics) {
    // Add topic heading
    children.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: topic.name,
            },
          },
        ],
      },
    });
    
    // Add topic description
    children.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: topic.description || '',
            },
          },
        ],
      },
    });
    
    // Add progress if requested
    if (options.includeProgress) {
      children.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: `Mastery: ${topic.masteryLevel || 0}%`,
              },
            },
          ],
        },
      });
    }
    
    // Add concepts
    for (const concept of topic.coreConcepts || []) {
      // Add concept heading
      children.push({
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: concept.name,
              },
            },
          ],
        },
      });
      
      // Add concept content
      children.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: concept.content || '',
              },
            },
          ],
        },
      });
      
      // Add mastery if including progress
      if (options.includeProgress) {
        children.push({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: `Mastery: ${concept.mastery || 0}%`,
                },
              },
            ],
          },
        });
      }
      
      // Add spaced repetition info if requested
      if (options.includeSpacedRepetitionInfo && concept.lastReviewed) {
        children.push({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: `Last Reviewed: ${concept.lastReviewed}`,
                },
              },
            ],
          },
        });
        
        if (concept.nextReview) {
          children.push({
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: `Next Review: ${concept.nextReview}`,
                  },
                },
              ],
            },
          });
        }
      }
    }
  }
  
  return children;
}

// Helper function to extract subject from Notion content
async function extractSubjectFromNotion(
  pageContent: any[],
  pageId: string,
  userId: string
): Promise<{ subject: Subject, lastModifiedExternal: string }> {
  const notionClient = await getNotionClientForUser(userId);
  
  if (!notionClient) {
    throw new Error('Notion client not available');
  }
  
  // Get page info
  const pageInfo = await notionClient.pages.retrieve({ page_id: pageId });
  const lastModifiedExternal = pageInfo.last_edited_time;
  
  // Extract text content from blocks
  const textBlocks = pageContent.filter((block: any) => 
    block.type === 'paragraph' || 
    block.type === 'heading_1' || 
    block.type === 'heading_2' || 
    block.type === 'heading_3'
  );
  
  // Extract subject name from first heading_1 or page title
  let subjectName = '';
  const heading1Block = textBlocks.find((block: any) => block.type === 'heading_1');
  
  if (heading1Block) {
    subjectName = heading1Block.heading_1.rich_text[0]?.plain_text || '';
  } else {
    // Try to get from page title
    const title = pageInfo.properties?.title?.title?.[0]?.plain_text;
    subjectName = title || 'Imported from Notion';
  }
  
  // Extract description from first paragraph after heading_1
  let description = '';
  const firstParaIndex = textBlocks.findIndex((block: any) => block.type === 'paragraph');
  
  if (firstParaIndex >= 0) {
    description = textBlocks[firstParaIndex].paragraph.rich_text
      .map((t: any) => t.plain_text)
      .join('');
  }
  
  // Group blocks by headings to form topics
  const topics: Topic[] = [];
  let currentTopic: Partial<Topic> | null = null;
  let currentConcept: Partial<Concept> | null = null;
  
  for (const block of textBlocks) {
    if (block.type === 'heading_2') {
      // Start a new topic
      if (currentTopic) {
        topics.push(currentTopic as Topic);
      }
      
      const topicName = block.heading_2.rich_text[0]?.plain_text || 'Untitled Topic';
      
      currentTopic = {
        name: topicName,
        description: '',
        coreConcepts: [],
        masteryLevel: 0,
        xp: 0
      };
      currentConcept = null;
    } else if (block.type === 'heading_3' && currentTopic) {
      // Add a concept to the current topic
      const conceptName = block.heading_3.rich_text[0]?.plain_text || 'Untitled Concept';
      
      currentConcept = {
        name: conceptName,
        content: '',
        mastery: 0
      };
      
      currentTopic.coreConcepts = [...(currentTopic.coreConcepts || []), currentConcept as Concept];
    } else if (block.type === 'paragraph') {
      // Add content to the last concept or to the topic description
      const text = block.paragraph.rich_text.map((t: any) => t.plain_text).join('');
      
      if (currentConcept) {
        currentConcept.content = (currentConcept.content || '') + text + '\n\n';
      } else if (currentTopic) {
        currentTopic.description = (currentTopic.description || '') + text + '\n\n';
      } else if (!description) {
        description = text;
      }
    }
  }
  
  // Add the last topic if it exists
  if (currentTopic) {
    topics.push(currentTopic as Topic);
  }
  
  // Ensure each topic has at least one concept
  for (const topic of topics) {
    if (!topic.coreConcepts || topic.coreConcepts.length === 0) {
      topic.coreConcepts = [{
        name: `${topic.name} Concept`,
        content: topic.description || '',
        mastery: 0
      }];
    }
  }
  
  const subject: Subject = {
    id: '', // Will be set by caller
    name: subjectName,
    description,
    topics,
    progress: {
      totalXP: 0,
      averageMastery: 0,
      completedTopics: 0,
      totalTopics: topics.length
    },
    masteryPath: {
      currentLevel: 1,
      nextLevel: 2,
      progress: 0
    },
    xp: 0,
    level: 1,
    totalStudyTime: 0,
    sessions: [],
    status: 'active',
    userId
  };
  
  return { subject, lastModifiedExternal };
}

// Main sync function for Notion
export async function syncWithNotion(
  subjectId: string,
  options: NotionSyncOptions,
  userId: string
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    syncedItems: 0,
    conflicts: 0,
    errors: [],
    updatedRecords: []
  };
  
  try {
    // Get existing sync records
    const syncRecords = await getSyncRecords(userId, 'notion');
    const subjectRecord = syncRecords.find(
      record => record.sourceId === subjectId && record.contentType === 'subject'
    );
    
    if (options.direction === 'push' || options.direction === 'both') {
      // Get subject from database
      const db = initializeFirebaseAdmin();
      const subjectDoc = await db.collection('subjects').doc(subjectId).get();
      
      if (!subjectDoc.exists) {
        throw new Error('Subject not found');
      }
      
      const subject = { id: subjectDoc.id, ...subjectDoc.data() } as Subject;
      
      // Push to Notion
      const syncRecord = await pushSubjectToNotion(subject, options, userId);
      result.updatedRecords.push(syncRecord);
      result.syncedItems++;
      
      if (syncRecord.syncStatus === 'conflict') {
        result.conflicts++;
      }
    }
    
    if (options.direction === 'pull' || options.direction === 'both') {
      // Only pull if we have a sync record
      if (subjectRecord) {
        // Pull from Notion
        await pullSubjectFromNotion(subjectRecord, options, userId);
        result.syncedItems++;
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error syncing with Notion:', error);
    result.success = false;
    result.errors.push(error.message);
    return result;
  }
} 