import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { Flame, Brain, Star, Scroll, Trophy, Clock } from 'lucide-react';

interface StudySession {
  date: string;
  duration: number;
  topic: string;
  confidence: number;
  xpEarned: number;
  jutsuMastery?: {
    chakraControl: number;
    technique: number;
    understanding: number;
  };
}

interface StudyHistoryProps {
  sessions: StudySession[];
  subject: string;
  topic?: string;
}

interface UserPreferences {
  theme: string;
  character?: string;
}

export default function StudyHistory({ sessions, subject, topic }: StudyHistoryProps) {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('week');
  const [streak, setStreak] = useState(0);
  const [totalStudyTime, setTotalStudyTime] = useState(0);
  const [userTheme, setUserTheme] = useState("classic");
  const [userCharacter, setUserCharacter] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchUserPreferences = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data() as UserPreferences;
          setUserTheme(userData.theme || "classic");
          setUserCharacter(userData.character || null);
        }
      } catch (err) {
        console.error('Error fetching user preferences:', err);
      }
    };

    fetchUserPreferences();
  }, [user]);

  useEffect(() => {
    // Calculate streak
    let currentStreak = 0;
    let lastDate = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Sort sessions by date
    const sortedSessions = [...sessions].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate total study time
    const totalTime = sessions.reduce((sum, session) => sum + session.duration, 0);
    setTotalStudyTime(totalTime);

    // Calculate streak
    for (let i = sortedSessions.length - 1; i >= 0; i--) {
      const sessionDate = new Date(sortedSessions[i].date);
      sessionDate.setHours(0, 0, 0, 0);

      if (i === sortedSessions.length - 1) {
        if (sessionDate.getTime() === today.getTime()) {
          currentStreak = 1;
          lastDate = sessionDate;
        } else {
          break;
        }
      } else {
        const diffDays = Math.floor((lastDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          currentStreak++;
          lastDate = sessionDate;
        } else if (diffDays > 1) {
          break;
        }
      }
    }
    setStreak(currentStreak);
  }, [sessions]);

  const getFilteredSessions = () => {
    const now = new Date();
    const filtered = sessions.filter(session => {
      const sessionDate = new Date(session.date);
      switch (timeRange) {
        case 'week':
          return now.getTime() - sessionDate.getTime() <= 7 * 24 * 60 * 60 * 1000;
        case 'month':
          return now.getTime() - sessionDate.getTime() <= 30 * 24 * 60 * 60 * 1000;
        default:
          return true;
      }
    });
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const getChartData = () => {
    const filteredSessions = getFilteredSessions();
    const labels = filteredSessions.map(session => 
      new Date(session.date).toLocaleDateString()
    );
    
    const datasets = [
      {
        label: userTheme === "naruto" ? 'Training Time (minutes)' : 'Study Time (minutes)',
        data: filteredSessions.map(session => session.duration),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
      {
        label: 'XP Earned',
        data: filteredSessions.map(session => session.xpEarned),
        borderColor: 'rgb(54, 162, 235)',
        tension: 0.1,
      }
    ];

    if (userTheme === "naruto") {
      const jutsuDatasets = [
        {
          label: 'Chakra Control',
          data: filteredSessions.map(session => session.jutsuMastery?.chakraControl || 0),
          borderColor: 'rgb(249, 115, 22)', // orange-500
          tension: 0.1,
        },
        {
          label: 'Technique',
          data: filteredSessions.map(session => session.jutsuMastery?.technique || 0),
          borderColor: 'rgb(234, 88, 12)', // orange-600
          tension: 0.1,
        },
        {
          label: 'Understanding',
          data: filteredSessions.map(session => session.jutsuMastery?.understanding || 0),
          borderColor: 'rgb(194, 65, 12)', // orange-700
          tension: 0.1,
        }
      ];
      return { labels, datasets: [...datasets, ...jutsuDatasets] };
    }

    return { labels, datasets };
  };

  const getAverageJutsuMastery = () => {
    if (!sessions.length) return { chakraControl: 0, technique: 0, understanding: 0 };
    
    const jutsuSessions = sessions.filter(session => session.jutsuMastery);
    if (!jutsuSessions.length) return { chakraControl: 0, technique: 0, understanding: 0 };

    return {
      chakraControl: Math.round(
        jutsuSessions.reduce((sum, session) => sum + (session.jutsuMastery?.chakraControl || 0), 0) / jutsuSessions.length
      ),
      technique: Math.round(
        jutsuSessions.reduce((sum, session) => sum + (session.jutsuMastery?.technique || 0), 0) / jutsuSessions.length
      ),
      understanding: Math.round(
        jutsuSessions.reduce((sum, session) => sum + (session.jutsuMastery?.understanding || 0), 0) / jutsuSessions.length
      )
    };
  };

  return (
    <div className="bg-slate-800 p-6 rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          {userTheme === "naruto" ? (
            <>
              <Scroll className="h-5 w-5 text-orange-400" />
              Training History
            </>
          ) : (
            <>
              <Scroll className="h-5 w-5 text-blue-400" />
              Study History
            </>
          )}
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setTimeRange('week')}
            className={`px-3 py-1 rounded ${
              timeRange === 'week' 
                ? userTheme === "naruto" ? 'bg-orange-600' : 'bg-blue-600'
                : 'bg-slate-700'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setTimeRange('month')}
            className={`px-3 py-1 rounded ${
              timeRange === 'month'
                ? userTheme === "naruto" ? 'bg-orange-600' : 'bg-blue-600'
                : 'bg-slate-700'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setTimeRange('all')}
            className={`px-3 py-1 rounded ${
              timeRange === 'all'
                ? userTheme === "naruto" ? 'bg-orange-600' : 'bg-blue-600'
                : 'bg-slate-700'
            }`}
          >
            All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-700 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-sm text-gray-400">
              {userTheme === "naruto" ? "Training Streak" : "Study Streak"}
            </h3>
            <Flame className={`h-5 w-5 ${userTheme === "naruto" ? "text-orange-400" : "text-blue-400"}`} />
          </div>
          <p className="text-2xl font-bold">{streak} days</p>
        </div>
        <div className="bg-slate-700 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-sm text-gray-400">Total Time</h3>
            <Clock className={`h-5 w-5 ${userTheme === "naruto" ? "text-orange-400" : "text-blue-400"}`} />
          </div>
          <p className="text-2xl font-bold">{Math.round(totalStudyTime / 60)}h {totalStudyTime % 60}m</p>
        </div>
        <div className="bg-slate-700 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-sm text-gray-400">Total Sessions</h3>
            <Trophy className={`h-5 w-5 ${userTheme === "naruto" ? "text-orange-400" : "text-blue-400"}`} />
          </div>
          <p className="text-2xl font-bold">{sessions.length}</p>
        </div>
      </div>

      {userTheme === "naruto" && (
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-4">Jutsu Mastery Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(getAverageJutsuMastery()).map(([key, value]) => (
              <div key={key} className="bg-slate-700 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-400 mb-2">
                  {key.split(/(?=[A-Z])/).join(" ")}
                </h4>
                <div className="w-full bg-slate-600 rounded-full h-2">
                  <div
                    className="bg-orange-500 rounded-full h-2 transition-all duration-300"
                    style={{ width: `${value}%` }}
                  />
                </div>
                <div className="mt-1 text-right text-sm text-orange-400">{value}%</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="h-64 mb-6">
        <Line
          data={getChartData()}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                grid: {
                  color: 'rgba(255, 255, 255, 0.1)'
                }
              },
              x: {
                grid: {
                  color: 'rgba(255, 255, 255, 0.1)'
                }
              }
            },
            plugins: {
              legend: {
                labels: {
                  color: 'rgb(229, 231, 235)' // text-gray-200
                }
              }
            }
          }}
        />
      </div>

      <div>
        <h3 className="text-lg font-medium mb-4">Recent Sessions</h3>
        <div className="space-y-2">
          {getFilteredSessions().slice(0, 5).map((session, index) => (
            <div key={index} className="bg-slate-700 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-gray-200">
                  {new Date(session.date).toLocaleString()}
                </span>
                <span className={`text-sm ${userTheme === "naruto" ? "text-orange-400" : "text-blue-400"}`}>
                  {session.duration} minutes
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">
                  {topic || session.topic}
                </span>
                <span className="text-sm text-green-400">
                  +{session.xpEarned} XP
                </span>
              </div>
              {userTheme === "naruto" && session.jutsuMastery && (
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {Object.entries(session.jutsuMastery).map(([key, value]) => (
                    <div key={key} className="text-xs">
                      <span className="text-gray-400">
                        {key.split(/(?=[A-Z])/).join(" ")}:
                      </span>
                      <span className="ml-1 text-orange-400">{value}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 