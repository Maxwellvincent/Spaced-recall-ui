// Loads environment variables from .env.local for Node.js scripts
import 'dotenv/config';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as serviceAccount from '../service-account.json';

// Initialize Firebase Admin with service account and projectId from env
initializeApp({
  credential: cert(serviceAccount as any),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});

const db = getFirestore();

async function backfillProjectActivities() {
  const projectsSnap = await db.collection('projects').get();
  let count = 0;
  for (const docSnap of projectsSnap.docs) {
    const project = docSnap.data();
    await db.collection('activities').add({
      userId: project.userId,
      date: project.createdAt,
      type: 'project_created',
      detail: `Created project: ${project.name}`,
      projectId: project.id || docSnap.id,
    });
    count++;
  }
  console.log(`Backfilled ${count} project activities.`);
}

async function backfillHabitAndRewardActivities() {
  const actsSnap = await db.collection('activities').get();
  let habitCreated = 0;
  let habitCompleted = 0;
  let rewards = 0;
  for (const docSnap of actsSnap.docs) {
    const act = docSnap.data();
    // Backfill habit_created
    if (act.type === 'habit') {
      await db.collection('activities').add({
        userId: act.userId,
        date: act.createdAt,
        type: 'habit_created',
        detail: `Created habit: ${act.name}`,
        habitId: act.id || docSnap.id,
      });
      habitCreated++;
      // Backfill completions
      if (Array.isArray(act.completionHistory)) {
        for (const entry of act.completionHistory) {
          if (entry.completed && entry.date) {
            await db.collection('activities').add({
              userId: act.userId,
              date: entry.date,
              type: 'habit_completed',
              detail: `Completed habit: ${act.name}`,
              habitId: act.id || docSnap.id,
            });
            habitCompleted++;
          }
        }
      }
      // Backfill rewards for milestones/streaks
      if (Array.isArray(act.milestones)) {
        for (const milestone of act.milestones) {
          await db.collection('activities').add({
            userId: act.userId,
            date: milestone.date || act.createdAt,
            type: 'reward',
            detail: `Milestone achieved: ${milestone.name || milestone}`,
            habitId: act.id || docSnap.id,
            milestone: milestone,
          });
          rewards++;
        }
      }
      if (typeof act.bestStreak === 'number' && act.bestStreak > 0) {
        await db.collection('activities').add({
          userId: act.userId,
          date: act.createdAt,
          type: 'reward',
          detail: `Best streak achieved: ${act.bestStreak}`,
          habitId: act.id || docSnap.id,
          bestStreak: act.bestStreak,
        });
        rewards++;
      }
    }
  }
  console.log(`Backfilled ${habitCreated} habit_created, ${habitCompleted} habit_completed, and ${rewards} reward activities.`);
}

async function main() {
  await backfillProjectActivities();
  await backfillHabitAndRewardActivities();
  console.log('Backfill complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
}); 