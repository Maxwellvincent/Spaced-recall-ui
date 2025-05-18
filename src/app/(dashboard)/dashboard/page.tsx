"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getFirebaseDb } from "@/lib/firebase";
import { collection, query, where, getDocs, limit, doc, updateDoc, getDoc } from "firebase/firestore";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/contexts/theme-context";
import { Loader2, BookOpen, Clock, Star, Brain, CheckCircle, BarChart } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Subject } from "@/types/study";
import { SubjectCard } from "@/components/ui/subject-card";
import { ThemedHeader, ThemedProgress, ThemedAvatar, ThemedCard } from "@/components/ui/themed-components";
import { getLevelFromXP, getProgressToNextLevel, getRankFromXP } from '@/lib/xpSystem';
import { themeConfig } from '@/config/themeConfig';
import { LoginStreakCard } from "@/components/ui/login-streak-card";
import { useLoginStreak } from "@/hooks/useLoginStreak";
import { calculateUserXP } from '@/utils/calculateUserXP';

// This is a completely static version of the dashboard page
// It doesn't use any client components or Firebase during build time
// The real dashboard functionality will load client-side through the layout.tsx file

function getRankBadgeClass(themeId: string) {
  switch (themeId) {
    case 'naruto':
      return 'bg-orange-900/60 border-orange-700 text-orange-200';
    case 'dbz':
      return 'bg-yellow-900/60 border-yellow-700 text-yellow-200';
    case 'harry-potter':
      return 'bg-purple-900/60 border-purple-700 text-purple-200';
    default:
      return 'bg-blue-900/60 border-blue-700 text-blue-200';
  }
}

function getThemeTextColor(themeId: string) {
  switch (themeId) {
    case 'naruto': return 'text-orange-500';
    case 'dbz': return 'text-yellow-500';
    case 'harry-potter': return 'text-purple-500';
    default: return 'text-blue-500';
  }
}

// DBZ Power Level mapping (same as profile)
function getDbzPowerLevel(xp) {
  if (xp >= 2000000) return 150000000; // Frieza (final form)
  if (xp >= 1000000) return 30000000;  // Goku (Super Saiyan)
  if (xp >= 500000) return 3000000;    // Vegeta (Namek)
  if (xp >= 100000) return 180000;     // Goku (Saiyan Saga)
  if (xp >= 50000) return 90000;       // Ginyu Force
  if (xp >= 9000) return 9001;         // Over 9000 meme
  if (xp >= 5000) return 8000;
  if (xp >= 1000) return 4000;
  if (xp >= 500) return 1500;
  if (xp >= 100) return 500;
  return Math.max(5, Math.floor(xp * 2));
}

