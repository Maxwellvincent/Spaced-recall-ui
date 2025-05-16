import { NextResponse } from 'next/server';
import { createNotionPage } from '@/utils/notionClient';
import { NotionExportOptions } from '@/types/notion';
import { initializeFirebaseAdmin } from '@/lib/firebaseAdmin';
import { getAuth } from 'firebase-admin/auth';
import { cookies, headers } from 'next/headers';

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
    const options: NotionExportOptions = await request.json();
    
    // Validate required fields
    if (!options.subjectId) {
      return NextResponse.json({ error: 'Subject ID is required' }, { status: 400 });
    }
    
    if (!options.targetType) {
      return NextResponse.json({ error: 'Target type is required' }, { status: 400 });
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
    
    // Export to Notion based on target type
    let notionPageId;
    
    if (options.targetType === 'database' && options.targetId) {
      // Export to existing database
      // Create a page for each topic
      const topicPages = [];
      
      for (const topic of subject.topics) {
        // Prepare properties for database entry
        const properties: Record<string, any> = {
          Name: {
            title: [
              {
                text: {
                  content: topic.name,
                },
              },
            ],
          },
          Description: {
            rich_text: [
              {
                text: {
                  content: topic.description,
                },
              },
            ],
          },
        };
        
        // Add mastery if including progress
        if (options.includeProgress) {
          const topicProgress = topic.progress || { mastery: 0 };
          properties['Mastery'] = {
            number: topicProgress.mastery || 0,
          };
        }
        
        // Create the page in the database
        const pageId = await createNotionPage(
          options.targetId,
          'database_id',
          properties,
          undefined,
          userId
        );
        
        topicPages.push(pageId);
      }
      
      notionPageId = topicPages[0]; // Return the first page ID
    } else {
      // Export to a new page or existing page
      // Create a hierarchical page structure
      
      // Prepare children blocks
      const children = [
        {
          object: 'block',
          type: 'heading_1',
          heading_1: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: subject.name,
                },
              },
            ],
          },
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: subject.description,
                },
              },
            ],
          },
        },
      ];
      
      // Add topics
      for (const topic of subject.topics) {
        // Add topic heading
        children.push({
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: topic.name,
                },
              },
            ],
          },
        });
        
        // Add topic description
        children.push({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              {
                type: 'text',
                text: {
                  content: topic.description,
                },
              },
            ],
          },
        });
        
        // Add progress if requested
        if (options.includeProgress) {
          const topicProgress = topic.progress || { mastery: 0 };
          children.push({
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: `Mastery: ${topicProgress.mastery || 0}%`,
                  },
                },
              ],
            },
          });
        }
        
        // Add concepts
        for (const concept of topic.coreConcepts) {
          // Add concept heading
          children.push({
            object: 'block',
            type: 'heading_3',
            heading_3: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: concept.name,
                  },
                },
              ],
            },
          });
          
          // Add concept content
          children.push({
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: concept.content,
                  },
                },
              ],
            },
          });
          
          // Add mastery if including progress
          if (options.includeProgress) {
            children.push({
              object: 'block',
              type: 'paragraph',
              paragraph: {
                rich_text: [
                  {
                    type: 'text',
                    text: {
                      content: `Mastery: ${concept.mastery || 0}%`,
                    },
                  },
                ],
              },
            });
          }
        }
      }
      
      // Create the page
      if (options.targetId) {
        // Add as child page to existing page
        notionPageId = await createNotionPage(
          options.targetId,
          'page_id',
          {
            title: [
              {
                text: {
                  content: subject.name,
                },
              },
            ],
          },
          children,
          userId
        );
      } else {
        // Create as a top-level page
        notionPageId = await createNotionPage(
          '',
          'page_id',
          {
            title: [
              {
                text: {
                  content: subject.name,
                },
              },
            ],
          },
          children,
          userId
        );
      }
    }
    
    return NextResponse.json({ pageId: notionPageId });
  } catch (error) {
    console.error('Error exporting to Notion:', error);
    return NextResponse.json({ error: 'Failed to export to Notion' }, { status: 500 });
  }
} 