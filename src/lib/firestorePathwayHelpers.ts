import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { Pathway } from '../types/pathway';

export async function getPathwayById(id: string): Promise<Pathway | null> {
  const ref = doc(db, 'pathways', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as Pathway;
}

export async function getAllPathways(): Promise<Pathway[]> {
  const ref = collection(db, 'pathways');
  const snap = await getDocs(ref);
  return snap.docs.map(doc => doc.data() as Pathway);
}

export async function updatePathway(id: string, data: Partial<Pathway>): Promise<void> {
  const ref = doc(db, 'pathways', id);
  await updateDoc(ref, data);
}

export async function addPathway(pathway: Pathway): Promise<void> {
  const ref = doc(db, 'pathways', pathway.id);
  await setDoc(ref, pathway);
}

// --- User Pathway Join/Favorite helpers ---
export async function joinPathway(userId: string, pathwayId: string): Promise<void> {
  const ref = doc(db, 'users', userId, 'userPathways', pathwayId);
  await setDoc(ref, { joinedAt: new Date().toISOString() });
}

export async function unjoinPathway(userId: string, pathwayId: string): Promise<void> {
  const ref = doc(db, 'users', userId, 'userPathways', pathwayId);
  await deleteDoc(ref);
}

export async function getUserJoinedPathways(userId: string): Promise<string[]> {
  if (!userId) throw new Error("getUserJoinedPathways: userId is required");
  const ref = collection(db, 'users', userId, 'userPathways');
  const snap = await getDocs(ref);
  return snap.docs.map(doc => doc.id);
} 