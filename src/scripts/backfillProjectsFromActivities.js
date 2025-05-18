// Script to backfill the 'projects' collection from the 'activities' collection for all activities of type 'project'.
const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const serviceAccount = require(path.resolve(__dirname, '../../service-account.json'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

async function backfillProjectsFromActivities() {
  try {
    // Get all activities of type 'project'
    const activitiesSnapshot = await db.collection('activities').where('type', '==', 'project').get();
    for (const doc of activitiesSnapshot.docs) {
      const activity = doc.data();
      // Use sourceProjectId if present, otherwise use activity id
      const projectId = activity.sourceProjectId || activity.id;
      const projectRef = db.collection('projects').doc(projectId);
      const projectDoc = await projectRef.get();
      if (!projectDoc.exists) {
        // Prepare project data
        const projectData = {
          name: activity.name,
          description: activity.description || '',
          status: activity.status || 'planning',
          createdAt: activity.createdAt || new Date().toISOString(),
          userId: activity.userId,
          progress: activity.progress || 0,
          tasks: Array.isArray(activity.milestones) ? activity.milestones.map(m => ({
            id: m.id,
            title: m.name,
            completed: !!m.completed,
            dueDate: m.dueDate || undefined,
            // Add more fields if needed
          })) : [],
          progressMethod: activity.progressMethod || 'manual',
        };
        await projectRef.set(projectData);
        console.log(`Backfilled project: ${projectId}`);
      } else {
        console.log(`Project already exists: ${projectId}`);
      }
    }
    console.log('Backfill complete.');
  } catch (error) {
    console.error('Error during backfill:', error);
  }
}

backfillProjectsFromActivities().then(() => process.exit(0)).catch(() => process.exit(1)); 