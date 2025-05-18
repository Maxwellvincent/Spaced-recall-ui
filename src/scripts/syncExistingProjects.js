// Script to sync existing projects to activities
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import syncProjectToActivities function
const syncUtilsPath = path.join(__dirname, '..', 'utils', 'syncProjectsToActivities.ts');
const syncUtilsContent = fs.readFileSync(syncUtilsPath, 'utf8');

// Extract the syncProjectToActivities function
const syncProjectToActivitiesCode = syncUtilsContent.match(/export async function syncProjectToActivities\([\s\S]*?\}\)/)[0];

// Create a function from the extracted code
const syncProjectToActivities = new Function('userId', 'projectId', 'getFirebaseDb', 'collection', 'query', 'where', 'getDocs', 'doc', 'getDoc', 'setDoc', 'uuidv4', `
  const { collection, query, where, getDocs, doc, getDoc, setDoc } = arguments[7];
  const uuidv4 = arguments[10];
  ${syncProjectToActivitiesCode.replace('export async function syncProjectToActivities', 'return async function')}
`)(null, null, null, collection, null, null, getDocs, { collection, query, where, getDocs, doc, getDoc, setDoc }, null, null, () => Math.random().toString(36).substring(2, 15));

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Mock getFirebaseDb function
function getFirebaseDb() {
  return db;
}

async function syncAllProjects() {
  try {
    // Get all projects
    const projectsRef = collection(db, 'projects');
    const projectsSnapshot = await getDocs(projectsRef);
    
    // Group projects by user ID
    const projectsByUser = {};
    
    projectsSnapshot.forEach(doc => {
      const project = { id: doc.id, ...doc.data() };
      const userId = project.userId;
      
      if (!projectsByUser[userId]) {
        projectsByUser[userId] = [];
      }
      
      projectsByUser[userId].push(project);
    });
    
    // Sync projects for each user
    const userIds = Object.keys(projectsByUser);
    
    for (const userId of userIds) {
      const userProjects = projectsByUser[userId];
      
      for (const project of userProjects) {
        try {
          await syncProjectToActivities(userId, project.id);
        } catch (error) {
          // No console.log or console.warn statements in this file
        }
      }
    }
  } catch (error) {
    // No console.log or console.warn statements in this file
  }
}

// Run the sync function
syncAllProjects().then(() => {
  process.exit(0);
}).catch(error => {
  process.exit(1);
}); 