function getDbzMilestone(powerLevel) {
  if (powerLevel >= 150000000) return "Final Form Frieza!";
  if (powerLevel >= 30000000) return "Super Saiyan Goku!";
  if (powerLevel >= 3000000) return "Namek Saga Vegeta!";
  if (powerLevel >= 180000) return "Saiyan Saga Goku!";
  if (powerLevel >= 90000) return "Ginyu Force!";
  if (powerLevel >= 9001) return "It's Over 9,000!";
  if (powerLevel >= 8000) return "Elite Saiyan!";
  if (powerLevel >= 4000) return "Piccolo (Saiyan Saga)!";
  if (powerLevel >= 1500) return "Raditz!";
  if (powerLevel >= 500) return "Yamcha!";
  return "Earthling";
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [stats, setStats] = useState({
    totalSubjects: 0,
    totalTopics: 0,
    totalXP: 0,
    averageMastery: 0,
    reviewsDue: 0
  });
  const [userLevel, setUserLevel] = useState(0);
  const [userTheme, setUserTheme] = useState('classic');
  const [userRank, setUserRank] = useState('');
  const [userXP, setUserXP] = useState(0);
  const [userDisplayName, setUserDisplayName] = useState('');
  const [levelProgress, setLevelProgress] = useState({ currentXP: 0, neededXP: 100, percent: 0 });
  
  // Use the login streak hook
  const { streak: loginStreak, highestStreak: highestLoginStreak, loading: streakLoading } = useLoginStreak();

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user || !user.uid) return;
      try {
        setLoading(true);
        const db = getFirebaseDb();
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        let userData = userDoc.exists() ? userDoc.data() : {};
        // Use shared XP calculation
        const xpResult = await calculateUserXP(user.uid, db);
        setUserXP(xpResult.totalXP);
        setUserLevel(xpResult.level);
        setLevelProgress(xpResult.progress);
        // Update user doc if out of sync
        if (userData.totalXP !== xpResult.totalXP || userData.level !== xpResult.level) {
          await updateDoc(userRef, {
            totalXP: xpResult.totalXP,
            level: xpResult.level,
            lastUpdated: new Date().toISOString()
          });
        }
        // Fetch all subjects for the user
        const subjectsRef = collection(db, 'subjects');
        const q = query(subjectsRef, where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        const subjectsList = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
        setSubjects(subjectsList);
        // Calculate stats
        const totalSubjects = subjectsList.length;
        const totalTopics = subjectsList.reduce((sum, subj) => sum + (subj.topics?.length || 0), 0);
        const averageMastery = totalSubjects > 0 ? Math.round(subjectsList.reduce((sum, subj) => sum + (subj.progress?.averageMastery || 0), 0) / totalSubjects) : 0;
        // Optionally, calculate reviewsDue if you have a way (here, just 0)
        setStats({
          totalSubjects,
          totalTopics,
          totalXP: userXP,
          averageMastery,
          reviewsDue: 0
        });
      } catch (error) {
        console.error("Dashboard: Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchDashboardData();
  }, [user]);
  
  // Render
  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* User Progress Summary with Themed Components */}
      <div className="mb-10">
        <ThemedHeader
          theme={theme}
          title="Dashboard"
          subtitle={`Welcome back, ${userDisplayName || user?.displayName || 'Student'}!`}
          className="mb-6"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
          <ThemedCard
            theme={theme}
            title="Study Progress"
            icon={<Brain className="w-5 h-5" />}
            variant="normal"
            className="rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200"
          >
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                {theme === 'dbz' ? (
                  <span className="font-bold text-yellow-400">
                    Power Level: {getDbzPowerLevel(userXP).toLocaleString()}
                  </span>
                ) : (
                  <span>Level {userLevel}</span>
                )}
                <span>{userRank}</span>
              </div>
              {/* DBZ Milestone */}
              {theme === 'dbz' && (
                <div className="text-xs font-bold text-yellow-300 mt-1">
                  {getDbzMilestone(getDbzPowerLevel(userXP))}
                </div>
              )}
              <ThemedProgress
                theme={theme}
                progress={levelProgress.percent}
                currentXP={levelProgress.currentXP}
                neededXP={levelProgress.neededXP}
              />
            </div>
          </ThemedCard>

          <ThemedCard
            theme={theme}
            title="Study Stats"
            icon={<Star className="w-5 h-5" />}
            variant="training"
            className="rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200"
          >
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total XP:</span>
                <span className="font-medium">{userXP}</span>
              </div>
              <div className="flex justify-between">
                <span>Average Mastery:</span>
                <span className="font-medium">{Math.round(stats.averageMastery)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Subjects:</span>
                <span className="font-medium">{stats.totalSubjects}</span>
              </div>
            </div>
          </ThemedCard>

          <ThemedCard
            theme={theme}
            title="Reviews Due"
            icon={<Clock className="w-5 h-5" />}
            variant="quiz"
            className="rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200"
          >
            <div className="text-center py-2">
              <div className="text-3xl font-bold mb-2">{stats.reviewsDue}</div>
              <Link href="/spaced-recall" className="underline hover:text-white">
                Start Review Session
              </Link>
            </div>
          </ThemedCard>
        </div>

        {/* Login Streak Card - Compact, centered, not full width */}
        <div className="flex justify-center my-6">
          <div className="w-full max-w-sm">
            <LoginStreakCard 
              streak={loginStreak} 
              highestStreak={highestLoginStreak} 
              theme={theme}
              variant="compact"
              className="rounded-xl shadow-md"
            />
          </div>
        </div>
      </div>

      {/* Subject Cards */}
      <div className="mb-12">
        <ThemedHeader
          theme={theme}
          title="Your Subjects"
          subtitle="Continue your learning journey"
          className="mb-4"
        />
        {subjects.length === 0 ? (
          <ThemedCard theme={theme} title="No subjects yet" variant="normal">
            <p className="mb-4">You haven't created any subjects yet. Get started by creating your first subject!</p>
            <Button onClick={() => router.push('/subjects/create')}>
              Create Subject
            </Button>
          </ThemedCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subjects.map((subject) => (
              <SubjectCard
                key={subject.id}
                subject={subject}
                theme={theme}
                className="rounded-xl shadow hover:shadow-lg transition-shadow duration-200"
              />
            ))}
            <ThemedCard
              theme={theme}
              title="Create New Subject"
              variant="normal"
              className="border-2 border-dashed border-slate-700 hover:border-slate-600 cursor-pointer rounded-xl"
              onClick={() => router.push('/subjects/create')}
            >
              <div className="flex items-center justify-center py-6">
                <BookOpen className="w-8 h-8 opacity-60" />
              </div>
            </ThemedCard>
          </div>
        )}
      </div>
    </div>
  );
} 