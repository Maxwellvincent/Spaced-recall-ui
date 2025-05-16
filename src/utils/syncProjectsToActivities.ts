import { getFirebaseDb } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";

/**
 * Syncs a project from the projects collection to the activities collection
 * @param userId The user ID
 * @param projectId The project ID from the projects collection
 */
export async function syncProjectToActivities(userId: string, projectId: string): Promise<string> {
  const db = getFirebaseDb();
  
  try {
    console.log(`Starting sync for project ${projectId} for user ${userId}`);
    
    // Get the project from the projects collection
    const projectRef = doc(db, "projects", projectId);
    
    try {
      const projectDoc = await getDoc(projectRef);
      
      if (!projectDoc.exists()) {
        console.error(`Project ${projectId} not found in Firestore`);
        throw new Error("Project not found");
      }
      
      const projectData = projectDoc.data();
      console.log(`Retrieved project data: ${JSON.stringify({
        name: projectData.name,
        status: projectData.status,
        tasksCount: projectData.tasks?.length || 0
      })}`);
      
      // Check if this project already exists in activities collection
      const activitiesRef = collection(db, "activities");
      
      try {
        const q = query(
          activitiesRef, 
          where("userId", "==", userId),
          where("sourceProjectId", "==", projectId)
        );
        
        const snapshot = await getDocs(q);
        let activityId: string;
        
        if (snapshot.empty) {
          console.log(`No existing activity found for project ${projectId}, creating new one`);
          // Create a new activity for this project
          activityId = uuidv4();
          
          const activityData = {
            id: activityId,
            type: "project",
            name: projectData.name,
            description: projectData.description || "",
            status: projectData.status || "planning",
            priority: "medium", // Default priority
            progress: projectData.progress || 0,
            userId: userId,
            createdAt: projectData.createdAt || new Date().toISOString(),
            xp: 0,
            completedCount: 0,
            streak: 0,
            sourceProjectId: projectId, // Reference to the original project
            todos: [], // Activities has its own todo structure
            milestones: [], // Convert tasks to milestones
          };
          
          // Convert project tasks to milestones if they exist
          if (projectData.tasks && Array.isArray(projectData.tasks)) {
            console.log(`Converting ${projectData.tasks.length} tasks to milestones`);
            activityData.milestones = projectData.tasks.map(task => ({
              id: task.id || uuidv4(),
              name: task.title || "Untitled Task",
              description: "",
              completed: !!task.completed,
              completedAt: task.completed ? new Date().toISOString() : undefined,
            }));
          }
          
          try {
            // Save to activities collection
            await setDoc(doc(db, "activities", activityId), activityData);
            console.log(`Successfully created activity ${activityId} for project ${projectId}`);
          } catch (setDocError) {
            console.error(`Error saving activity document: ${setDocError.message}`, setDocError);
            throw setDocError;
          }
        } else {
          // Update existing activity
          const activityDoc = snapshot.docs[0];
          activityId = activityDoc.id;
          
          console.log(`Found existing activity ${activityId} for project ${projectId}, updating`);
          const existingData = activityDoc.data();
          
          try {
            // Update basic fields
            await setDoc(doc(db, "activities", activityId), {
              ...existingData,
              name: projectData.name || existingData.name,
              description: projectData.description || existingData.description || "",
              status: projectData.status || existingData.status,
              progress: projectData.progress || existingData.progress || 0,
              // Don't overwrite xp, completedCount, streak, etc.
            }, { merge: true });
            
            // Update milestones based on tasks
            if (projectData.tasks && Array.isArray(projectData.tasks)) {
              console.log(`Updating ${projectData.tasks.length} milestones for activity ${activityId}`);
              const milestones = projectData.tasks.map(task => ({
                id: task.id || uuidv4(),
                name: task.title || "Untitled Task",
                description: "",
                completed: !!task.completed,
                completedAt: task.completed ? new Date().toISOString() : undefined,
              }));
              
              await setDoc(doc(db, "activities", activityId), {
                milestones
              }, { merge: true });
            }
            
            console.log(`Successfully updated activity ${activityId}`);
          } catch (updateError) {
            console.error(`Error updating activity document: ${updateError.message}`, updateError);
            throw updateError;
          }
        }
        
        return activityId;
      } catch (queryError) {
        console.error(`Error querying activities collection: ${queryError.message}`, queryError);
        throw queryError;
      }
    } catch (getDocError) {
      console.error(`Error getting project document: ${getDocError.message}`, getDocError);
      throw getDocError;
    }
  } catch (error) {
    console.error(`Error in syncProjectToActivities: ${error.message}`, error);
    throw error;
  }
}

/**
 * Deletes a project from the activities collection when deleted from projects
 */
export async function deleteProjectFromActivities(userId: string, projectId: string): Promise<boolean> {
  const db = getFirebaseDb();
  
  try {
    console.log(`Starting delete for project ${projectId} from activities for user ${userId}`);
    
    // Find the activity with this sourceProjectId
    const activitiesRef = collection(db, "activities");
    
    try {
      const q = query(
        activitiesRef, 
        where("userId", "==", userId),
        where("sourceProjectId", "==", projectId)
      );
      
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const activityDoc = snapshot.docs[0];
        const activityId = activityDoc.id;
        
        console.log(`Found activity ${activityId} to delete`);
        
        try {
          await deleteDoc(doc(db, "activities", activityId));
          console.log(`Successfully deleted activity ${activityId}`);
        } catch (deleteError) {
          console.error(`Error deleting activity document: ${deleteError.message}`, deleteError);
          throw deleteError;
        }
      } else {
        console.log(`No activity found for project ${projectId}, nothing to delete`);
      }
      
      return true;
    } catch (queryError) {
      console.error(`Error querying activities collection: ${queryError.message}`, queryError);
      throw queryError;
    }
  } catch (error) {
    console.error(`Error in deleteProjectFromActivities: ${error.message}`, error);
    throw error;
  }
} 