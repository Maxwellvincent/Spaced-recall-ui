"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "@/lib/auth";
import { Loader2, Save, User, Palette, Coins, Star, Trophy, Clock, BarChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  ThemedAvatar, 
  ThemedProgress,
  ThemedHeader,
  ThemedCard,
  ThemeSelector,
  ThemedStreak
} from "@/components/ui/themed-components";
import { useTheme } from '@/contexts/theme-context';
import { themeConfig } from "@/config/themeConfig";
import { getLevelFromXP, getProgressToNextLevel, getRankFromXP, activityTypes } from "@/lib/xpSystem";

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

// Helper function to get rank directly from themeConfig
function getThemeRank(xp: number, theme: string): string {
  if (!theme || !(theme.toLowerCase() in themeConfig)) {
    return "Beginner";
  }
  
  const themeData = themeConfig[theme.toLowerCase()];
  const tiers = Object.entries(themeData.xpTiers)
    .sort(([a], [b]) => Number(a) - Number(b));
  
  // Find the highest tier that the user's XP exceeds
  for (let i = tiers.length - 1; i >= 0; i--) {
    const [, tier] = tiers[i];
    if (xp >= tier.xpRequired) {
      return tier.name;
    }
  }
  
  // If no tier found, use the first one
  return tiers[0][1].name;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<string>("classic");
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [isGeneratingCharacter, setIsGeneratingCharacter] = useState(false);
  const [customCharacterPrompt, setCustomCharacterPrompt] = useState("");
  const [tokens, setTokens] = useState<number>(0);
  const [initialTheme, setInitialTheme] = useState<string | null>(null);
  const [xpBreakdown, setXPBreakdown] = useState<XPBreakdown>({
    totalXP: 0,
    byActivity: {},
    recentHistory: []
  });
  const [currentLevel, setCurrentLevel] = useState(1);
  const [levelProgress, setLevelProgress] = useState({ currentXP: 0, neededXP: 100, percent: 0 });
  const [userStreak, setUserStreak] = useState(0);
  const [highestStreak, setHighestStreak] = useState(0);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    async function fetchUserData() {
      try {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setPreferences(userData);
          setSelectedTheme(userData.theme || "classic");
          setInitialTheme(userData.theme || "classic");
          setSelectedCharacter(userData.character || null);
          setDisplayName(userData.displayName || "");
          setTokens(userData.tokens ?? 0);
          setUserStreak(userData.currentStreak ?? 0);
          setHighestStreak(userData.highestStreak ?? 0);

          // Fetch subjects to calculate XP
          const subjectsRef = collection(db, 'subjects');
          const q = query(subjectsRef, where("userId", "==", user.uid));
          const subjectsSnapshot = await getDocs(q);

          let totalXP = 0;
          let activityXP: { [key: string]: number } = {};
          let history: { date: string; activity: string; xp: number; }[] = [];

          // Process each subject's study sessions
          subjectsSnapshot.forEach((subjectDoc) => {
            const subjectData = subjectDoc.data();
            
            // Add subject's total XP
            if (subjectData.xp) {
              totalXP += subjectData.xp;
            }

            // Process topics
            if (subjectData.topics) {
              subjectData.topics.forEach((topic: any) => {
                if (topic.studySessions) {
                  topic.studySessions.forEach((session: any) => {
                    if (session.xpGained) {
                      // Add to activity breakdown
                      const activity = session.activityType || 'study';
                      activityXP[activity] = (activityXP[activity] || 0) + session.xpGained;

                      // Add to history
                      history.push({
                        date: session.date,
                        activity: session.activityType || 'study',
                        xp: session.xpGained
                      });
                    }
                  });
                }
              });
            }
          });

          // Sort history by date and take most recent 10
          history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          history = history.slice(0, 10);

          // Calculate level and progress based on theme
          const theme = themeConfig[userData.theme?.toLowerCase() || 'classic'];
          const level = getLevelFromXP(totalXP, {
            name: theme.label,
            description: theme.description,
            xpMultiplier: 1.0,
            avatarLevels: theme.avatars,
            xpTiers: theme.xpTiers
          });

          const progress = getProgressToNextLevel(totalXP, {
            name: theme.label,
            description: theme.description,
            xpMultiplier: 1.0,
            avatarLevels: theme.avatars,
            xpTiers: theme.xpTiers
          });

          // Get rank name based on XP
          const rank = getThemeRank(totalXP, userData.theme || "classic");

          // Update the user's profile with the new XP, level, and rank
          const shouldUpdateProfile = 
            totalXP !== userData.totalXP || 
            level !== userData.level || 
            rank !== userData.rank;

          if (shouldUpdateProfile) {
            await updateDoc(userRef, {
              totalXP,
              level,
              rank,
              lastUpdated: new Date().toISOString()
            });

            // Update local state with new values
            setPreferences(prev => ({
              ...prev!,
              totalXP,
              level,
              rank
            }));
          }

          setXPBreakdown({
            totalXP,
            byActivity: activityXP,
            recentHistory: history
          });

          setCurrentLevel(level);
          setLevelProgress(progress);
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

  // Theme switch cost
  const THEME_SWITCH_COST = 20;
  const isFirstTime = !initialTheme || initialTheme === "";
  const isThemeChanged = selectedTheme !== initialTheme;
  const canSwitchTheme = isFirstTime || tokens >= THEME_SWITCH_COST;

  const handleUpdateTheme = (newTheme: string) => {
    setSelectedTheme(newTheme);
  };

  const handleSavePreferences = async () => {
    if (!user) return;
    
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const userRef = doc(db, 'users', user.uid);
      
      // Calculate token cost if changing theme
      let newTokens = tokens;
      if (isThemeChanged && !isFirstTime) {
        newTokens -= THEME_SWITCH_COST;
      }
      
      // Update user document
      await updateDoc(userRef, {
        theme: selectedTheme,
        character: selectedCharacter,
        displayName: displayName || user.displayName || "User",
        tokens: newTokens,
        lastUpdated: new Date().toISOString()
      });
      
      // Update global theme context
      setTheme(selectedTheme);
      
      // Update local state
      setTokens(newTokens);
      setInitialTheme(selectedTheme);
      setSuccess("Profile updated successfully!");
      
      // Reload page after a short delay to apply theme changes
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
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

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <ThemedHeader
        theme={selectedTheme}
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
              theme={selectedTheme} 
              xp={xpBreakdown.totalXP} 
              size="xl" 
              className="mb-6"
            />
            <ThemedProgress
              theme={selectedTheme}
              progress={levelProgress.percent}
              currentXP={levelProgress.currentXP}
              neededXP={levelProgress.neededXP}
              className="w-full"
            />
            
            <div className="mt-4 w-full">
              <div className="flex justify-between mb-1">
                <span className="text-sm">Level {currentLevel}</span>
                <span className="text-sm">{preferences?.rank}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-400">Total XP: {xpBreakdown.totalXP}</span>
                <span className="text-sm text-slate-400">Tokens: {tokens}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div>
          <h2 className="text-2xl font-semibold mb-4">Study Streak</h2>
          <ThemedStreak
            theme={selectedTheme}
            streak={userStreak}
            highestStreak={highestStreak}
          />
        </div>
      </div>
      
      <div className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Theme Selection</h2>
        <ThemedCard
          theme={selectedTheme}
          title="Choose Your Theme"
          variant="normal"
          className="mb-4"
        >
          <div className="mb-4">
            <ThemeSelector 
              currentTheme={selectedTheme} 
              onThemeSelect={handleUpdateTheme} 
            />
          </div>
          
          {isThemeChanged && !isFirstTime && (
            <div className="text-sm p-3 rounded-md bg-slate-800/50 mb-4">
              <div className="flex items-center justify-between">
                <span>Theme change cost:</span>
                <span className="flex items-center">
                  <Coins className="h-4 w-4 mr-1 text-yellow-400" />
                  <span>{THEME_SWITCH_COST} tokens</span>
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span>Your tokens:</span>
                <span className="flex items-center">
                  <Coins className="h-4 w-4 mr-1 text-yellow-400" />
                  <span>{tokens}</span>
                </span>
              </div>
              {!canSwitchTheme && (
                <div className="text-red-400 mt-2">
                  You don't have enough tokens to change your theme.
                </div>
              )}
            </div>
          )}
        </ThemedCard>
      </div>
      
      <div className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">XP Breakdown</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ThemedCard
            theme={selectedTheme}
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
            theme={selectedTheme}
            title="Recent Activity"
            variant="normal"
            icon={<Clock className="w-5 h-5" />}
          >
            <div className="space-y-2 mt-2 max-h-60 overflow-y-auto">
              {xpBreakdown.recentHistory.map((item, index) => (
                <div key={index} className="flex justify-between text-sm border-b border-slate-700/50 pb-1">
                  <div className="flex flex-col">
                    <span className="capitalize">{item.activity}</span>
                    <span className="text-xs text-slate-400">
                      {new Date(item.date).toLocaleDateString()}
                    </span>
                  </div>
                  <span className="font-medium">{item.xp} XP</span>
                </div>
              ))}
              {xpBreakdown.recentHistory.length === 0 && (
                <p className="text-slate-400">No recent activity</p>
              )}
            </div>
          </ThemedCard>
        </div>
      </div>
      
      <div className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Profile Information</h2>
        <ThemedCard
          theme={selectedTheme}
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
          disabled={saving || (isThemeChanged && !canSwitchTheme)}
          className="flex items-center gap-2"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
} 