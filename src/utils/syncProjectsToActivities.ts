import { getFirebaseDb } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";

function cleanFirestoreData(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(cleanFirestoreData);
  } else if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== undefined && typeof v !== 'function' && v !== null && v !== NaN)
        .map(([k, v]) => [k, cleanFirestoreData(v)])
    );
  }
  return obj;
}

/**
 * Syncs a project from the projects collection to the activities collection
 * @param userId The user ID
 * @param projectId The project ID from the projects collection
 */
export async function syncProjectToActivities(userId: string, projectId: string): Promise<string> {
  const db = getFirebaseDb();
  
  try {
    // Get the project from the projects collection
    const projectRef = doc(db, "projects", projectId);
    
    try {
      const projectDoc = await getDoc(projectRef);
      
      if (!projectDoc.exists()) {
        throw new Error("Project not found");
      }
      
      const projectData = projectDoc.data();
      
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
          
          // Clean milestones
          if (projectData.tasks && Array.isArray(projectData.tasks)) {
            activityData.milestones = projectData.tasks.map(task => cleanFirestoreData({
              id: task.id || uuidv4(),
              name: task.title || "Untitled Task",
              description: "",
              completed: !!task.completed,
              completedAt: task.completed ? new Date().toISOString() : undefined,
            }));
          }
          // Log raw and cleaned activityData before writing
          const cleanedActivityData = cleanFirestoreData(activityData);
          // Try writing to Firestore and log error if it fails
          try {
            await setDoc(doc(db, "activities", activityId), cleanedActivityData);
          } catch (err) {
            throw err;
          }
        } else {
          // Update existing activity
          const activityDoc = snapshot.docs[0];
          activityId = activityDoc.id;
          
          // Update basic fields
          await setDoc(doc(db, "activities", activityId), {
            ...activityDoc.data(),
            name: projectData.name || activityDoc.data().name,
            description: projectData.description || activityDoc.data().description || "",
            status: projectData.status || activityDoc.data().status,
            progress: projectData.progress || activityDoc.data().progress || 0,
            // Don't overwrite xp, completedCount, streak, etc.
          }, { merge: true });
          
          // Update milestones based on tasks
          if (projectData.tasks && Array.isArray(projectData.tasks)) {
            const milestones = projectData.tasks.map(task => cleanFirestoreData({
              id: task.id || uuidv4(),
              name: task.title || "Untitled Task",
              description: "",
              completed: !!task.completed,
              completedAt: task.completed ? new Date().toISOString() : undefined,
            }));
            
            await setDoc(doc(db, "activities", activityId), {
              milestones: cleanFirestoreData(milestones)
            }, { merge: true });
          }
        }
        
        return activityId;
      } catch (queryError) {
        throw queryError;
      }
    } catch (getDocError) {
      throw getDocError;
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Deletes a project from the activities collection when deleted from projects
 */
export async function deleteProjectFromActivities(userId: string, projectId: string): Promise<boolean> {
  const db = getFirebaseDb();
  try {
    // Find all activities with this sourceProjectId
    const activitiesRef = collection(db, "activities");
    const q = query(
      activitiesRef, 
      where("userId", "==", userId),
      where("sourceProjectId", "==", projectId)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      // Delete all matching activities
      const deletePromises = snapshot.docs.map((activityDoc) =>
        deleteDoc(doc(db, "activities", activityDoc.id))
      );
      await Promise.all(deletePromises);
    }
    return true;
  } catch (error) {
    throw error;
  }
} 