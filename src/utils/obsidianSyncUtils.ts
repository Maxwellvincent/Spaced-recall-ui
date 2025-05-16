import { ObsidianSyncOptions, SyncRecord, SyncResult } from '@/types/sync';
import { Subject, Topic, Concept } from '@/types/study';
import { createMarkdownFile, parseMarkdownFile, scanDirectory, extractStructureFromFolders } from '@/utils/obsidianClient';
import { createContentHash, determineSyncStatus, resolveConflict, updateSyncRecord, getSyncRecords } from '@/utils/syncUtils';
import { initializeFirebaseAdmin } from '@/lib/firebaseAdmin';
import { doc, updateDoc } from 'firebase/firestore';
import path from 'path';
import fs from 'fs';
import matter from 'gray-matter';
import archiver from 'archiver';

// Push a subject to Obsidian
export async function pushSubjectToObsidian(
  subject: Subject,
  options: ObsidianSyncOptions,
  userId: string
): Promise<{
  syncRecord: SyncRecord;
  zipBuffer: Buffer;
}> {
  // Get existing sync record if available
  const syncRecords = await getSyncRecords(userId, 'obsidian');
  const existingRecord = syncRecords.find(
    record => record.sourceId === subject.id && record.contentType === 'subject'
  );
  
  // Create a temporary directory for export
  const tempDir = path.join(process.cwd(), 'temp', `obsidian-export-${userId}-${Date.now()}`);
  const subjectDir = path.join(tempDir, subject.name);
  
  if (!fs.existsSync(subjectDir)) {
    fs.mkdirSync(subjectDir, { recursive: true });
  }
  
  // Create index file
  const indexPath = path.join(subjectDir, 'index.md');
  const indexContent = `# ${subject.name}\n\n${subject.description}\n\n`;
  const indexFrontmatter = {
    subject: subject.name,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    tags: ['subject', 'spaced-recall'],
    sync_id: subject.id
  };
  
  if (options.includeProgress) {
    indexFrontmatter['progress'] = subject.progress || { averageMastery: 0 };
  }
  
  createMarkdownFile(indexPath, indexContent, indexFrontmatter);
  
  // Create topic files
  for (const topic of subject.topics) {
    // Create topic directory
    const topicDir = path.join(subjectDir, topic.name);
    
    if (!fs.existsSync(topicDir)) {
      fs.mkdirSync(topicDir, { recursive: true });
    }
    
    // Create topic index file
    const topicPath = path.join(topicDir, 'index.md');
    const topicContent = `# ${topic.name}\n\n${topic.description}\n\n`;
    const topicFrontmatter = {
      subject: subject.name,
      topic: topic.name,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      tags: ['topic', 'spaced-recall'],
      sync_id: `${subject.id}_${topic.name}`
    };
    
    if (options.includeProgress) {
      topicFrontmatter['progress'] = topic.progress || { mastery: topic.masteryLevel || 0 };
    }
    
    createMarkdownFile(topicPath, topicContent, topicFrontmatter);
    
    // Create concept files
    for (const concept of topic.coreConcepts || []) {
      const conceptPath = path.join(topicDir, `${concept.name.replace(/[/\\?%*:|"<>]/g, '-')}.md`);
      const conceptContent = `# ${concept.name}\n\n${concept.content || ''}\n\n`;
      const conceptFrontmatter = {
        subject: subject.name,
        topic: topic.name,
        concept: concept.name,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        tags: ['concept', 'spaced-recall'],
        sync_id: `${subject.id}_${topic.name}_${concept.name}`
      };
      
      if (options.includeProgress) {
        conceptFrontmatter['mastery'] = concept.mastery || 0;
      }
      
      if (options.includeSpacedRepetitionInfo && concept.lastReviewed) {
        conceptFrontmatter['sr-due'] = concept.nextReview || new Date().toISOString();
        conceptFrontmatter['sr-interval'] = concept.interval || 1;
        conceptFrontmatter['sr-ease'] = concept.ease || 2.5;
      }
      
      createMarkdownFile(conceptPath, conceptContent, conceptFrontmatter);
    }
  }
  
  // Create a zip file
  const zipPath = path.join(tempDir, `${subject.name.replace(/[/\\?%*:|"<>]/g, '-')}.zip`);
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', {
    zlib: { level: 9 }, // Maximum compression
  });
  
  // Pipe archive data to the output file
  archive.pipe(output);
  
  // Add the files to the archive
  archive.directory(subjectDir, subject.name);
  
  // Finalize the archive
  await archive.finalize();
  
  // Read the zip file
  const zipBuffer = fs.readFileSync(zipPath);
  
  // Create or update sync record
  const currentHash = createContentHash(subject);
  const lastModifiedLocal = subject.updatedAt || new Date().toISOString();
  const lastModifiedExternal = new Date().toISOString();
  
  const syncStatus = existingRecord 
    ? determineSyncStatus(lastModifiedLocal, existingRecord.lastModifiedExternal, currentHash, existingRecord.hash)
    : 'local_ahead';
  
  const syncRecord: Omit<SyncRecord, 'id'> = {
    sourceId: subject.id,
    externalId: `obsidian_${subject.id}`,
    externalSystem: 'obsidian',
    externalPath: options.vaultPath,
    contentType: 'subject',
    lastSyncedAt: new Date().toISOString(),
    lastModifiedLocal,
    lastModifiedExternal,
    syncStatus,
    userId,
    hash: currentHash
  };
  
  const recordId = await updateSyncRecord(existingRecord ? { ...syncRecord, id: existingRecord.id } : syncRecord);
  
  // Clean up temporary directory
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (error) {
    console.error('Error cleaning up temporary directory:', error);
  }
  
  return {
    syncRecord: {
      ...syncRecord,
      id: recordId
    },
    zipBuffer
  };
}

