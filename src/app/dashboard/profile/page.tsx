"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, collection, query, where, getDocs, onSnapshot, orderBy, limit } from "firebase/firestore";
import { useAuth } from "@/lib/auth";
import { Loader2, Save, User, BarChart, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  ThemedAvatar, 
  ThemedProgress,
  ThemedHeader,
  ThemedCard
} from "@/components/ui/themed-components";
import { useTheme } from '@/contexts/theme-context';
import { getLevelFromXP, getProgressToNextLevel, getRankFromXP, activityTypes } from "@/lib/xpSystem";
import { LoginStreakCard } from "@/components/ui/login-streak-card";
import { toast } from "sonner";
import { useLoginStreak } from "@/hooks/useLoginStreak";
import { calculateUserXP } from '@/utils/calculateUserXP';

// Define missing activity types with XP values
const ACTIVITY_XP = {
  CREATE_SUBJECT: { xp: 0 },
  CREATE_TOPIC: { xp: 25 },
  CREATE_CONCEPT: { xp: 15 },
  COMPLETE_QUIZ: { xp: 30 }
};

interface UserPreferences {
  theme: string;
  character?: string;
  displayName: string;
  email: string;
  tokens?: number;
  level?: number;
  xp?: number;
  totalXP?: number;
  rank?: string;
  lastUpdated?: string;
}

interface XPBreakdown {
  totalXP: number;
  byActivity: {
    [key: string]: number;
  };
  recentHistory: {
    date: string;
    activity: string;
    xp: number;
  }[];
}

