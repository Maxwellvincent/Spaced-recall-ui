// Script to sync existing projects to activities
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, doc, getDoc, setDoc } = require('firebase/firestore');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

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

// Function to get Firebase DB
function getFirebaseDb() {
  return db;
}

// Sync project to activities function
async function syncProjectToActivities(userId, projectId) {
  try {
    // Get the project from the projects collection
    const projectRef = doc(db, "projects", projectId);
    const projectDoc = await getDoc(projectRef);
    
    if (!projectDoc.exists()) {
      throw new Error("Project not found");
    }
    
    const projectData = projectDoc.data();
    
    // Check if this project already exists in activities collection
    const activitiesRef = collection(db, "activities");
    const q = query(
      activitiesRef, 
      where("userId", "==", userId),
      where("sourceProjectId", "==", projectId)
    );
    
    const snapshot = await getDocs(q);
    let activityId;
    
    if (snapshot.empty) {
      // Create a new activity for this project
      activityId = uuidv4();
      
      const activityData = {
        id: activityId,
        type: "project",
        name: projectData.name,
        description: projectData.description || "",
        status: projectData.status,
        priority: "medium", // Default priority
        progress: projectData.progress || 0,
        userId: userId,
        createdAt: projectData.createdAt,
        xp: 0,
        completedCount: 0,
        streak: 0,
        sourceProjectId: projectId, // Reference to the original project
        todos: [], // Activities has its own todo structure
        milestones: [], // Convert tasks to milestones
      };
      
      // Convert project tasks to milestones if they exist
      if (projectData.tasks && Array.isArray(projectData.tasks)) {
        activityData.milestones = projectData.tasks.map(task => ({
          id: task.id,
          name: task.title,
          description: "",
          completed: task.completed,
          completedAt: task.completed ? new Date().toISOString() : undefined,
        }));
      }
      
      // Save to activities collection
      await setDoc(doc(db, "activities", activityId), activityData);
      console.log(`Created new activity ${activityId} for project ${projectId}`);
    } else {
      // Update existing activity
      const activityDoc = snapshot.docs[0];
      activityId = activityDoc.id;
      
      const existingData = activityDoc.data();
      
      // Update basic fields
      await setDoc(doc(db, "activities", activityId), {
        ...existingData,
        name: projectData.name,
        description: projectData.description || "",
        status: projectData.status,
        progress: projectData.progress || 0,
      }, { merge: true });
      
      // Update milestones based on tasks
      if (projectData.tasks && Array.isArray(projectData.tasks)) {
        const milestones = projectData.tasks.map(task => ({
          id: task.id,
          name: task.title,
          description: "",
          completed: task.completed,
          completedAt: task.completed ? new Date().toISOString() : undefined,
        }));
        
        await setDoc(doc(db, "activities", activityId), {
          milestones
        }, { merge: true });
      }
      
      console.log(`Updated existing activity ${activityId} for project ${projectId}`);
    }
    
    return activityId;
  } catch (error) {
    console.error("Error syncing project to activities:", error);
    throw error;
  }
}

async function syncAllProjects() {
  try {
    console.log('Starting to sync all projects to activities...');
    
    // Get all projects
    const projectsRef = collection(db, 'projects');
    const projectsSnapshot = await getDocs(projectsRef);
    
    console.log(`Found ${projectsSnapshot.size} projects to sync`);
    
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
    console.log(`Found ${userIds.length} users with projects`);
    
    for (const userId of userIds) {
      const userProjects = projectsByUser[userId];
      console.log(`Syncing ${userProjects.length} projects for user ${userId}`);
      
      for (const project of userProjects) {
        try {
          await syncProjectToActivities(userId, project.id);
          console.log(`Successfully synced project ${project.id} - ${project.name}`);
        } catch (error) {
          console.error(`Error syncing project ${project.id}:`, error);
        }
      }
    }
    
    console.log('Finished syncing all projects to activities');
  } catch (error) {
    console.error('Error syncing projects:', error);
  }
}

// Run the sync function
syncAllProjects().then(() => {
  console.log('Script completed');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
}); 