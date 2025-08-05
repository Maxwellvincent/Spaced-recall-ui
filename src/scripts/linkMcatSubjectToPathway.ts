import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, updateDoc, doc, arrayUnion, getDoc, setDoc } from 'firebase/firestore';

// --- CONFIGURE THIS ---
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const mcatSubjectId = 'cdvFdHpvHOha7SZuOCLS'; // Provided MCAT subject ID
const mcatPathwayId = 'mcat'; // Pathway document ID

async function main() {
  if (!getApps().length) {
    initializeApp(firebaseConfig);
  }
  const db = getFirestore();

  const pathwayRef = doc(db, 'pathways', mcatPathwayId);
  const pathwaySnap = await getDoc(pathwayRef);
  if (!pathwaySnap.exists()) {
    console.error('No pathway document with ID "mcat" found.');
    process.exit(1);
  }
  const pathwayData = pathwaySnap.data();

  // If subjectIds is missing or not an array, set it as an array
  if (!Array.isArray(pathwayData.subjectIds)) {
    await updateDoc(pathwayRef, { subjectIds: [] });
    console.log('Initialized subjectIds as an empty array.');
  }

  // Now add the MCAT subject ID
  await updateDoc(pathwayRef, {
    subjectIds: arrayUnion(mcatSubjectId),
  });
  console.log('Linked MCAT subject to MCAT pathway (by ID)!');
}

main().catch(err => {
  console.error('Error linking MCAT subject to pathway:', err);
  process.exit(1);
}); 