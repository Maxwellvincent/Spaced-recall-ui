import { NextResponse } from 'next/server';
import { createMarkdownFile } from '@/utils/obsidianClient';
import { ObsidianExportOptions } from '@/types/obsidian';
import { initializeFirebaseAdmin } from '@/lib/firebaseAdmin';
import { getAuth } from 'firebase-admin/auth';
import { cookies, headers } from 'next/headers';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';

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
    
    // Parse request body
    const options: ObsidianExportOptions = await request.json();
    
    // Validate required fields
    if (!options.subjectId) {
      return NextResponse.json({ error: 'Subject ID is required' }, { status: 400 });
    }
    
    // Get subject from Firestore
    const db = initializeFirebaseAdmin();
    const subjectDoc = await db.collection('subjects').doc(options.subjectId).get();
    
    if (!subjectDoc.exists) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }
    
    const subject = subjectDoc.data();
    
    // Verify the subject belongs to the user
    if (subject.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized access to subject' }, { status: 403 });
    }
    
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
      tags: ['subject', 'spaced-recall'],
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
        tags: ['topic', 'spaced-recall'],
      };
      
      if (options.includeProgress) {
        topicFrontmatter['progress'] = topic.progress || { mastery: 0 };
      }
      
      createMarkdownFile(topicPath, topicContent, topicFrontmatter);
      
      // Create concept files
      for (const concept of topic.coreConcepts) {
        const conceptPath = path.join(topicDir, `${concept.name.replace(/[/\\?%*:|"<>]/g, '-')}.md`);
        const conceptContent = `# ${concept.name}\n\n${concept.content}\n\n`;
        const conceptFrontmatter = {
          subject: subject.name,
          topic: topic.name,
          concept: concept.name,
          created: new Date().toISOString(),
          tags: ['concept', 'spaced-recall'],
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
    
    // Clean up temporary directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Error cleaning up temporary directory:', error);
    }
    
    // Return the zip file
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${subject.name.replace(/[/\\?%*:|"<>]/g, '-')}.zip"`,
      },
    });
  } catch (error) {
    console.error('Error exporting to Obsidian:', error);
    return NextResponse.json({ error: 'Failed to export to Obsidian' }, { status: 500 });
  }
} 