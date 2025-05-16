import { Client } from '@notionhq/client';
import { NotionConnection, NotionDatabase, NotionPage } from '@/types/notion';

// Create a Notion client with the provided access token
export const createNotionClient = (accessToken: string): Client => {
  return new Client({ auth: accessToken });
};

// Create a Notion client using the app's internal integration
export const createAppNotionClient = (): Client => {
  return new Client({ auth: process.env.NOTION_API_KEY || '' });
};

// Get a Notion client for a specific user
export const getNotionClientForUser = async (userId: string): Promise<Client | null> => {
  try {
    // Use API route instead of direct Firebase Admin access
    const response = await fetch(`/api/notion/get-client?userId=${userId}`);
    
    if (!response.ok) {
      // Fall back to app-level integration if available
      if (process.env.NEXT_PUBLIC_NOTION_API_KEY) {
        return createAppNotionClient();
      }
      return null;
    }
    
    const data = await response.json();
    if (!data.accessToken) {
      // Fall back to app-level integration if available
      if (process.env.NEXT_PUBLIC_NOTION_API_KEY) {
        return createAppNotionClient();
      }
      return null;
    }
    
    return createNotionClient(data.accessToken);
  } catch (error) {
    console.error('Error getting Notion client for user:', error);
    // Fall back to app-level integration if available
    if (process.env.NEXT_PUBLIC_NOTION_API_KEY) {
      return createAppNotionClient();
    }
    return null;
  }
};

// Save a Notion connection to Firestore
export const saveNotionConnection = async (connection: Omit<NotionConnection, 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    // Use API route instead of direct Firebase Admin access
    const response = await fetch('/api/notion/save-connection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(connection),
    });
    
    if (!response.ok) {
      throw new Error('Failed to save Notion connection');
    }
    
    const data = await response.json();
    return data.id;
  } catch (error) {
    console.error('Error saving Notion connection:', error);
    throw error;
  }
};

// List databases the user has access to
export const listNotionDatabases = async (userId?: string): Promise<NotionDatabase[]> => {
  try {
    let client: Client;
    
    if (userId) {
      const userClient = await getNotionClientForUser(userId);
      if (!userClient) {
        throw new Error('No Notion client available for user');
      }
      client = userClient;
    } else {
      client = createAppNotionClient();
    }
    
    const response = await client.search({
      filter: {
        property: 'object',
        value: 'database',
      },
    });
    
    return response.results.map((db: any) => ({
      id: db.id,
      title: db.title[0]?.plain_text || 'Untitled',
      url: db.url,
      createdTime: db.created_time,
      lastEditedTime: db.last_edited_time,
      properties: db.properties,
    }));
  } catch (error) {
    console.error('Error listing Notion databases:', error);
    throw error;
  }
};

// List pages the user has access to
export const listNotionPages = async (userId?: string): Promise<NotionPage[]> => {
  try {
    let client: Client;
    
    if (userId) {
      const userClient = await getNotionClientForUser(userId);
      if (!userClient) {
        throw new Error('No Notion client available for user');
      }
      client = userClient;
    } else {
      client = createAppNotionClient();
    }
    
    const response = await client.search({
      filter: {
        property: 'object',
        value: 'page',
      },
    });
    
    return response.results.map((page: any) => ({
      id: page.id,
      title: page.properties?.title?.title[0]?.plain_text || 'Untitled',
      url: page.url,
      createdTime: page.created_time,
      lastEditedTime: page.last_edited_time,
      parent: page.parent,
    }));
  } catch (error) {
    console.error('Error listing Notion pages:', error);
    throw error;
  }
};

// Get database content
export const getNotionDatabaseContent = async (databaseId: string, userId?: string): Promise<any[]> => {
  try {
    let client: Client;
    
    if (userId) {
      const userClient = await getNotionClientForUser(userId);
      if (!userClient) {
        throw new Error('No Notion client available for user');
      }
      client = userClient;
    } else {
      client = createAppNotionClient();
    }
    
    const response = await client.databases.query({
      database_id: databaseId,
    });
    
    return response.results;
  } catch (error) {
    console.error('Error getting Notion database content:', error);
    throw error;
  }
};

// Get page content
export const getNotionPageContent = async (pageId: string, userId?: string): Promise<any> => {
  try {
    let client: Client;
    
    if (userId) {
      const userClient = await getNotionClientForUser(userId);
      if (!userClient) {
        throw new Error('No Notion client available for user');
      }
      client = userClient;
    } else {
      client = createAppNotionClient();
    }
    
    const response = await client.blocks.children.list({
      block_id: pageId,
    });
    
    return response.results;
  } catch (error) {
    console.error('Error getting Notion page content:', error);
    throw error;
  }
};

// Create a new page in Notion
export const createNotionPage = async (
  parentId: string, 
  parentType: 'database_id' | 'page_id',
  properties: Record<string, any>,
  children?: any[],
  userId?: string
): Promise<string> => {
  try {
    let client: Client;
    
    if (userId) {
      const userClient = await getNotionClientForUser(userId);
      if (!userClient) {
        throw new Error('No Notion client available for user');
      }
      client = userClient;
    } else {
      client = createAppNotionClient();
    }
    
    const response = await client.pages.create({
      parent: {
        [parentType]: parentId,
      },
      properties,
      children: children || [],
    });
    
    return response.id;
  } catch (error) {
    console.error('Error creating Notion page:', error);
    throw error;
  }
};

// Update a page in Notion
export const updateNotionPage = async (
  pageId: string,
  properties: Record<string, any>,
  userId?: string
): Promise<void> => {
  try {
    let client: Client;
    
    if (userId) {
      const userClient = await getNotionClientForUser(userId);
      if (!userClient) {
        throw new Error('No Notion client available for user');
      }
      client = userClient;
    } else {
      client = createAppNotionClient();
    }
    
    await client.pages.update({
      page_id: pageId,
      properties,
    });
  } catch (error) {
    console.error('Error updating Notion page:', error);
    throw error;
  }
}; 