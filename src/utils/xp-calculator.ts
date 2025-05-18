import { ProjectWorkItem, WorkItemType, XP_RULES } from '@/types/project';

export function calculatePotentialXP(workItem: Omit<ProjectWorkItem, 'id' | 'createdAt' | 'updatedAt' | 'potentialXP' | 'xpAwarded'>): number {
  const rules = XP_RULES[workItem.type];
  let totalXP = rules.base;

  // Calculate bonus XP based on work item type
  if (workItem.type === 'task' && workItem.priority) {
    totalXP += rules.priority[workItem.priority];
  } else if (workItem.type !== 'task' && workItem.impact) {
    totalXP += XP_RULES[workItem.type].impact[workItem.impact];
    
    // Additional XP for providing technical details
    if (workItem.technicalDetails && workItem.technicalDetails.trim().length > 0) {
      totalXP += XP_RULES[workItem.type].withTechnicalDetails;
    }
  }

  return totalXP;
}

export function calculateCompletionXP(workItem: ProjectWorkItem): number {
  return XP_RULES[workItem.type].completion;
}

export async function updateUserTotalXP(
  userId: string,
  xpToAdd: number,
  firestore: any // You'll need to properly type this based on your Firebase setup
): Promise<void> {
  const userRef = firestore.collection('users').doc(userId);
  
  await firestore.runTransaction(async (transaction: any) => {
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists) {
      throw new Error('User document does not exist!');
    }

    const userData = userDoc.data();
    const newTotalXP = (userData.totalXP || 0) + xpToAdd;

    transaction.update(userRef, {
      totalXP: newTotalXP,
      updatedAt: new Date()
    });
  });
} 