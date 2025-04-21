import { useState, useEffect } from 'react';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

interface StudyGoal {
  id: string;
  subject: string;
  topic?: string;
  targetHours: number;
  deadline: string;
  completedHours: number;
  status: 'active' | 'completed' | 'overdue';
}

interface StudyGoalsProps {
  subjects: { [key: string]: any };
  onGoalUpdate: (goal: StudyGoal) => void;
}

export default function StudyGoals({ subjects, onGoalUpdate }: StudyGoalsProps) {
  const [goals, setGoals] = useState<StudyGoal[]>([]);
  const [newGoal, setNewGoal] = useState({
    subject: '',
    topic: '',
    targetHours: 0,
    deadline: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    // Load goals from localStorage
    const savedGoals = localStorage.getItem('studyGoals');
    if (savedGoals) {
      setGoals(JSON.parse(savedGoals));
    }
  }, []);

  useEffect(() => {
    // Save goals to localStorage
    localStorage.setItem('studyGoals', JSON.stringify(goals));
  }, [goals]);

  const handleAddGoal = () => {
    if (!newGoal.subject || !newGoal.targetHours || !newGoal.deadline) {
      setError('Please fill in all required fields');
      return;
    }

    const goal: StudyGoal = {
      id: Date.now().toString(),
      subject: newGoal.subject,
      topic: newGoal.topic,
      targetHours: newGoal.targetHours,
      deadline: newGoal.deadline,
      completedHours: 0,
      status: 'active',
    };

    setGoals([...goals, goal]);
    setNewGoal({
      subject: '',
      topic: '',
      targetHours: 0,
      deadline: '',
    });
    setError('');
  };

  const updateGoalProgress = (goalId: string, hours: number) => {
    const updatedGoals = goals.map(goal => {
      if (goal.id === goalId) {
        const newCompletedHours = goal.completedHours + hours;
        const status = newCompletedHours >= goal.targetHours
          ? 'completed'
          : new Date(goal.deadline) < new Date()
          ? 'overdue'
          : 'active';
        
        return {
          ...goal,
          completedHours: newCompletedHours,
          status,
        };
      }
      return goal;
    });

    setGoals(updatedGoals);
    const updatedGoal = updatedGoals.find(g => g.id === goalId);
    if (updatedGoal) {
      onGoalUpdate(updatedGoal);
    }
  };

  const getProgressData = () => {
    const activeGoals = goals.filter(g => g.status === 'active');
    const completedGoals = goals.filter(g => g.status === 'completed');
    const overdueGoals = goals.filter(g => g.status === 'overdue');

    return {
      labels: ['Active', 'Completed', 'Overdue'],
      datasets: [
        {
          data: [activeGoals.length, completedGoals.length, overdueGoals.length],
          backgroundColor: [
            'rgb(75, 192, 192)',
            'rgb(54, 162, 235)',
            'rgb(255, 99, 132)',
          ],
        },
      ],
    };
  };

  return (
    <div className="bg-slate-800 p-6 rounded-lg">
      <h2 className="text-xl font-semibold mb-4">🎯 Study Goals</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-medium mb-4">Add New Goal</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Subject</label>
              <select
                className="w-full p-2 border rounded bg-slate-700"
                value={newGoal.subject}
                onChange={(e) => setNewGoal({ ...newGoal, subject: e.target.value })}
              >
                <option value="">Select a subject</option>
                {Object.keys(subjects).map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Topic (optional)</label>
              <select
                className="w-full p-2 border rounded bg-slate-700"
                value={newGoal.topic}
                onChange={(e) => setNewGoal({ ...newGoal, topic: e.target.value })}
                disabled={!newGoal.subject}
              >
                <option value="">Select a topic</option>
                {newGoal.subject && Object.keys(subjects[newGoal.subject]?.topics || {}).map((topic) => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Target Hours</label>
              <input
                type="number"
                className="w-full p-2 border rounded bg-slate-700"
                value={newGoal.targetHours}
                onChange={(e) => setNewGoal({ ...newGoal, targetHours: Number(e.target.value) })}
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Deadline</label>
              <input
                type="date"
                className="w-full p-2 border rounded bg-slate-700"
                value={newGoal.deadline}
                onChange={(e) => setNewGoal({ ...newGoal, deadline: e.target.value })}
              />
            </div>

            {error && <p className="text-red-500">{error}</p>}

            <button
              onClick={handleAddGoal}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
            >
              Add Goal
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-4">Goals Progress</h3>
          <div className="h-64 mb-4">
            <Pie
              data={getProgressData()}
              options={{
                responsive: true,
                maintainAspectRatio: false,
              }}
            />
          </div>

          <div className="space-y-2">
            {goals.map((goal) => (
              <div key={goal.id} className="bg-slate-700 p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">
                    {goal.subject} {goal.topic ? `- ${goal.topic}` : ''}
                  </span>
                  <span className={`text-sm ${
                    goal.status === 'completed' ? 'text-green-400' :
                    goal.status === 'overdue' ? 'text-red-400' :
                    'text-blue-400'
                  }`}>
                    {goal.status}
                  </span>
                </div>
                <div className="mt-2">
                  <div className="flex justify-between text-sm text-gray-400 mb-1">
                    <span>{goal.completedHours} / {goal.targetHours} hours</span>
                    <span>Due: {new Date(goal.deadline).toLocaleDateString()}</span>
                  </div>
                  <div className="w-full bg-slate-600 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${(goal.completedHours / goal.targetHours) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 