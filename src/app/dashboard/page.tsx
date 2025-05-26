'use client';

import { useEffect, useState } from "react";
import { UserCircle, Award, TrendingUp, BookOpen, Plus, Star } from 'lucide-react';
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, query, orderBy, limit, setDoc, onSnapshot, where } from "firebase/firestore";
import { useTheme } from "@/contexts/theme-context";
import Link from "next/link";
import { getDbzPowerLevel, getDbzMilestone } from '@/lib/dbzPowerLevel';
import { ThemedAvatar, ThemedProgress } from '@/components/ui/themed-components';
import { calculateUserXP } from '@/utils/calculateUserXP';
import { useLoginStreak } from '@/hooks/useLoginStreak';
import { getProgressBarGradientClass } from '@/lib/utils/progressBarGradient';

console.log({ UserCircle, Award, TrendingUp, BookOpen, Plus, Star });

const motivationalQuotes = [
  'Success is the sum of small efforts, repeated day in and day out.',
  'The secret of getting ahead is getting started.',
  "You don't have to be great to start, but you have to start to be great.",
];

const themeStyles = {
  dbz: {
    accent: "text-yellow-400",
    cardBg: "bg-yellow-950/50",
    border: "border-yellow-600",
    avatar: "/avatars/classic/goku.png",
    label: "Saiyan",
  },
  naruto: {
    accent: "text-orange-400",
    cardBg: "bg-orange-950/50",
    border: "border-orange-600",
    avatar: "/avatars/naruto/naruto.png",
    label: "Shinobi",
  },
  hogwarts: {
    accent: "text-purple-400",
    cardBg: "bg-purple-950/50",
    border: "border-purple-600",
    avatar: "/avatars/hogwarts/harry.png",
    label: "Wizard",
  },
  classic: {
    accent: "text-blue-400",
    cardBg: "bg-slate-900",
    border: "border-blue-600",
    avatar: "/avatars/classic/classic.png",
    label: "Scholar",
  },
};

