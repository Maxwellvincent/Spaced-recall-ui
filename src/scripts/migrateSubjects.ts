import { initializeApp } from 'firebase/app';
import { getFirebaseAuth } from '@/lib/firebase';
import { getFirestore, collection, getDocs, updateDoc, doc, addDoc, setDoc } from 'firebase/firestore';
import type { Subject } from '../types/study';
import * as readline from 'readline';

const firebaseConfig = {
  apiKey: "AIzaSyBHeQv1dm5yZh4tlmkDTznQqcO9cgsDwIk",
  authDomain: "spacedrecallapp-e142c.firebaseapp.com",
  projectId: "spacedrecallapp-e142c",
  storageBucket: "spacedrecallapp-e142c.firebasestorage.app",
  messagingSenderId: "1034168752304",
  appId: "1:1034168752304:web:363d6db135bc02aa4b0375"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getFirebaseAuth();
const db = getFirestore(app);

interface SubjectWithId extends Subject {
  id: string;
  userId?: string;
}

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

async function migrateSubjects() {
  try {
    // First sign in
    console.log('Signing in...');
    const email = process.env.FIREBASE_ADMIN_EMAIL || await askQuestion('Enter admin email: ');
    const password = process.env.FIREBASE_ADMIN_PASSWORD || await askQuestion('Enter admin password: ');
    
    await signInWithEmailAndPassword(auth, email, password);
    console.log('Successfully signed in');

    // Get all users
    console.log('Fetching users...');
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    let totalSubjects = 0;
    let successCount = 0;
    let errorCount = 0;

    // Process each user
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;

      // Check if user has subjects in their document
      if (userData.subjects && Array.isArray(userData.subjects)) {
        console.log(`Found ${userData.subjects.length} subjects for user ${userId}`);
        totalSubjects += userData.subjects.length;

        // Migrate each subject to the root subjects collection
        for (const subject of userData.subjects) {
          try {
            // Create new subject document with userId
            const newSubject = {
              ...subject,
              userId: userId,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };

            // Add to root subjects collection
            const docRef = await addDoc(collection(db, 'subjects'), newSubject);
            console.log(`Successfully migrated subject ${subject.name} (${docRef.id}) for user ${userId}`);
            successCount++;

          } catch (error) {
            console.error(`Error migrating subject ${subject.name}:`, error);
            errorCount++;
          }
        }
      }
    }

    console.log('\nMigration Summary:');
    console.log(`Total subjects found: ${totalSubjects}`);
    console.log(`Successfully migrated: ${successCount}`);
    console.log(`Errors encountered: ${errorCount}`);

  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Execute the migration
migrateSubjects().then(() => {
  console.log('Migration completed');
  process.exit(0);
}).catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
}); 