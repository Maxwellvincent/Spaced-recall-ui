// Script to sync existing projects to activities using Admin SDK
const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Initialize Firebase Admin SDK
const serviceAccount = require(path.resolve(__dirname, '../../service-account.json'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// Sync project to activities function
async function syncProjectToActivities(userId, projectId) {
  try {
    // Get the project from the projects collection
    const projectRef = db.collection('projects').doc(projectId);
    const projectDoc = await projectRef.get();
    if (!projectDoc.exists) {
      throw new Error('Project not found');
    }
    const projectData = projectDoc.data();
    // Check if this project already exists in activities collection
    const activitiesRef = db.collection('activities');
    const q = activitiesRef
      .where('userId', '==', userId)
      .where('sourceProjectId', '==', projectId);
    const snapshot = await q.get();
    let activityId;
    if (snapshot.empty) {
      // Create a new activity for this project
      activityId = uuidv4();
      const activityData = {
        id: activityId,
        type: 'project',
        name: projectData.name,
        description: projectData.description || '',
        status: projectData.status,
        priority: projectData.priority || 'medium',
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
          description: '',
          completed: task.completed,
          ...(task.completed ? { completedAt: new Date().toISOString() } : {})
        }));
      }
      // Save to activities collection
      await db.collection('activities').doc(activityId).set(activityData);
    } else {
      // Update existing activity
      const activityDoc = snapshot.docs[0];
      activityId = activityDoc.id;
      const existingData = activityDoc.data();
      // Update basic fields
      await db.collection('activities').doc(activityId).set({
        ...existingData,
        name: projectData.name,
        description: projectData.description || '',
        status: projectData.status,
        progress: projectData.progress || 0,
        priority: projectData.priority || existingData.priority || 'medium',
      }, { merge: true });
      // Update milestones based on tasks
      if (projectData.tasks && Array.isArray(projectData.tasks)) {
        const milestones = projectData.tasks.map(task => ({
          id: task.id,
          name: task.title,
          description: '',
          completed: task.completed,
          ...(task.completed ? { completedAt: new Date().toISOString() } : {})
        }));
        await db.collection('activities').doc(activityId).set({ milestones }, { merge: true });
      }
    }
    return activityId;
  } catch (error) {
    throw error;
  }
}

async function syncAllProjects() {
  try {
    // Get all projects
    const projectsSnapshot = await db.collection('projects').get();
    const allProjects = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
          throw error;
        }
      }
    }
  } catch (error) {
    throw error;
  }
}

// Run the sync function
syncAllProjects().then(() => {
  process.exit(0);
}).catch(error => {
  process.exit(1);
}); 