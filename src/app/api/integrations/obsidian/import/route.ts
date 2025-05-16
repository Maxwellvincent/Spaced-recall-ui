import { NextResponse } from 'next/server';
import { scanDirectory, extractStructureFromFolders, extractStructureFromTags } from '@/utils/obsidianClient';
import { ObsidianImportOptions } from '@/types/obsidian';
import { initializeFirebaseAdmin } from '@/lib/firebaseAdmin';
import { getAuth } from 'firebase-admin/auth';
import { cookies, headers } from 'next/headers';
import { FieldValue } from 'firebase-admin/firestore';
import path from 'path';
import fs from 'fs';

export async function POST(request: Request) {
  try {
    // Get user ID from authentication
    const headersList = headers();
    const authHeader = headersList.get('authorization');
    let userId = null;
    
    // Check for auth token
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const idToken = authHeader.split('Bearer ')[1];
      try {
        // Verify the Firebase token
        const auth = getAuth();
        const decodedToken = await auth.verifyIdToken(idToken);
        userId = decodedToken.uid;
      } catch (error) {
        console.error('Error verifying token:', error);
        return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
      }
    } 
    
    // If no auth header, try to get from cookies (for session-based auth)
    if (!userId) {
      const cookieStore = cookies();
      const sessionCookie = cookieStore.get('session');
      
      if (sessionCookie) {
        try {
          const auth = getAuth();
          const decodedCookie = await auth.verifySessionCookie(sessionCookie.value);
          userId = decodedCookie.uid;
        } catch (error) {
          console.error('Error verifying session cookie:', error);
        }
      }
    }
    
    // If we still don't have a user ID, return unauthorized
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body (multipart form data)
    const formData = await request.formData();
    
    // Get the uploaded files
    const files = formData.getAll('files') as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }
    
    // Get import options
    const optionsJson = formData.get('options') as string;
    
    if (!optionsJson) {
      return NextResponse.json({ error: 'Import options are required' }, { status: 400 });
    }
    
    const options: ObsidianImportOptions = JSON.parse(optionsJson);
    
    // Create a temporary directory to store the uploaded files
    const tempDir = path.join(process.cwd(), 'temp', `obsidian-import-${userId}-${Date.now()}`);
    
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Save the uploaded files to the temporary directory
    for (const file of files) {
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
    const folder = scanDirectory(tempDir, options.recursive);
    
    // Extract subject structure based on the specified structure type
    let subjectStructure;
    
    if (options.structureType === 'folders') {
      subjectStructure = extractStructureFromFolders(folder);
    } else if (options.structureType === 'tags') {
      // Flatten the folder structure to get all files
      const allFiles = [];
      
      const collectFiles = (folder) => {
        allFiles.push(...folder.files);
        
        for (const subfolder of folder.subfolders) {
          collectFiles(subfolder);
        }
      };
      
      collectFiles(folder);
      
      subjectStructure = extractStructureFromTags(allFiles);
    } else {
      // Frontmatter-based structure (more complex, simplified implementation)
      subjectStructure = {
        name: 'Obsidian Import',
        description: 'Subject imported from Obsidian vault',
        topics: [],
      };
      
      // Group files by frontmatter field values
      const topicMap = new Map();
      
      const collectFilesByFrontmatter = (folder) => {
        for (const file of folder.files) {
          const topicValue = file.frontmatter?.[options.mappings.topicField] || 'Uncategorized';
          
          if (!topicMap.has(topicValue)) {
            topicMap.set(topicValue, []);
          }
          
          topicMap.get(topicValue).push(file);
        }
        
        for (const subfolder of folder.subfolders) {
          collectFilesByFrontmatter(subfolder);
        }
      };
      
      collectFilesByFrontmatter(folder);
      
      // Convert to topics
      for (const [topicName, files] of topicMap.entries()) {
        const topic = {
          name: topicName,
          description: `Topic imported from Obsidian: ${topicName}`,
          coreConcepts: files.map(file => ({
            name: file.name.replace('.md', ''),
            content: file.content,
            mastery: 0,
          })),
          estimatedStudyHours: Math.ceil(files.length / 2), // Rough estimate
        };
        
        subjectStructure.topics.push(topic);
      }
    }
    
    // Calculate total estimated hours
    const totalEstimatedHours = subjectStructure.topics.reduce(
      (total, topic) => total + (topic.estimatedStudyHours || 0),
      0
    );
    
    // Prepare the subject document
    const subjectDoc = {
      ...subjectStructure,
      userId,
      totalEstimatedHours,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      progress: {
        totalXP: 0,
        averageMastery: 0,
        completedTopics: 0,
        totalTopics: subjectStructure.topics.length,
      },
      source: {
        type: 'obsidian',
      },
    };
    
    // Save to Firestore
    const db = initializeFirebaseAdmin();
    const docRef = await db.collection('subjects').add(subjectDoc);
    
    // Clean up temporary directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Error cleaning up temporary directory:', error);
    }
    
    return NextResponse.json({ id: docRef.id });
  } catch (error) {
    console.error('Error importing from Obsidian:', error);
    return NextResponse.json({ error: 'Failed to import from Obsidian' }, { status: 500 });
  }
} 