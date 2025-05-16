import { SyncRecord, SyncOptions, SyncResult } from '@/types/sync';
import { Subject, Topic, Concept } from '@/types/study';
import { initializeFirebaseAdmin } from '@/lib/firebaseAdmin';
import { getFirebaseDb } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { createHash } from 'crypto';

// Create a content hash to detect changes
export function createContentHash(content: any): string {
  const stringContent = JSON.stringify(content);
  return createHash('md5').update(stringContent).digest('hex');
}

// Get sync records for a user
export async function getSyncRecords(userId: string, externalSystem?: 'notion' | 'obsidian'): Promise<SyncRecord[]> {
  const db = getFirebaseDb();
  let q = query(
    collection(db, 'syncRecords'),
    where('userId', '==', userId)
  );
  
  if (externalSystem) {
    q = query(q, where('externalSystem', '==', externalSystem));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SyncRecord));
}

// Create or update a sync record
export async function updateSyncRecord(record: Omit<SyncRecord, 'id'> & { id?: string }): Promise<string> {
  const db = getFirebaseDb();
  const recordId = record.id || `sync_${record.sourceId}_${record.externalSystem}`;
  
  await setDoc(doc(db, 'syncRecords', recordId), {
    ...record,
    lastSyncedAt: new Date().toISOString()
  }, { merge: true });
  
  return recordId;
}

// Compare local and external content to determine sync status
export function determineSyncStatus(
  localModified: string,
  externalModified: string,
  localHash: string,
  recordHash: string
): 'synced' | 'conflict' | 'local_ahead' | 'external_ahead' {
  const localDate = new Date(localModified).getTime();
  const externalDate = new Date(externalModified).getTime();
  
  if (localHash === recordHash) {
    return 'synced';
  }
  
  if (Math.abs(localDate - externalDate) < 60000) { // Within 1 minute
    return 'conflict';
  }
  
  return localDate > externalDate ? 'local_ahead' : 'external_ahead';
}

// Resolve conflicts based on sync options
export function resolveConflict(
  local: any, 
  external: any, 
  resolution: 'local' | 'external' | 'manual' | 'newest',
  localModified: string,
  externalModified: string
): any {
  switch (resolution) {
    case 'local':
      return local;
    case 'external':
      return external;
    case 'newest':
      return new Date(localModified).getTime() > new Date(externalModified).getTime() 
        ? local 
        : external;
    case 'manual':
      // In a real implementation, you would store the conflict and let the user resolve it
      // For now, we'll default to the local version
      return local;
  }
}

// Track changes to subjects, topics, and concepts
export async function trackChanges(
  subjectId: string, 
  userId: string
): Promise<{
  subject: Subject;
  changed: boolean;
  hash: string;
}> {
  const db = getFirebaseDb();
  const subjectRef = doc(db, 'subjects', subjectId);
  const subjectDoc = await getDoc(subjectRef);
  
  if (!subjectDoc.exists()) {
    throw new Error('Subject not found');
  }
  
  const subject = { id: subjectDoc.id, ...subjectDoc.data() } as Subject;
  
  if (subject.userId !== userId) {
    throw new Error('Unauthorized access to subject');
  }
  
  // Get the latest sync record for this subject
  const syncRecords = await getSyncRecords(userId);
  const subjectSyncRecord = syncRecords.find(
    record => record.sourceId === subjectId && record.contentType === 'subject'
  );
  
  const currentHash = createContentHash(subject);
  const changed = !subjectSyncRecord || subjectSyncRecord.hash !== currentHash;
  
  return {
    subject,
    changed,
    hash: currentHash
  };
} 