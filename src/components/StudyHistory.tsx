import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface StudySession {
  date: string;
  duration: number;
  topic: string;
  confidence: number;
  xpEarned: number;
}

interface StudyHistoryProps {
  sessions: StudySession[];
  subject: string;
  topic?: string;
}

export default function StudyHistory({ sessions, subject, topic }: StudyHistoryProps) {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('week');
  const [streak, setStreak] = useState(0);
  const [totalStudyTime, setTotalStudyTime] = useState(0);

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
    return filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const getChartData = () => {
    const filteredSessions = getFilteredSessions();
    const labels = filteredSessions.map(session => 
      new Date(session.date).toLocaleDateString()
    );
    
    return {
      labels,
      datasets: [
        {
          label: 'Study Time (minutes)',
          data: filteredSessions.map(session => session.duration),
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1,
        },
        {
          label: 'Confidence (%)',
          data: filteredSessions.map(session => session.confidence),
          borderColor: 'rgb(255, 99, 132)',
          tension: 0.1,
        },
        {
          label: 'XP Earned',
          data: filteredSessions.map(session => session.xpEarned),
          borderColor: 'rgb(54, 162, 235)',
          tension: 0.1,
        },
      ],
    };
  };

  return (
    <div className="bg-slate-800 p-6 rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">📊 Study History</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setTimeRange('week')}
            className={`px-3 py-1 rounded ${timeRange === 'week' ? 'bg-blue-600' : 'bg-slate-700'}`}
          >
            Week
          </button>
          <button
            onClick={() => setTimeRange('month')}
            className={`px-3 py-1 rounded ${timeRange === 'month' ? 'bg-blue-600' : 'bg-slate-700'}`}
          >
            Month
          </button>
          <button
            onClick={() => setTimeRange('all')}
            className={`px-3 py-1 rounded ${timeRange === 'all' ? 'bg-blue-600' : 'bg-slate-700'}`}
          >
            All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-700 p-4 rounded-lg">
          <h3 className="text-sm text-gray-400">Current Streak</h3>
          <p className="text-2xl font-bold">{streak} days</p>
        </div>
        <div className="bg-slate-700 p-4 rounded-lg">
          <h3 className="text-sm text-gray-400">Total Study Time</h3>
          <p className="text-2xl font-bold">{totalStudyTime} minutes</p>
        </div>
        <div className="bg-slate-700 p-4 rounded-lg">
          <h3 className="text-sm text-gray-400">Total Sessions</h3>
          <p className="text-2xl font-bold">{sessions.length}</p>
        </div>
      </div>

      <div className="h-64">
        <Line
          data={getChartData()}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
              },
            },
          }}
        />
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-4">Recent Sessions</h3>
        <div className="space-y-2">
          {getFilteredSessions().slice(-5).reverse().map((session, index) => (
            <div key={index} className="bg-slate-700 p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">
                  {new Date(session.date).toLocaleString()}
                </span>
                <span className="text-sm text-gray-400">
                  {session.duration} minutes
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-sm">
                  {topic || session.topic}
                </span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-400">
                    Confidence: {session.confidence}%
                  </span>
                  <span className="text-sm text-blue-400">
                    +{session.xpEarned} XP
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 