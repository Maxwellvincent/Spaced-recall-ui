export interface NotionConnection {
  accessToken: string;
  workspaceId: string;
  workspaceName: string;
  botId: string;
  userId: string; // Firebase user ID
  createdAt: Date;
  updatedAt: Date;
}

export interface NotionPage {
  id: string;
  title: string;
  url: string;
  createdTime: string;
  lastEditedTime: string;
  parent: {
    type: string;
    database_id?: string;
    page_id?: string;
  };
}

export interface NotionDatabase {
  id: string;
  title: string;
  url: string;
  createdTime: string;
  lastEditedTime: string;
  properties: Record<string, any>;
}

export interface NotionImportOptions {
  sourceType: 'database' | 'page';
  sourceId: string;
  mappings: {
    subjectField?: string;
    topicField?: string;
    conceptField?: string;
    contentField?: string;
  };
}

export interface NotionExportOptions {
  targetType: 'database' | 'page';
  targetId?: string; // If not provided, create new
  subjectId: string;
  includeProgress: boolean;
} 