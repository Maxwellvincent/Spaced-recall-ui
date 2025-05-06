import { getFirebaseDb } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Subject, Topic } from '@/types';

// Use getFirebaseDb() to ensure proper initialization
const db = getFirebaseDb();

export async function migrateSubject(subjectId: string) {
  try {
    // Get the subject document
    const subjectRef = doc(db, 'subjects', subjectId);
    const subjectDoc = await getDoc(subjectRef);

    if (!subjectDoc.exists()) {
      throw new Error('Subject not found');
    }

    const subjectData = subjectDoc.data() as Subject;

    // Initialize subject-level fields if they don't exist
    const updatedSubject = {
      ...subjectData,
      xp: subjectData.xp || 0,
      level: subjectData.level || 1,
      totalStudyTime: subjectData.totalStudyTime || 0,
      sessions: subjectData.sessions || [],
      masteryPath: {
        currentLevel: subjectData.masteryPath?.currentLevel || 1,
        nextLevel: subjectData.masteryPath?.nextLevel || 2,
        progress: subjectData.masteryPath?.progress || 0
      }
    };

    // Update each topic with proper field initialization
    updatedSubject.topics = (subjectData.topics || []).map((topic: Topic) => ({
      ...topic,
      masteryLevel: topic.masteryLevel || 0,
      xp: topic.xp || 0,
      level: topic.level || 1,
      lastStudied: topic.lastStudied || new Date().toISOString(),
      totalStudyTime: topic.totalStudyTime || 0,
      currentPhase: topic.currentPhase || 'initial',
      studySessions: topic.studySessions || [],
      activities: topic.activities || [],
      concepts: topic.concepts || [],
      examScore: topic.examScore || 0,
      weakAreas: topic.weakAreas || [],
      framework: {
        progress: {
          learnRecall: topic.framework?.progress?.learnRecall || 0,
          testingEffect: topic.framework?.progress?.testingEffect || 0,
          reflectionDiagnosis: topic.framework?.progress?.reflectionDiagnosis || 0,
          integration: topic.framework?.progress?.integration || 0,
          teaching: topic.framework?.progress?.teaching || 0
        }
      }
    }));

    // Calculate actual totals from study sessions
    let totalXP = 0;
    let totalStudyTime = 0;

    updatedSubject.topics.forEach((topic: Topic) => {
      // Sum up XP from study sessions
      const topicXP = topic.studySessions?.reduce((sum, session) => sum + (session.xpGained || 0), 0) || 0;
      topic.xp = topicXP;
      totalXP += topicXP;

      // Sum up study time from study sessions
      const topicStudyTime = topic.studySessions?.reduce((sum, session) => sum + (session.duration || 0), 0) || 0;
      topic.totalStudyTime = topicStudyTime;
      totalStudyTime += topicStudyTime;
    });

    // Update subject totals
    updatedSubject.xp = totalXP;
    updatedSubject.totalStudyTime = totalStudyTime;

    // Update the subject in Firestore
    await updateDoc(subjectRef, updatedSubject);

    return {
      success: true,
      message: 'Subject migration completed successfully',
      data: updatedSubject
    };
  } catch (error) {
    console.error('Error migrating subject:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to migrate subject',
      error
    };
  }
} 