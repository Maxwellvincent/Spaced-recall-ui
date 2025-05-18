import { collection, query, where, getDocs } from "firebase/firestore";
import { getLevelFromXP, getProgressToNextLevel } from "@/lib/xpSystem";

const ACTIVITY_XP = {
  CREATE_SUBJECT: { xp: 0 },
  CREATE_TOPIC: { xp: 25 },
  CREATE_CONCEPT: { xp: 15 },
  COMPLETE_QUIZ: { xp: 30 },
};

export async function calculateUserXP(userId, db) {
  let totalXP = 0;
  let activityXP = {};
  let history = [];

  // Subjects
  const subjectsRef = collection(db, "subjects");
  const subjectsQ = query(subjectsRef, where("userId", "==", userId));
  const subjectsSnapshot = await getDocs(subjectsQ);
  subjectsSnapshot.forEach(docSnapshot => {
    const subjectData = docSnapshot.data();
    if (subjectData.xp && typeof subjectData.xp === "number") {
      totalXP += subjectData.xp;
      activityXP["subject study"] = (activityXP["subject study"] || 0) + subjectData.xp;
      if (subjectData.lastStudied) {
        history.push({
          date: subjectData.lastStudied,
          activity: "Subject Study",
          xp: subjectData.xp,
        });
      }
    }
    if (subjectData.quizHistory && Array.isArray(subjectData.quizHistory)) {
      const quizXP = subjectData.quizHistory.length * ACTIVITY_XP.COMPLETE_QUIZ.xp;
      totalXP += quizXP;
      activityXP["quizzes"] = (activityXP["quizzes"] || 0) + quizXP;
      subjectData.quizHistory.forEach((quiz) => {
        if (quiz && quiz.date) {
          history.push({
            date: quiz.date,
            activity: "Quiz Completion",
            xp: ACTIVITY_XP.COMPLETE_QUIZ.xp,
          });
        }
      });
    }
  });

  // Projects
  const projectsRef = collection(db, "projects");
  const projectsQ = query(projectsRef, where("userId", "==", userId));
  const projectsSnapshot = await getDocs(projectsQ);
  projectsSnapshot.forEach(docSnapshot => {
    const projectData = docSnapshot.data();
    if (Array.isArray(projectData.tasks)) {
      const taskXP = projectData.tasks.reduce((sum, t) => {
        let xp = Number(t.xpEarned) || 0;
        if (t.xpEarned && (t.updatedAt || t.completedAt)) {
          history.push({
            date: t.updatedAt || t.completedAt,
            activity: "Project Task",
            xp: Number(t.xpEarned) || 0,
          });
        }
        if (Array.isArray(t.timeEntries)) {
          t.timeEntries.forEach((entry) => {
            if (entry.xpEarned && entry.date) {
              history.push({
                date: entry.date,
                activity: "Project Task Time",
                xp: Number(entry.xpEarned) || 0,
              });
            }
          });
          xp += t.timeEntries.reduce((entrySum, entry) => entrySum + (Number(entry.xpEarned) || 0), 0);
        }
        return sum + xp;
      }, 0);
      totalXP += taskXP;
      activityXP["project tasks"] = (activityXP["project tasks"] || 0) + taskXP;
    }
    if (Array.isArray(projectData.tools)) {
      const toolXP = projectData.tools.reduce((sum, t) => {
        let xp = Number(t.xpEarned) || 0;
        if (t.xpEarned && (t.updatedAt || t.completedAt)) {
          history.push({
            date: t.updatedAt || t.completedAt,
            activity: "Project Tool",
            xp: Number(t.xpEarned) || 0,
          });
        }
        if (Array.isArray(t.timeEntries)) {
          t.timeEntries.forEach((entry) => {
            if (entry.xpEarned && entry.date) {
              history.push({
                date: entry.date,
                activity: "Project Tool Time",
                xp: Number(entry.xpEarned) || 0,
              });
            }
          });
          xp += t.timeEntries.reduce((entrySum, entry) => entrySum + (Number(entry.xpEarned) || 0), 0);
        }
        return sum + xp;
      }, 0);
      totalXP += toolXP;
      activityXP["project tools"] = (activityXP["project tools"] || 0) + toolXP;
    }
  });

  // Habits
  const habitsRef = collection(db, "habits");
  const habitsQ = query(habitsRef, where("userId", "==", userId));
  const habitsSnapshot = await getDocs(habitsQ);
  habitsSnapshot.forEach(docSnapshot => {
    const habitData = docSnapshot.data();
    if (habitData.xp && typeof habitData.xp === "number") {
      totalXP += habitData.xp;
      activityXP["habits"] = (activityXP["habits"] || 0) + habitData.xp;
      if (habitData.lastCompleted) {
        history.push({
          date: habitData.lastCompleted,
          activity: "Habit",
          xp: habitData.xp,
        });
      }
    }
  });

  // Todos
  const todosRef = collection(db, "todos");
  const todosQ = query(todosRef, where("userId", "==", userId));
  const todosSnapshot = await getDocs(todosQ);
  todosSnapshot.forEach(docSnapshot => {
    const todoData = docSnapshot.data();
    if (todoData.xp && typeof todoData.xp === "number") {
      totalXP += todoData.xp;
      activityXP["todos"] = (activityXP["todos"] || 0) + todoData.xp;
      if (todoData.completedAt) {
        history.push({
          date: todoData.completedAt,
          activity: "Todo",
          xp: todoData.xp,
        });
      }
    }
  });

  // Sort history by date (newest first)
  history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const limitedHistory = history.slice(0, 5);

  const level = getLevelFromXP(totalXP);
  const progress = getProgressToNextLevel(totalXP);

  return {
    totalXP,
    byActivity: activityXP,
    recentHistory: limitedHistory,
    level,
    progress,
  };
} 