// Pull a subject from Obsidian
export async function pullSubjectFromObsidian(
  uploadedFiles: File[],
  syncRecord: SyncRecord,
  options: ObsidianSyncOptions,
  userId: string
): Promise<Subject> {
  // Create a temporary directory to store the uploaded files
  const tempDir = path.join(process.cwd(), 'temp', `obsidian-import-${userId}-${Date.now()}`);
  
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  // Save the uploaded files to the temporary directory
  for (const file of uploadedFiles) {
    const filePath = path.join(tempDir, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Create subdirectories if needed
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    fs.writeFileSync(filePath, buffer);
  }
  
  // Scan the directory
  const folder = scanDirectory(tempDir, true);
  
  // Extract subject structure based on the specified structure type
  const subjectStructure = extractStructureFromFolders(folder);
  
  // Get current subject from database
  const db = initializeFirebaseAdmin();
  const subjectDoc = await db.collection('subjects').doc(syncRecord.sourceId).get();
  
  if (!subjectDoc.exists) {
    throw new Error('Subject not found in local database');
  }
  
  const localSubject = { id: subjectDoc.id, ...subjectDoc.data() } as Subject;
  
  // Determine sync status
  const lastModifiedExternal = new Date().toISOString(); // Use current time as we don't have a reliable way to get last modified from Obsidian
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
      {
        ...subjectStructure,
        id: localSubject.id,
        userId,
        status: localSubject.status,
        masteryPath: localSubject.masteryPath,
        xp: localSubject.xp,
        level: localSubject.level,
        totalStudyTime: localSubject.totalStudyTime,
        sessions: localSubject.sessions
      },
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
  
  // Clean up temporary directory
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (error) {
    console.error('Error cleaning up temporary directory:', error);
  }
  
  return finalSubject;
}

// Main sync function for Obsidian
export async function syncWithObsidian(
  subjectId: string,
  options: ObsidianSyncOptions,
  userId: string,
  uploadedFiles?: File[]
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
    const syncRecords = await getSyncRecords(userId, 'obsidian');
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
      
      // Push to Obsidian
      const { syncRecord } = await pushSubjectToObsidian(subject, options, userId);
      result.updatedRecords.push(syncRecord);
      result.syncedItems++;
      
      if (syncRecord.syncStatus === 'conflict') {
        result.conflicts++;
      }
    }
    
    if ((options.direction === 'pull' || options.direction === 'both') && uploadedFiles && uploadedFiles.length > 0) {
      // Only pull if we have a sync record and uploaded files
      if (subjectRecord) {
        // Pull from Obsidian
        await pullSubjectFromObsidian(uploadedFiles, subjectRecord, options, userId);
        result.syncedItems++;
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error syncing with Obsidian:', error);
    result.success = false;
    result.errors.push(error.message);
    return result;
  }
} 