// DBZ Power Level mapping (approximate, based on DBZ canon)
function getDbzPowerLevel(xp) {
  // Example mapping: XP to DBZ power level (not linear, for drama)
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
  return Math.max(5, Math.floor(xp * 2)); // Early DBZ humans
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

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [tokens, setTokens] = useState<number>(0);
  const [xpBreakdown, setXPBreakdown] = useState<XPBreakdown>({
    totalXP: 0,
    byActivity: {},
    recentHistory: []
  });
  const [currentLevel, setCurrentLevel] = useState(1);
  const [levelProgress, setLevelProgress] = useState({ currentXP: 0, neededXP: 100, percent: 0 });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  
  // Use the login streak hook
  const { 
    streak: userStreak, 
    highestStreak, 
    loading: streakLoading, 
    refreshStreak 
  } = useLoginStreak();

  useEffect(() => {
    console.log("Profile useEffect running, user:", user);
    if (!user) {
      router.push('/login');
      return;
    }

    async function fetchUserData() {
      console.log("fetchUserData called, user:", user);
      try {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log("Profile: User data loaded:", {
            lastLogin: userData.lastLogin
          });
          
          setPreferences(userData);
          setDisplayName(userData.displayName || "");
          setTokens(userData.tokens ?? 0);
          
          // Use shared XP calculation
          const xpResult = await calculateUserXP(user.uid, db);
          setXPBreakdown({
            totalXP: xpResult.totalXP,
            byActivity: xpResult.byActivity,
            recentHistory: xpResult.recentHistory
          });
          setCurrentLevel(xpResult.level);
          setLevelProgress(xpResult.progress);
          
          // Update user doc if out of sync
          if (userData.totalXP !== xpResult.totalXP || userData.level !== xpResult.level) {
            console.log("Profile: Updating user document with new XP data", {
              totalXP: xpResult.totalXP,
              level: xpResult.level,
              currentXP: userData.totalXP
            });
            
            await updateDoc(userRef, {
              totalXP: xpResult.totalXP,
              level: xpResult.level,
              lastUpdated: new Date().toISOString()
            });
          }
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Failed to load user data');
      } finally {
        setLoading(false);
      }
    }
    
    fetchUserData();
  }, [user, router]);

  useEffect(() => {
    if (!user) return;
    // Real-time listener for recent activities
    const q = query(
      collection(db, "activities"),
      where("userId", "==", user.uid),
      orderBy("date", "desc"),
      limit(10)
    );
    const unsub = onSnapshot(q, (snap) => {
      setRecentActivities(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [user]);

  const handleSavePreferences = async () => {
    if (!user) return;
    
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const userRef = doc(db, 'users', user.uid);
      
      // Update user document
      await updateDoc(userRef, {
        displayName: displayName || user.displayName || "User",
        lastUpdated: new Date().toISOString()
      });
      
      setSuccess("Profile updated successfully!");
      
      // Update the displayName in Firebase Auth if possible
      if (user.displayName !== displayName) {
        try {
          await fetch('/api/auth/update-profile', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              displayName
            }),
          });
        } catch (authError) {
          console.error('Error updating auth profile:', authError);
          // Continue even if this fails
        }
      }
      
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Debug: Log xpBreakdown before rendering
  console.log("Rendering profile page, xpBreakdown:", xpBreakdown);

  return (
    <div>
      <ThemedHeader
        theme={theme}
        title="Your Profile"
        subtitle={`Welcome, ${displayName || user?.displayName || 'Student'}!`}
        className="mb-8"
      />
      
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-200 p-4 rounded-md mb-6">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-500/20 border border-green-500 text-green-200 p-4 rounded-md mb-6">
          {success}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <div>
          <h2 className="text-2xl font-semibold mb-4">Avatar & Progress</h2>
          <div className="p-6 bg-slate-900/50 rounded-lg border border-slate-800 flex flex-col items-center">
            <ThemedAvatar 
              theme={theme} 
              xp={xpBreakdown.totalXP} 
              size="xl" 
              className="mb-6"
            />
            <ThemedProgress
              theme={theme}
              progress={levelProgress.percent}
              currentXP={levelProgress.currentXP}
              neededXP={levelProgress.neededXP}
              className="w-full"
            />
            
            <div className="mt-4 w-full">
              <div className="flex justify-between mb-1">
                {theme === 'dbz' ? (
                  <span className="text-sm font-bold text-yellow-400">
                    Power Level: {getDbzPowerLevel(xpBreakdown.totalXP).toLocaleString()}
                  </span>
                ) : (
                  <span className="text-sm">Level {currentLevel}</span>
                )}
                <span className="text-sm">{preferences?.rank}</span>
              </div>
              {/* DBZ Milestone */}
              {theme === 'dbz' && (
                <div className="text-xs font-bold text-yellow-300 mt-1">
                  {getDbzMilestone(getDbzPowerLevel(xpBreakdown.totalXP))}
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-slate-400">Total XP: {xpBreakdown.totalXP}</span>
                <span className="text-sm text-slate-400">Tokens: {tokens}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div>
          <h2 className="text-2xl font-semibold mb-4">Login Streak</h2>
          <div className="relative">
            <LoginStreakCard
              theme={theme}
              streak={userStreak}
              highestStreak={highestStreak}
            />
            <Button
              variant="outline"
              size="sm"
              className="absolute top-2 right-2"
              onClick={async () => {
                try {
                  await refreshStreak();
                  toast.success("Login streak refreshed!");
                } catch (error) {
                  console.error("Error refreshing streak:", error);
                  toast.error("Failed to refresh streak");
                }
              }}
            >
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
          </div>
        </div>
      </div>
      
      <div className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">XP Breakdown</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ThemedCard
            theme={theme}
            title="Activity XP"
            variant="training"
            icon={<BarChart className="w-5 h-5" />}
          >
            <div className="space-y-2 mt-2">
              {Object.entries(xpBreakdown.byActivity).map(([activity, xp]) => (
                <div key={activity} className="flex justify-between">
                  <span className="capitalize">{activity}:</span>
                  <span className="font-medium">{xp} XP</span>
                </div>
              ))}
              {Object.keys(xpBreakdown.byActivity).length === 0 && (
                <p className="text-slate-400">No activity data yet</p>
              )}
            </div>
          </ThemedCard>
          
          <ThemedCard
            theme={theme}
            title="Recent Activity"
            variant="normal"
            icon={<Clock className="w-5 h-5" />}
          >
            <div className="space-y-2 mt-2 max-h-60 overflow-y-auto">
              {recentActivities.length === 0 ? (
                <p className="text-white font-semibold">No recent activity</p>
              ) : (
                recentActivities.map((act) => {
                  let detail = act.detail || '';
                  const prefixes = [
                    'Completed habit: ',
                    'Created habit: ',
                    'Created project: '
                  ];
                  for (const prefix of prefixes) {
                    if (detail.startsWith(prefix)) {
                      detail = detail.replace(prefix, '');
                      break;
                    }
                  }
                  return (
                    <div key={act.id} className="flex justify-between text-sm border-b border-slate-700/50 pb-1">
                      <div className="flex flex-col">
                        <span className="text-slate-200">{detail}</span>
                        <span className="text-xs text-white font-semibold">
                          {act.date ? new Date(act.date).toLocaleDateString() : ''}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ThemedCard>
        </div>
      </div>
      
      <div className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Profile Information</h2>
        <ThemedCard
          theme={theme}
          title="Personal Details"
          variant="normal"
          icon={<User className="w-5 h-5" />}
        >
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-1">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full p-2 bg-slate-800 border border-slate-700 rounded-md text-white"
                placeholder="Your display name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="w-full p-2 bg-slate-800/50 border border-slate-700 rounded-md text-slate-400"
              />
              <p className="text-xs text-slate-400 mt-1">Email cannot be changed</p>
            </div>
          </div>
        </ThemedCard>
      </div>
      
      <div className="flex justify-end">
        <Button 
          onClick={handleSavePreferences}
          disabled={saving}
          className="flex items-center gap-2"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
} 