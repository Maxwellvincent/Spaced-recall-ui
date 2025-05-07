"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getFirebaseDb } from "@/lib/firebase";
import { collection, query, where, getDocs, limit, doc, updateDoc, getDoc } from "firebase/firestore";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/contexts/theme-context";
import { Loader2, BookOpen, Clock, Star, Brain } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Subject } from "@/types/study";
import { SubjectCard } from "@/components/ui/subject-card";
import { ThemedHeader, ThemedProgress, ThemedAvatar, ThemedCard } from "@/components/ui/themed-components";
import { getLevelFromXP, getProgressToNextLevel, getRankFromXP } from '@/lib/xpSystem';
import { themeConfig } from '@/config/themeConfig';

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
  const [levelProgress, setLevelProgress] = useState({ currentXP: 0, neededXP: 100, percent: 0 });

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user || !user.uid) {
        console.log("Dashboard: No user or user ID found");
        return;
      }
      
      try {
        console.log(`Dashboard: Fetching dashboard data for user ${user.uid}`);
        setLoading(true);
        
        const db = getFirebaseDb();
        if (!db) {
          console.error("Dashboard: Failed to get Firestore instance");
          throw new Error("Database connection failed");
        }
        
        console.log("Dashboard: Got Firestore instance, querying subjects");
        const subjectsRef = collection(db, "subjects");
        const q = query(subjectsRef, where("userId", "==", user.uid), limit(10));
        
        let querySnapshot;
        try {
          querySnapshot = await getDocs(q);
          console.log(`Dashboard: Query executed, found ${querySnapshot.size} subjects`);
        } catch (queryError) {
          console.error("Dashboard: Error executing query:", queryError);
          throw queryError;
        }
        
        const subjectsData: Subject[] = [];
        let totalTopics = 0;
        let subjectsTotalXP = 0;
        let totalMastery = 0;
        let reviewsDue = 0;
        
        const updatePromises: Promise<any>[] = [];
        
        querySnapshot.forEach((docSnapshot) => {
          try {
            const rawData = docSnapshot.data();
            console.log(`Dashboard: Raw subject data for ${docSnapshot.id}:`, rawData);
            
            // Create subject with default values for missing fields
            const subject: Subject = { 
              id: docSnapshot.id, 
              name: rawData.name || 'Unnamed Subject',
              description: rawData.description || '',
              studyStyle: rawData.studyStyle || 'standard',
              xp: rawData.xp || 0,
              level: rawData.level || 1,
              totalStudyTime: rawData.totalStudyTime || 0,
              topics: rawData.topics || [],
              sessions: rawData.sessions || [],
              masteryPath: rawData.masteryPath || {
                currentLevel: 1,
                nextLevel: 2,
                progress: 0
              },
              userId: rawData.userId,
              progress: rawData.progress
            };
            
            console.log(`Dashboard: Processing subject ${subject.id} - ${subject.name}`);
            console.log(`Dashboard: Subject XP: ${subject.xp}, Topics: ${subject.topics?.length || 0}`);
            
            if (subject.progress) {
              console.log(`Dashboard: Existing progress - avgMastery: ${subject.progress.averageMastery}, totalXP: ${subject.progress.totalXP}`);
            } else {
              console.log(`Dashboard: No progress object found for subject ${subject.id}`);
            }
            
            // Calculate average mastery for the subject if it doesn't exist
            if ((!subject.progress?.averageMastery || subject.progress.averageMastery === 0) && subject.topics && subject.topics.length > 0) {
              // Check if topics have masteryLevel property
              let validTopics = 0;
              const topicsMastery = subject.topics.reduce((sum, topic) => {
                if (topic && typeof topic.masteryLevel === 'number') {
                  validTopics++;
                  return sum + topic.masteryLevel;
                }
                return sum;
              }, 0);
              
              const avgMastery = validTopics > 0 ? Math.round(topicsMastery / validTopics) : 0;
              console.log(`Dashboard: Calculated avgMastery for ${subject.id}: ${avgMastery} from ${validTopics} valid topics`);
              
              // Create or update progress object
              if (!subject.progress) {
                subject.progress = {
                  totalXP: subject.xp || 0,
                  averageMastery: avgMastery,
                  completedTopics: subject.topics.filter(t => (t && t.masteryLevel && t.masteryLevel >= 80)).length,
                  totalTopics: subject.topics.length,
                  lastStudied: new Date().toISOString()
                };
                console.log(`Dashboard: Created new progress object for ${subject.id}`, subject.progress);
              } else {
                subject.progress.averageMastery = avgMastery;
                subject.progress.completedTopics = subject.topics.filter(t => (t && t.masteryLevel && t.masteryLevel >= 80)).length;
                subject.progress.totalTopics = subject.topics.length;
                console.log(`Dashboard: Updated progress object for ${subject.id}`, subject.progress);
              }
              
              try {
                // Update the subject in Firestore
                console.log(`Dashboard: Updating subject ${subject.id} with new progress data`);
                const subjectRef = doc(db, 'subjects', subject.id);
                updatePromises.push(
                  updateDoc(subjectRef, { progress: subject.progress })
                    .catch(updateError => {
                      console.error(`Dashboard: Error updating subject ${subject.id}:`, updateError);
                      return null;
                    })
                );
              } catch (docError) {
                console.error(`Dashboard: Error creating doc reference for subject ${subject.id}:`, docError);
              }
            }
            
            subjectsData.push(subject);
            
            // Calculate stats
            totalTopics += subject.topics?.length || 0;
            subjectsTotalXP += subject.xp || 0;
            
            if (subject.progress?.averageMastery) {
              totalMastery += subject.progress.averageMastery;
            }
            
            // Count reviews due
            subject.topics?.forEach((topic) => {
              if (topic && topic.nextReview) {
                const reviewDate = new Date(topic.nextReview);
                if (reviewDate <= new Date()) {
                  reviewsDue++;
                }
              }
              
              if (topic && topic.concepts) {
                topic.concepts.forEach((concept) => {
                  if (concept && concept.nextReview) {
                    const reviewDate = new Date(concept.nextReview);
                    if (reviewDate <= new Date()) {
                      reviewsDue++;
                    }
                  }
                });
              }
            });
          } catch (error) {
            console.error(`Dashboard: Error processing subject ${docSnapshot.id}:`, error);
          }
        });
        
        // Wait for all updates to complete
        if (updatePromises.length > 0) {
          try {
            console.log(`Dashboard: Waiting for ${updatePromises.length} subject updates to complete`);
            const results = await Promise.allSettled(updatePromises);
            const fulfilled = results.filter(r => r.status === 'fulfilled').length;
            const rejected = results.filter(r => r.status === 'rejected').length;
            console.log(`Dashboard: Updates completed - ${fulfilled} successful, ${rejected} failed`);
            
            if (rejected > 0) {
              console.warn(`Dashboard: Some subject updates failed (${rejected}/${updatePromises.length})`);
            }
          } catch (batchError) {
            console.error("Dashboard: Error during batch update of subjects:", batchError);
          }
        }
        
        const calculatedStats = {
          totalSubjects: subjectsData.length,
          totalTopics,
          totalXP: subjectsTotalXP,
          averageMastery: subjectsData.length > 0 ? totalMastery / subjectsData.length : 0,
          reviewsDue
        };
        
        console.log("Dashboard: Final subjects data", subjectsData);
        console.log("Dashboard: Calculated stats", calculatedStats);
        
        setSubjects(subjectsData);
        setStats(calculatedStats);
        
        console.log("Dashboard: Data loaded successfully");

        // Fetch user profile for theme/level
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        let theme = 'classic';
        let userTotalXP = 0;
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          theme = userData.theme || 'classic';
          userTotalXP = userData.totalXP || 0;
          setUserXP(userTotalXP);
        }
        
        // Calculate level and progress based on theme
        const themeData = themeConfig[theme.toLowerCase()];
        
        const level = getLevelFromXP(userTotalXP, {
          name: themeData.label,
          description: themeData.description,
          xpMultiplier: 1.0,
          avatarLevels: themeData.avatars,
          xpTiers: themeData.xpTiers
        });

        const progress = getProgressToNextLevel(userTotalXP, {
          name: themeData.label,
          description: themeData.description,
          xpMultiplier: 1.0,
          avatarLevels: themeData.avatars,
          xpTiers: themeData.xpTiers
        });

        // Get rank based on XP directly from themeConfig
        let userRankName = "";
        if (themeData && themeData.xpTiers) {
          // Sort tiers by required XP (lowest to highest)
          const tiers = Object.entries(themeData.xpTiers)
            .sort(([a], [b]) => Number(a) - Number(b));
          
          // Find the highest tier that the user's XP exceeds
          for (let i = tiers.length - 1; i >= 0; i--) {
            const [, tier] = tiers[i];
            if (userTotalXP >= tier.xpRequired) {
              userRankName = tier.name;
              break;
            }
          }
          
          // If no tier found, use the first one
          if (!userRankName && tiers.length > 0) {
            userRankName = tiers[0][1].name;
          }
        }

        setUserTheme(theme);
        setUserLevel(level);
        setLevelProgress(progress);
        setUserRank(userRankName);

        // Update user document if level or rank has changed
        if (userDoc.exists() && (userDoc.data().level !== level || userDoc.data().rank !== userRankName)) {
          await updateDoc(userRef, {
            level,
            rank: userRankName,
            lastUpdated: new Date().toISOString()
          });
        }

        console.log('DASHBOARD BADGE:', { theme, level, rank: userRankName, totalXP: userTotalXP, progress });
        
      } catch (error) {
        console.error("Dashboard: Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (user) {
      fetchDashboardData();
    }
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
      <div className="mb-8">
        <ThemedHeader
          theme={theme}
          title="Dashboard"
          subtitle={`Welcome back, ${user?.displayName || 'Student'}!`}
          className="mb-6"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <ThemedCard
            theme={theme}
            title="Study Progress"
            icon={<Brain className="w-5 h-5" />}
            variant="normal"
          >
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span>Level {userLevel}</span>
                <span>{userRank}</span>
              </div>
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
          >
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total XP:</span>
                <span className="font-medium">{stats.totalXP}</span>
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
          >
            <div className="text-center py-2">
              <div className="text-3xl font-bold mb-2">{stats.reviewsDue}</div>
              <Link href="/spaced-recall" className="underline hover:text-white">
                Start Review Session
              </Link>
            </div>
          </ThemedCard>
        </div>
      </div>

      {/* Recent Subjects with Themed Header */}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((subject) => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              theme={theme}
            />
          ))}
          <ThemedCard
            theme={theme}
            title="Create New Subject"
            variant="normal"
            className="border-2 border-dashed border-slate-700 hover:border-slate-600 cursor-pointer"
            onClick={() => router.push('/subjects/create')}
          >
            <div className="flex items-center justify-center py-6">
              <BookOpen className="w-8 h-8 opacity-60" />
            </div>
          </ThemedCard>
        </div>
      )}
    </div>
  );
} 