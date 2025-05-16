import { ObsidianFile, ObsidianFolder, ObsidianVault, ObsidianConnection } from '@/types/obsidian';
import { initializeFirebaseAdmin } from '@/lib/firebaseAdmin';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

// Since Obsidian is a desktop app, we'll use a combination of:
// 1. Local file system access (for users who export/import files)
// 2. Firebase storage for cloud sync
// 3. Markdown parsing for content extraction

// Save an Obsidian connection to Firestore
export const saveObsidianConnection = async (connection: Omit<ObsidianConnection, 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    // Use API route instead of direct Firebase Admin access
    const response = await fetch('/api/obsidian/save-connection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(connection),
    });
    
    if (!response.ok) {
      throw new Error('Failed to save Obsidian connection');
    }
    
    const data = await response.json();
    return data.id;
  } catch (error) {
    console.error('Error saving Obsidian connection:', error);
    throw error;
  }
};

// Get an Obsidian connection for a user
export const getObsidianConnectionForUser = async (userId: string): Promise<ObsidianConnection | null> => {
  try {
    // Use API route instead of direct Firebase Admin access
    const response = await fetch(`/api/obsidian/get-connection?userId=${userId}`);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data.connection;
  } catch (error) {
    console.error('Error getting Obsidian connection for user:', error);
    return null;
  }
};

// Parse Markdown content with frontmatter
export const parseMarkdownFile = (filePath: string): ObsidianFile => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const { data, content: markdownContent } = matter(content);
    
    const stats = fs.statSync(filePath);
    
    return {
      name: path.basename(filePath),
      path: filePath,
      content: markdownContent,
      tags: data.tags || [],
      createdTime: stats.birthtime.toISOString(),
      modifiedTime: stats.mtime.toISOString(),
    };
  } catch (error) {
    console.error(`Error parsing markdown file ${filePath}:`, error);
    throw error;
  }
};

// Scan a directory for markdown files
export const scanDirectory = (dirPath: string, recursive = true): ObsidianFolder => {
  try {
    const folderName = path.basename(dirPath);
    const files: ObsidianFile[] = [];
    const subfolders: ObsidianFolder[] = [];
    
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory() && recursive) {
        subfolders.push(scanDirectory(itemPath, recursive));
      } else if (stats.isFile() && item.endsWith('.md')) {
        files.push(parseMarkdownFile(itemPath));
      }
    }
    
    return {
      name: folderName,
      path: dirPath,
      files,
      subfolders,
    };
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error);
    throw error;
  }
};

// Extract structure from Obsidian vault based on folders
export const extractStructureFromFolders = (folder: ObsidianFolder): any => {
  // This is a simplified implementation
  // In a real app, you'd need more sophisticated parsing logic
  
  const subject = {
    name: folder.name,
    description: `Imported from Obsidian vault: ${folder.name}`,
    topics: folder.subfolders.map(subfolder => ({
      name: subfolder.name,
      description: `Topic imported from Obsidian folder: ${subfolder.name}`,
      coreConcepts: subfolder.files.map(file => ({
        name: file.name.replace('.md', ''),
        content: file.content,
        mastery: 0,
      })),
      estimatedStudyHours: Math.ceil(subfolder.files.length / 2), // Rough estimate
    })),
  };
  
  return subject;
};

// Extract structure from Obsidian vault based on tags
export const extractStructureFromTags = (files: ObsidianFile[]): any => {
  // Group files by tags
  const tagGroups: Record<string, ObsidianFile[]> = {};
  
  for (const file of files) {
    for (const tag of file.tags) {
      if (!tagGroups[tag]) {
        tagGroups[tag] = [];
      }
      tagGroups[tag].push(file);
    }
  }
  
  // Convert tag groups to subject structure
  const topics = Object.entries(tagGroups).map(([tag, tagFiles]) => ({
    name: tag.replace('#', ''),
    description: `Topic generated from tag: ${tag}`,
    coreConcepts: tagFiles.map(file => ({
      name: file.name.replace('.md', ''),
      content: file.content,
      mastery: 0,
    })),
    estimatedStudyHours: Math.ceil(tagFiles.length / 2), // Rough estimate
  }));
  
  return {
    name: 'Obsidian Import',
    description: 'Subject imported from Obsidian vault based on tags',
    topics,
  };
};

// Create markdown file
export const createMarkdownFile = (filePath: string, content: string, frontmatter: Record<string, any> = {}): void => {
  try {
    const fileContent = matter.stringify(content, frontmatter);
    
    // Ensure directory exists
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    fs.writeFileSync(filePath, fileContent);
  } catch (error) {
    console.error(`Error creating markdown file ${filePath}:`, error);
    throw error;
  }
}; 