export default function DashboardHomePage() {
  const { user, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const [userStats, setUserStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [pathways, setPathways] = useState([]);
  const [projects, setProjects] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [xpBreakdown, setXPBreakdown] = useState({ totalXP: 0, byActivity: {}, recentHistory: [] });
  const [currentLevel, setCurrentLevel] = useState(1);
  const [levelProgress, setLevelProgress] = useState({ currentXP: 0, neededXP: 100, percent: 0 });
  const [displayName, setDisplayName] = useState('');
  const { streak: userStreak, highestStreak } = useLoginStreak();
  const [pathwayProgress, setPathwayProgress] = useState({});

  // Pick theme styles, default to classic
  const currentTheme = themeStyles[theme?.toLowerCase?.()] || themeStyles.classic;
  const isDbz = theme?.toLowerCase?.() === "dbz";

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError(null);
    let unsubProjects = null;
    let unsubRewards = null;
    let unsubActivity = null;
    let unsubPathways = null;
    async function fetchData() {
      try {
        // Fetch user stats
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.exists() ? userDoc.data() : {};
        setUserStats(userData);
        setDisplayName(userData.displayName || user?.displayName || 'User');
        // Calculate XP, level, progress
        const xpResult = await calculateUserXP(user.uid, db);
        setXPBreakdown(xpResult);
        setCurrentLevel(xpResult.level);
        setLevelProgress(xpResult.progress);
        // Pathways (one-time fetch)
        unsubPathways = onSnapshot(collection(db, "users", user.uid, "userPathways"), (snapshot) => {
          const userPathways = snapshot.docs.map(doc => doc.data());
          setPathways(userPathways);
          // For each pathway, fetch its subjects and calculate average mastery
          const progressMap = {};
          userPathways.forEach(async (p) => {
            const pathwayId = p.pathwayId || p.id || p.name;
            if (!pathwayId) return;
            const subjectsSnap = await getDocs(collection(db, 'pathways', pathwayId, 'subjects'));
            const subjectDocs = subjectsSnap.docs.map(doc => doc.data());
            const masteries = subjectDocs.map(s => s.progress?.averageMastery || 0).filter(m => typeof m === 'number');
            const avgMastery = masteries.length ? Math.round(masteries.reduce((a, b) => a + b, 0) / masteries.length) : 0;
            progressMap[pathwayId] = avgMastery;
            setPathwayProgress({ ...progressMap });
          });
        });
        // Real-time listeners for projects, rewards, activity
        // --- Projects ---
        const userProjectsCol = collection(db, "users", user.uid, "projects");
        const globalProjectsQuery = query(collection(db, "projects"), where("userId", "==", user.uid));
        unsubProjects = onSnapshot(userProjectsCol, (userSnap) => {
          const userProjects = userSnap.docs.map(doc => ({...doc.data(), id: doc.id}));
          // Also listen to global projects
          onSnapshot(globalProjectsQuery, (globalSnap) => {
            const globalProjects = globalSnap.docs.map(doc => ({...doc.data(), id: doc.id}));
            // Merge, preferring user subcollection if present
            const merged = [...userProjects];
            globalProjects.forEach(gp => {
              if (!userProjects.find(up => up.id === gp.id)) merged.push(gp);
            });
            setProjects(merged);
          });
        });
        // --- Rewards ---
        const userRewardsCol = collection(db, "users", user.uid, "rewards");
        const globalRewardsQuery = query(collection(db, "rewards"), where("userId", "==", user.uid));
        unsubRewards = onSnapshot(userRewardsCol, (userSnap) => {
          const userRewards = userSnap.docs.map(doc => ({...doc.data(), id: doc.id}));
          onSnapshot(globalRewardsQuery, (globalSnap) => {
            const globalRewards = globalSnap.docs.map(doc => ({...doc.data(), id: doc.id}));
            const merged = [...userRewards];
            globalRewards.forEach(gr => {
              if (!userRewards.find(ur => ur.id === gr.id)) merged.push(gr);
            });
            setRewards(merged);
          });
        });
        // --- Activity ---
        const userActivityCol = collection(db, "users", user.uid, "activity");
        const globalActivityQuery = query(collection(db, "activities"), where("userId", "==", user.uid), orderBy("date", "desc"), limit(5));
        unsubActivity = onSnapshot(userActivityCol, (userSnap) => {
          const userActs = userSnap.docs.map(doc => ({...doc.data(), id: doc.id}));
          onSnapshot(globalActivityQuery, (globalSnap) => {
            const globalActs = globalSnap.docs.map(doc => ({...doc.data(), id: doc.id}));
            const merged = [...userActs];
            globalActs.forEach(ga => {
              if (!userActs.find(ua => ua.id === ga.id)) merged.push(ga);
            });
            console.log('userActs', userActs);
            console.log('globalActs', globalActs);
            console.log('merged', merged);
            setRecentActivity(merged.slice(0, 10));
          });
        });
      } catch (err) {
        setError("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    return () => {
      if (unsubProjects) unsubProjects();
      if (unsubRewards) unsubRewards();
      if (unsubActivity) unsubActivity();
      if (unsubPathways) unsubPathways();
    };
  }, [user]);

  const quote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500 border-4 border-blue-500 rounded-full border-t-transparent" />
          <p className="text-slate-200">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="bg-red-900/20 p-8 rounded-lg text-center max-w-md">
          <h2 className="text-2xl font-bold text-red-400 mb-4">Error</h2>
          <p className="text-slate-300 mb-6">{error}</p>
        </div>
      </div>
    );
  }

  // Fallbacks for missing data
  const xp = xpBreakdown.totalXP || 0;
  const level = currentLevel || 1;
  const streak = userStreak || 1;
  const avatarXP = xp;
  const progressPercent = levelProgress.percent || 0;
  const progressCurrent = levelProgress.currentXP || 0;
  const progressNeeded = levelProgress.neededXP || 100;
  const powerLevel = isDbz ? getDbzPowerLevel(xp) : 0;
  const dbzMilestone = isDbz ? getDbzMilestone(powerLevel) : null;

  console.log('recentActivity (final)', recentActivity);

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      {/* User Stats Card */}
      <div className={`flex flex-col md:flex-row gap-6 mb-8`}>
        <div className={`flex-1 ${currentTheme.cardBg} rounded-xl p-6 flex flex-col md:flex-row items-center gap-6 shadow-lg ${currentTheme.border}`}>
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="rounded-full bg-slate-800 p-2 mb-2">
              <ThemedAvatar theme={theme} xp={avatarXP} size="xl" label={isDbz ? dbzMilestone : currentTheme.label} />
            </div>
            <div className="text-xl font-bold text-white">{displayName}</div>
            {/* Theme-specific characterization line */}
            {isDbz ? (
              dbzMilestone && <div className="text-xs font-bold text-yellow-300 mt-1">{dbzMilestone}</div>
            ) : (
              <div className={`text-sm font-semibold ${currentTheme.accent}`}>{currentTheme.label}</div>
            )}
            <div className="flex gap-3 mt-2">
              <span className={`flex items-center gap-1 ${currentTheme.accent}`}><Award className="w-5 h-5" /> Level {level}</span>
              {isDbz ? (
                <span className="flex items-center gap-1 text-yellow-400">Power Level: {powerLevel.toLocaleString()}</span>
              ) : (
                <span className="flex items-center gap-1 text-yellow-400">XP: {xp}</span>
              )}
              <span className="flex items-center gap-1 text-yellow-400"><Star className="w-5 h-5" /> Streak: {streak} days</span>
            </div>
          </div>
          {/* Progress Bar */}
          <div className="flex-1 w-full mt-6 md:mt-0 md:ml-8">
            <ThemedProgress
              theme={theme}
              progress={progressPercent}
              currentXP={progressCurrent}
              neededXP={progressNeeded}
              className="w-full"
            />
          </div>
        </div>
        {/* Quick Actions */}
        <div className="flex flex-col gap-3 min-w-[220px]">
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow">
            <BookOpen className="w-5 h-5" /> Start Study Session
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium shadow">
            <Plus className="w-5 h-5" /> Add Project
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium shadow">
            <Star className="w-5 h-5" /> Take Quiz
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium shadow">
            <Star className="w-5 h-5" /> Log Habit
          </button>
        </div>
      </div>

      {/* Widgets Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Pathways Progress */}
        <div className={`${currentTheme.cardBg} rounded-xl p-6 shadow-lg ${currentTheme.border}`}>
          <div className="font-semibold text-slate-200 mb-2">Your Pathways</div>
          {pathways.length === 0 ? (
            <div className="text-slate-400">No pathways joined yet.</div>
          ) : (
            pathways.map((p) => {
              const pathwayId = p.pathwayId || p.id || p.name;
              const progress = pathwayProgress[pathwayId] || 0;
              return (
                <Link key={pathwayId} href={`/dashboard/pathways/${pathwayId}`}
                  className="block mb-3 hover:bg-slate-800/40 rounded-lg transition p-2">
                  <div className="flex justify-between text-slate-300 text-sm">
                    <span>{p.name || pathwayId}</span>
                    <span>{progress ? `${progress}%` : ""}</span>
                  </div>
                  <div className={`relative h-4 w-full rounded-full overflow-hidden ${currentTheme.cardBg} border-2 ${currentTheme.border} shadow-[0_0_15px_rgba(234,179,8,0.3)]`}>
                    <div
                      className={`h-full rounded-full ${getProgressBarGradientClass(theme)}`}
                      style={{ width: `${progress}%` }}
                    />
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-bold text-white drop-shadow">
                      {progress}%
                    </span>
                  </div>
                </Link>
              );
            })
          )}
        </div>
        {/* Projects Overview */}
        <div className={`${currentTheme.cardBg} rounded-xl p-6 shadow-lg ${currentTheme.border}`}>
          <div className="font-semibold text-slate-200 mb-2">Active Projects</div>
          {projects.length === 0 ? (
            <div className="text-slate-400">No active projects.</div>
          ) : (
            projects.map((proj) => (
              <div key={proj.name || proj.id} className="flex justify-between text-slate-300 mb-2">
                <span>{proj.name}</span>
                <span className={proj.status === 'Active' ? 'text-blue-400' : 'text-green-400'}>{proj.status}</span>
              </div>
            ))
          )}
        </div>
        {/* Rewards/Achievements */}
        <div className={`${currentTheme.cardBg} rounded-xl p-6 shadow-lg ${currentTheme.border}`}>
          <div className="font-semibold text-slate-200 mb-2">Latest Rewards & Achievements</div>
          <div className="flex flex-wrap gap-3">
            {rewards.length === 0 ? (
              <span className="text-slate-400">No rewards yet.</span>
            ) : (
              rewards.map((reward) => (
                <div key={reward.name || reward.id} className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full text-sm text-slate-100">
                  {/* You can add icons based on reward type here */}
                  <span>{reward.name}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className={`${currentTheme.cardBg} rounded-xl p-6 shadow-lg mb-8 ${currentTheme.border}`}>
        <div className="font-semibold text-slate-200 mb-4">Recent Activity</div>
        <ul className="divide-y divide-slate-800">
          {recentActivity.length === 0 ? (
            <li className="py-2 text-slate-400">No recent activity.</li>
          ) : (
            recentActivity.map((act, idx) => (
              <li key={idx} className="py-2 flex justify-between text-slate-300">
                <span>{act.type}: <span className="font-medium text-white">{act.detail}</span></span>
                <span className="text-slate-400 text-xs">{act.date}</span>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Note/Goals Section */}
      <NoteGoalsSection user={user} currentTheme={currentTheme} />

      {/* Motivational Quote */}
      <div className="bg-blue-900/80 rounded-xl p-6 shadow-lg text-center text-blue-100 text-lg font-medium">
        <span className="italic">"{quote}"</span>
      </div>
    </div>
  );
}

function NoteGoalsSection({ user, currentTheme }) {
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError(null);
    async function fetchNote() {
      try {
        const noteDoc = await getDoc(doc(db, "users", user.uid, "notes", "dashboardNote"));
        if (noteDoc.exists()) {
          setNote(noteDoc.data().text || "");
        } else {
          setNote("");
        }
      } catch (err) {
        setError("Failed to load your note.");
      } finally {
        setLoading(false);
      }
    }
    fetchNote();
  }, [user]);

  async function saveNote() {
    if (!user) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await setDoc(doc(db, "users", user.uid, "notes", "dashboardNote"), { text: note });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 1500);
    } catch (err) {
      setError("Failed to save your note.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`${currentTheme.cardBg} rounded-xl p-6 shadow-lg mb-8 ${currentTheme.border}`}>
      <div className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
        <span>Notes & Goals</span>
        {loading && <span className="text-xs text-blue-400 ml-2">Loading...</span>}
        {saving && <span className="text-xs text-green-400 ml-2">Saving...</span>}
        {success && <span className="text-xs text-green-400 ml-2">Saved!</span>}
        {error && <span className="text-xs text-red-400 ml-2">{error}</span>}
      </div>
      <textarea
        className="w-full min-h-[80px] p-3 rounded-lg bg-slate-800 text-white border border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        value={note}
        onChange={e => setNote(e.target.value)}
        onBlur={saveNote}
        placeholder="Write your goals, plans, or notes here..."
        disabled={loading || saving}
      />
      <div className="flex justify-end mt-2">
        <button
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow disabled:opacity-50"
          onClick={saveNote}
          disabled={loading || saving}
        >
          Save
        </button>
      </div>
    </div>
  );
}