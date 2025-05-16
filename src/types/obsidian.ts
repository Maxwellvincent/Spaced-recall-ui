export interface ObsidianVault {
  name: string;
  path: string;
  userId: string; // Firebase user ID
  createdAt: Date;
  updatedAt: Date;
}

export interface ObsidianFile {
  name: string;
  path: string;
  content: string;
  tags: string[];
  createdTime: string;
  modifiedTime: string;
}

export interface ObsidianFolder {
  name: string;
  path: string;
  files: ObsidianFile[];
  subfolders: ObsidianFolder[];
}

export interface ObsidianImportOptions {
  sourcePath: string;
  recursive: boolean;
  filePattern: string;
  structureType: 'folders' | 'tags' | 'frontmatter';
  mappings: {
    subjectField?: string;
    topicField?: string;
    conceptField?: string;
  };
}

export interface ObsidianExportOptions {
  targetPath: string;
  subjectId: string;
  format: 'markdown' | 'canvas';
  includeProgress: boolean;
  includeSpacedRepetitionInfo: boolean;
} 