import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    : require('../../service-account.json');
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

// Helper: Recursively migrate topics and subtopics
async function migrateTopic({
  topic,
  subjectId,
  domainId,
  parentTopicId = null,
  topicCountRef,
}: {
  topic: any;
  subjectId: string;
  domainId: string;
  parentTopicId?: string | null;
  topicCountRef: { count: number };
}) {
  const topicId = `${subjectId}__${parentTopicId ? parentTopicId + '__' : ''}${topic.name.toLowerCase().replace(/\s+/g, '-')}`;
  const topicRef = db.collection('topics').doc(topicId);
  await topicRef.set({
    ...topic,
    subjectId,
    domainId,
    parentTopicId,
    createdAt: new Date().toISOString(),
  });
  topicCountRef.count++;
  console.log(`Migrated topic: ${topic.name} (ID: ${topicId})`);
  // Recursively migrate subtopics
  if (Array.isArray(topic.subtopics)) {
    for (const subtopic of topic.subtopics) {
      await migrateTopic({ topic: subtopic, subjectId, domainId, parentTopicId: topicId, topicCountRef });
    }
  }
}

async function migrate() {
  console.log('Starting migration...');

  // 1. Read all subjects
  const subjectsSnap = await db.collection('subjects').get();
  const subjects = subjectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  console.log(`Found ${subjects.length} subjects.`);

  let domainCount = 0;
  let topicCountRef = { count: 0 };

  for (const subject of subjects) {
    // 2. Determine domain
    const domainName = (subject as any).domain || (subject as any).domainName || 'General';
    const domainId = domainName.toLowerCase().replace(/\s+/g, '-');
    const domainRef = db.collection('domains').doc(domainId);
    const domainDoc = await domainRef.get();
    if (!domainDoc.exists) {
      await domainRef.set({
        name: domainName,
        createdAt: new Date().toISOString(),
        subjects: [subject.id],
      });
      domainCount++;
      console.log(`Created domain: ${domainName}`);
    } else {
      // Add subject to domain's subjects array if not present
      const domainData = domainDoc.data() as any;
      if (domainData && Array.isArray(domainData.subjects) && !domainData.subjects.includes(subject.id)) {
        await domainRef.update({
          subjects: [...domainData.subjects, subject.id],
        });
        console.log(`Added subject ${subject.id} to domain ${domainName}`);
      } else if (domainData && !domainData.subjects) {
        await domainRef.update({
          subjects: [subject.id],
        });
        console.log(`Initialized subjects array for domain ${domainName}`);
      }
    }

    // 3. Recursively migrate topics and subtopics
    const subjectTopics = (subject as any).topics;
    if (Array.isArray(subjectTopics)) {
      for (const topic of subjectTopics) {
        await migrateTopic({ topic, subjectId: subject.id, domainId, parentTopicId: null, topicCountRef });
      }
    }
  }

  console.log(`Migration complete. Created/updated ${domainCount} domains and ${topicCountRef.count} topics (including subtopics).`);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});