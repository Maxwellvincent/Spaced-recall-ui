import { NextResponse } from 'next/server';
import { getNotionDatabaseContent, getNotionPageContent } from '@/utils/notionClient';
import { NotionImportOptions } from '@/types/notion';
import { SubjectStructure } from '@/types/subject';
import { initializeFirebaseAdmin } from '@/lib/firebaseAdmin';
import { getAuth } from 'firebase-admin/auth';
import { cookies, headers } from 'next/headers';
import { FieldValue } from 'firebase-admin/firestore';

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
    const options: NotionImportOptions = await request.json();
    
    // Validate required fields
    if (!options.sourceId) {
      return NextResponse.json({ error: 'Source ID is required' }, { status: 400 });
    }
    
    if (!options.sourceType) {
      return NextResponse.json({ error: 'Source type is required' }, { status: 400 });
    }
    
    // Import from Notion based on source type
    let subjectStructure: SubjectStructure;
    
    if (options.sourceType === 'database') {
      // Import from database
      const databaseContent = await getNotionDatabaseContent(options.sourceId, userId);
      
      // Map database rows to subject structure
      // This is a simplified implementation
      // In a real app, you'd need more sophisticated mapping logic based on options.mappings
      
      const topics = databaseContent.map((row: any) => {
        const topicName = row.properties[options.mappings.topicField || 'Name']?.title?.[0]?.plain_text || 'Untitled Topic';
        const topicDescription = row.properties[options.mappings.contentField || 'Description']?.rich_text?.[0]?.plain_text || '';
        
        return {
          name: topicName,
          description: topicDescription,
          coreConcepts: [
            {
              name: `${topicName} Concept`,
              content: topicDescription,
              mastery: 0,
            }
          ],
          estimatedStudyHours: 1,
        };
      });
      
      subjectStructure = {
        name: `Notion Import: ${new Date().toLocaleDateString()}`,
        description: 'Subject imported from Notion database',
        topics,
      };
    } else {
      // Import from page
      const pageContent = await getNotionPageContent(options.sourceId, userId);
      
      // Extract text content from blocks
      const textBlocks = pageContent.filter((block: any) => 
        block.type === 'paragraph' || 
        block.type === 'heading_1' || 
        block.type === 'heading_2' || 
        block.type === 'heading_3'
      );
      
      // Group blocks by headings to form topics
      const topics = [];
      let currentTopic = null;
      
      for (const block of textBlocks) {
        if (block.type === 'heading_1' || block.type === 'heading_2') {
          // Start a new topic
          if (currentTopic) {
            topics.push(currentTopic);
          }
          
          const topicName = block[block.type].rich_text[0]?.plain_text || 'Untitled Topic';
          
          currentTopic = {
            name: topicName,
            description: `Topic imported from Notion: ${topicName}`,
            coreConcepts: [],
            estimatedStudyHours: 1,
          };
        } else if (block.type === 'heading_3' && currentTopic) {
          // Add a concept to the current topic
          const conceptName = block.heading_3.rich_text[0]?.plain_text || 'Untitled Concept';
          
          currentTopic.coreConcepts.push({
            name: conceptName,
            content: '',
            mastery: 0,
          });
        } else if (block.type === 'paragraph' && currentTopic) {
          // Add content to the last concept or to the topic description
          const text = block.paragraph.rich_text.map((t: any) => t.plain_text).join('');
          
          if (currentTopic.coreConcepts.length > 0) {
            const lastConcept = currentTopic.coreConcepts[currentTopic.coreConcepts.length - 1];
            lastConcept.content += text + '\n\n';
          } else {
            currentTopic.description += text + '\n\n';
          }
        }
      }
      
      // Add the last topic if it exists
      if (currentTopic) {
        topics.push(currentTopic);
      }
      
      // Ensure each topic has at least one concept
      for (const topic of topics) {
        if (topic.coreConcepts.length === 0) {
          topic.coreConcepts.push({
            name: `${topic.name} Concept`,
            content: topic.description,
            mastery: 0,
          });
        }
      }
      
      subjectStructure = {
        name: `Notion Import: ${new Date().toLocaleDateString()}`,
        description: 'Subject imported from Notion page',
        topics,
      };
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
        type: 'notion',
        sourceId: options.sourceId,
        sourceType: options.sourceType,
      },
    };
    
    // Save to Firestore
    const db = initializeFirebaseAdmin();
    const docRef = await db.collection('subjects').add(subjectDoc);
    
    return NextResponse.json({ id: docRef.id });
  } catch (error) {
    console.error('Error importing from Notion:', error);
    return NextResponse.json({ error: 'Failed to import from Notion' }, { status: 500 });
  }
} 