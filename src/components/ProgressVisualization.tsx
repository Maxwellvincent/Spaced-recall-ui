import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
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
  BarElement
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement
);

interface ProgressData {
  dates: string[];
  scores: number[];
  xp: number[];
  masteryLevel: string;
  totalSessions: number;
  averageScore: number;
  topicDistribution: {
    [key: string]: number;
  };
  questionTypes: {
    reasoning: number;
    mcq: number;
    calculation: number;
  };
  difficultyDistribution: {
    easy: number;
    medium: number;
    hard: number;
  };
  timeSpent: number[];
  streak: number;
  nextMilestone: {
    level: string;
    sessionsNeeded: number;
    scoreNeeded: number;
  };
}

interface ProgressVisualizationProps {
  subject: string;
  topic: string;
}

export default function ProgressVisualization({
  subject,
  topic
}: ProgressVisualizationProps) {
  const { user } = useAuth();
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'all'>('all');
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchProgressData();
  }, [subject, topic]);

  const fetchProgressData = async () => {
    if (!user) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const topicData = userData.subjects?.[subject]?.[topic] || {};
        const sessions = topicData.studySessions || [];

        const dates = sessions.map((session: any) => 
          new Date(session.date).toLocaleDateString()
        );
        const scores = sessions.map((session: any) => session.score);
        const xp = sessions.map((session: any) => session.xpEarned);

        // Calculate mastery level
        const totalSessions = sessions.length;
        const averageScore = scores.reduce((a: number, b: number) => a + b, 0) / totalSessions;
        let masteryLevel = 'beginner';
        if (totalSessions >= 10 && averageScore >= 90) {
          masteryLevel = 'master';
        } else if (totalSessions >= 5 && averageScore >= 80) {
          masteryLevel = 'advanced';
        } else if (totalSessions >= 3 && averageScore >= 70) {
          masteryLevel = 'intermediate';
        }

        // Calculate topic distribution
        const topicDistribution: { [key: string]: number } = {};
        sessions.forEach((session: any) => {
          const date = new Date(session.date).toLocaleDateString();
          topicDistribution[date] = (topicDistribution[date] || 0) + 1;
        });

        // Calculate question types
        const questionTypes: { reasoning: number; mcq: number; calculation: number } = {
          reasoning: 0,
          mcq: 0,
          calculation: 0
        };
        sessions.forEach((session: any) => {
          if (session.questionType === 'reasoning') {
            questionTypes.reasoning++;
          } else if (session.questionType === 'mcq') {
            questionTypes.mcq++;
          } else if (session.questionType === 'calculation') {
            questionTypes.calculation++;
          }
        });

        // Calculate difficulty distribution
        const difficultyDistribution: { easy: number; medium: number; hard: number } = {
          easy: 0,
          medium: 0,
          hard: 0
        };
        sessions.forEach((session: any) => {
          if (session.difficulty === 'easy') {
            difficultyDistribution.easy++;
          } else if (session.difficulty === 'medium') {
            difficultyDistribution.medium++;
          } else if (session.difficulty === 'hard') {
            difficultyDistribution.hard++;
          }
        });

        // Calculate time spent
        const timeSpent = sessions.map((session: any) => session.timeSpent);

        // Calculate streak
        let streak = 0;
        for (let i = sessions.length - 1; i >= 0; i--) {
          if (sessions[i].score === 100) {
            streak++;
          } else {
            break;
          }
        }

        // Calculate next milestone
        let nextMilestone: { level: string; sessionsNeeded: number; scoreNeeded: number } | null = null;
        if (masteryLevel === 'beginner') {
          nextMilestone = {
            level: 'intermediate',
            sessionsNeeded: 3,
            scoreNeeded: 70
          };
        } else if (masteryLevel === 'intermediate') {
          nextMilestone = {
            level: 'advanced',
            sessionsNeeded: 5,
            scoreNeeded: 80
          };
        } else if (masteryLevel === 'advanced') {
          nextMilestone = {
            level: 'master',
            sessionsNeeded: 10,
            scoreNeeded: 90
          };
        }

        setProgressData({
          dates,
          scores,
          xp,
          masteryLevel,
          totalSessions,
          averageScore,
          topicDistribution,
          questionTypes,
          difficultyDistribution,
          timeSpent,
          streak,
          nextMilestone
        });
      }
    } catch (error) {
      console.error('Error fetching progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMasteryLevelColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'text-gray-500';
      case 'intermediate': return 'text-blue-500';
      case 'advanced': return 'text-purple-500';
      case 'master': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  const getMasteryLevelIcon = (level: string) => {
    switch (level) {
      case 'beginner': return '🌱';
      case 'intermediate': return '🌿';
      case 'advanced': return '🌳';
      case 'master': return '🏆';
      default: return '🌱';
    }
  };

  const getNextSteps = (level: string) => {
    switch (level) {
      case 'beginner':
        return [
          'Complete 3 more sessions to reach intermediate level',
          'Focus on understanding core concepts',
          'Practice with reasoning questions',
          'Aim for 70% average score'
        ];
      case 'intermediate':
        return [
          'Complete 5 more sessions to reach advanced level',
          'Work on application of concepts',
          'Try more challenging questions',
          'Aim for 80% average score'
        ];
      case 'advanced':
        return [
          'Complete 10 more sessions to reach master level',
          'Focus on complex problem-solving',
          'Teach concepts to others',
          'Aim for 90% average score'
        ];
      case 'master':
        return [
          'Maintain your mastery level',
          'Help others learn the topic',
          'Explore advanced applications',
          'Consider creating study materials'
        ];
      default:
        return [];
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!progressData) {
    return (
      <div className="p-4 bg-yellow-100 text-yellow-700 rounded-lg">
        No progress data available yet.
      </div>
    );
  }

  const scoreChartData = {
    labels: progressData.dates,
    datasets: [
      {
        label: 'Performance Score',
        data: progressData.scores,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      }
    ]
  };

  const xpChartData = {
    labels: progressData.dates,
    datasets: [
      {
        label: 'XP Earned',
        data: progressData.xp,
        borderColor: 'rgb(255, 99, 132)',
        tension: 0.1
      }
    ]
  };

  const topicDistributionData = {
    labels: Object.keys(progressData.topicDistribution),
    datasets: [
      {
        data: Object.values(progressData.topicDistribution),
        backgroundColor: [
          'rgba(255, 99, 132, 0.5)',
          'rgba(54, 162, 235, 0.5)',
          'rgba(255, 206, 86, 0.5)',
          'rgba(75, 192, 192, 0.5)',
          'rgba(153, 102, 255, 0.5)'
        ]
      }
    ]
  };

  const masteryLevelColor = getMasteryLevelColor(progressData.masteryLevel);
  const masteryLevelIcon = getMasteryLevelIcon(progressData.masteryLevel);
  const nextSteps = getNextSteps(progressData.masteryLevel);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Performance Over Time</h3>
          <div className="mb-4">
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value as 'week' | 'month' | 'all')}
              className="p-2 border rounded"
            >
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="all">All Time</option>
            </select>
          </div>
          <Line data={scoreChartData} />
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">XP Progression</h3>
          <Line data={xpChartData} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Study Distribution</h3>
          <Doughnut data={topicDistributionData} />
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Mastery Level</h3>
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{masteryLevelIcon}</span>
            <span className={`text-2xl font-bold ${masteryLevelColor}`}>
              {progressData.masteryLevel}
            </span>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Sessions:</span>
              <span className="font-medium">{progressData.totalSessions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Average Score:</span>
              <span className="font-medium">{progressData.averageScore.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Current Streak:</span>
              <span className="font-medium">{progressData.streak} days</span>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Next Milestone</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Target Level:</span>
              <span className="font-medium">{progressData.nextMilestone.level}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Sessions Needed:</span>
              <span className="font-medium">{progressData.nextMilestone.sessionsNeeded}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Score Target:</span>
              <span className="font-medium">{progressData.nextMilestone.scoreNeeded}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Question Type Distribution</h3>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-blue-600 hover:text-blue-800"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
        </div>
        <Bar data={{
          labels: ['Reasoning', 'MCQ', 'Calculation'],
          datasets: [{
            label: 'Questions',
            data: [
              progressData.questionTypes.reasoning,
              progressData.questionTypes.mcq,
              progressData.questionTypes.calculation
            ],
            backgroundColor: [
              'rgba(75, 192, 192, 0.5)',
              'rgba(54, 162, 235, 0.5)',
              'rgba(255, 99, 132, 0.5)'
            ]
          }]
        }} />
      </div>

      {showDetails && (
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Next Steps</h3>
          <ul className="space-y-2">
            {nextSteps.map((step, index) => (
              <li key={index} className="flex items-start">
                <span className="mr-2">•</span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
} 