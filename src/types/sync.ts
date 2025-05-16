export interface SyncRecord {
  id: string;
  sourceId: string;          // ID in the source system (our app)
  externalId: string;        // ID in the external system (Notion/Obsidian)
  externalSystem: 'notion' | 'obsidian';
  externalPath?: string;     // For Obsidian file paths
  contentType: 'subject' | 'topic' | 'concept';
  lastSyncedAt: string;      // ISO date string
  lastModifiedLocal: string; // Last modified in our app
  lastModifiedExternal: string; // Last modified in external system
  syncStatus: 'synced' | 'conflict' | 'local_ahead' | 'external_ahead';
  userId: string;
  hash: string;              // Content hash to detect changes
}

export interface SyncOptions {
  direction: 'push' | 'pull' | 'both';
  conflictResolution: 'local' | 'external' | 'manual' | 'newest';
  includeProgress: boolean;
  includeSpacedRepetitionInfo: boolean;
  syncSubjects: boolean;
  syncTopics: boolean;
  syncConcepts: boolean;
}

export interface NotionSyncOptions extends SyncOptions {
  workspaceId: string;
  targetDatabase?: string;
  targetPage?: string;
}

export interface ObsidianSyncOptions extends SyncOptions {
  vaultPath: string;
  structureType: 'folders' | 'tags' | 'frontmatter';
}

export interface SyncResult {
  success: boolean;
  syncedItems: number;
  conflicts: number;
  errors: string[];
  updatedRecords: SyncRecord[];
} 