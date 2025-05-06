"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import Link from "next/link";
import type { Subject, Topic } from "@/types/study";
import { Loader2, BookOpen, Clock, Target, Plus } from "lucide-react";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { WeakTopicCard } from "@/components/ui/weak-topic-card";
import { RecentActivityCard } from "@/components/ui/recent-activity-card";
import { useAuth } from "@/lib/auth";
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  ChartData,
  ChartDataset
} from 'chart.js';
import { ThemeCharacter } from '@/components/ThemeCharacter';
import { getThemeConfig, getCurrentLevel, getNextLevel } from '@/utils/themeUtils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [weakestTopics, setWeakestTopics] = useState<Array<{subject: Subject, topic: Topic}>>([]);
  const [recentActivity, setRecentActivity] = useState<Array<{
    subject: {
      id: string;
      name: string;
    };
    topic: string;
    date: string;
    type: string;
    duration: number;
  }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [chartData, setChartData] = useState<{
    activityData: ChartData<'line'>;
    masteryData: ChartData<'doughnut'>;
  }>({
    activityData: {
      labels: [],
      datasets: []
    },
    masteryData: {
      labels: [],
      datasets: []
    }
  });
  const [userTheme, setUserTheme] = useState('dbz');
  const [userXP, setUserXP] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      setIsLoading(true);

      try {
        const subjectsRef = collection(db, "subjects");
        const q = query(subjectsRef, where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        
        const userSubjects = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Subject[];

        setSubjects(userSubjects);

        const weakTopics: Array<{subject: Subject, topic: Topic}> = [];
        userSubjects.forEach((subject: Subject) => {
          if (!subject.topics) return;
          
          subject.topics.forEach(topic => {
            if (topic.masteryLevel < 50) {
              weakTopics.push({ subject, topic });
            }
          });
        });
        
        weakTopics.sort((a, b) => (a.topic.masteryLevel || 0) - (b.topic.masteryLevel || 0));
        setWeakestTopics(weakTopics.slice(0, 5));

        const recentActivities: Array<{
          subject: {
            id: string;
            name: string;
          };
          topic: string;
          date: string;
          type: string;
          duration: number;
        }> = [];

        userSubjects.forEach(subject => {
          if (!subject.sessions) return;
          
          subject.sessions.forEach(session => {
            recentActivities.push({
              subject: {
                id: subject.id,
                name: subject.name
              },
              topic: session.topic,
              date: session.date,
              type: session.type,
              duration: session.duration
            });
          });
        });

        recentActivities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setRecentActivity(recentActivities.slice(0, 5));

        // Calculate total XP and prepare chart data
        const totalXP = userSubjects.reduce((sum, subject) => sum + (subject.xp || 0), 0);
        setUserXP(totalXP);

        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching user data:", error);
        setError("Failed to load dashboard data. Please try again later.");
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  useEffect(() => {
    if (!subjects.length) return;

    // Process data for activity chart
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const activityByDay = last7Days.map(date => {
      return recentActivity.filter(activity => 
        activity.date.split('T')[0] === date
      ).length;
    });

    // Process data for mastery distribution
    const masteryLevels = ['0-20%', '21-40%', '41-60%', '61-80%', '81-100%'];
    const masteryDistribution = new Array(5).fill(0);
    
    subjects.forEach(subject => {
      subject.topics?.forEach(topic => {
        const masteryIndex = Math.floor((topic.masteryLevel || 0) / 20);
        if (masteryIndex >= 0 && masteryIndex < 5) {
          masteryDistribution[masteryIndex]++;
        }
      });
    });

    setChartData({
      activityData: {
        labels: last7Days.map(date => new Date(date).toLocaleDateString('en-US', { weekday: 'short' })),
        datasets: [{
          label: 'Daily Activity', 
          data: activityByDay,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          tension: 0.4
        }]
      },
      masteryData: {
        labels: masteryLevels,
        datasets: [{
          data: masteryDistribution,
          backgroundColor: [
            'rgba(239, 68, 68, 0.5)',
            'rgba(249, 115, 22, 0.5)', 
            'rgba(234, 179, 8, 0.5)',
            'rgba(34, 197, 94, 0.5)',
            'rgba(59, 130, 246, 0.5)'
          ],
          borderColor: [
            'rgb(239, 68, 68)',
            'rgb(249, 115, 22)',
            'rgb(234, 179, 8)', 
            'rgb(34, 197, 94)',
            'rgb(59, 130, 246)'
          ],
          borderWidth: 1
        }]
      }
    });
  }, [subjects, recentActivity]);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-slate-200">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center py-8">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Get the theme information using the utility functions
  const currentLevelString = getCurrentLevel(userTheme, userXP);
  const { name: nextLevelName, progress } = getNextLevel(userTheme, userXP);
  
  // We need to convert the string level to a number for the ThemeCharacter component
  const currentLevelNumber = parseInt(currentLevelString.split(' ').pop() || '0', 10);

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Link
            href="/subjects/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="h-5 w-5" />
            New Subject
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <DashboardCard
            title="Your Subjects"
            count={subjects.length}
            description="Total subjects you're studying"
            href="/subjects"
            icon={BookOpen}
          />
          
          <DashboardCard
            title="Study Time"
            count={subjects.reduce((acc, subject) => acc + (subject.totalStudyTime || 0), 0)}
            description="Total minutes spent studying"
            icon={Clock}
          />
          
          <DashboardCard
            title="Average Mastery"
            count={Math.round(subjects.reduce((acc, subject) => {
              const totalMastery = subject.topics?.reduce((sum, topic) => sum + (topic.masteryLevel || 0), 0) || 0;
              return acc + (totalMastery / (subject.topics?.length || 1));
            }, 0) / (subjects.length || 1))}
            description="Average mastery across all topics"
            icon={Target}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Character and Progress Section */}
          <div className="col-span-1 bg-slate-800 p-6 rounded-lg shadow-lg">
            <ThemeCharacter
              theme={userTheme}
              level={currentLevelNumber}
              xp={userXP}
              isLevelUp={progress >= 100}
            />
            <div className="mt-4 w-full">
              <div className="flex justify-between text-sm text-gray-400">
                <span>{currentLevelString}</span>
                <span>{nextLevelName}</span>
              </div>
              <div className="w-full h-2 bg-gray-700 rounded-full mt-1">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: "#60A5FA" // Use a default blue color
                  }}
                />
              </div>
              <div className="text-center text-sm text-gray-400 mt-1">
                {Math.round(progress)}% to next level
              </div>
            </div>
          </div>

          {/* Activity Chart */}
          <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-white">Activity Last 7 Days</h2>
            <div className="h-64">
              <Line
                data={chartData.activityData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: { color: 'rgb(148, 163, 184)' },
                      grid: { color: 'rgb(51, 65, 85)' }
                    },
                    x: {
                      ticks: { color: 'rgb(148, 163, 184)' },
                      grid: { color: 'rgb(51, 65, 85)' }
                    }
                  },
                  plugins: {
                    legend: {
                      labels: { color: 'rgb(148, 163, 184)' }
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mastery Distribution Chart */}
          <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-white">Mastery Distribution</h2>
            <div className="h-64 flex items-center justify-center">
              <Doughnut
                data={chartData.masteryData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'right' as const,
                      labels: { color: 'rgb(148, 163, 184)' }
                    }
                  }
                }}
              />
            </div>
          </div>
          
          {/* Topics Needing Attention */}
          <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-white">Topics Needing Attention</h2>
            {weakestTopics.length > 0 ? (
              <div className="space-y-4">
                {weakestTopics.map(({ subject, topic }, index) => (
                  <WeakTopicCard
                    key={`${subject.id}-${topic.name}-${index}`}
                    subject={subject}
                    topic={topic}
                  />
                ))}
              </div>
            ) : (
              <p className="text-slate-400">No topics need attention right now.</p>
            )}
          </div>
          
          {/* Recent Activity */}
          <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-white">Recent Activity</h2>
            {recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <RecentActivityCard
                    key={`${activity.subject.id}-${activity.topic}-${index}`}
                    activity={activity}
                  />
                ))}
              </div>
            ) : (
              <p className="text-slate-400">No recent activity to show.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 