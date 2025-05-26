import { db } from './firebase';
if (typeof window !== "undefined") {
  console.log("Firestore project ID (client):", db.app.options.projectId);
}
import { collection, getDocs, query, where, doc, setDoc } from 'firebase/firestore';
import type { Domain } from '@/types/domain';
import type { Subject } from '@/types/subject';
import type { Topic } from '@/types/topic';
import type { LearningPathway } from '@/types/learningPathway';
import type { UserPathway } from '@/types/userPathway';

// Get all pathways
export async function getLearningPathways(): Promise<LearningPathway[]> {
  const snap = await getDocs(collection(db, 'pathways'));
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as LearningPathway));
}

// Get all subjects for a pathway
export async function getSubjectsByPathway(pathwayId: string): Promise<Subject[]> {
  const snap = await getDocs(collection(db, 'pathways', pathwayId, 'subjects'));
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject));
}

// Get all topics for a subject
export async function getTopicsBySubject(subjectId: string): Promise<Topic[]> {
  const q = query(collection(db, 'topics'), where('subjectId', '==', subjectId));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Topic));
}

// Get subtopics for a topic
export async function getSubtopics(parentTopicId: string): Promise<Topic[]> {
  const q = query(collection(db, 'topics'), where('parentTopicId', '==', parentTopicId));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Topic));
}

// Join a pathway (enroll user)
export async function joinPathway(userId: string, pathwayId: string) {
  const ref = doc(db, 'users', userId, 'userPathways', pathwayId);
  await setDoc(ref, {
    pathwayId,
    userId,
    joinedAt: new Date().toISOString(),
    progress: 0,
  });
}

// Get all pathways a user has joined
export async function getUserPathways(userId: string): Promise<UserPathway[]> {
  const snap = await getDocs(collection(db, 'users', userId, 'userPathways'));
  return snap.docs.map(doc => ({ ...doc.data(), pathwayId: doc.id } as UserPathway));
} 