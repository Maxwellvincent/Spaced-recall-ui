"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { calculateXP } from '@/lib/xpSystem';
import { generateQuestions, evaluateReasoningAnswer } from '@/lib/aiQuestionGenerator';
import ProgressVisualization from './ProgressVisualization';
import { generateStudyPrompt, evaluateUserAnswer } from '@/lib/openai';

interface Question {
  id: string;
  question: string;
  type: 'reasoning' | 'mcq' | 'calculation';
  options?: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  steps?: string[]; // For calculation questions
}

interface Feedback {
  score: number;
  detailedFeedback: string;
  strengths: string[];
  areasForImprovement: string[];
  suggestedResources: string[];
  masteryLevel: 'beginner' | 'intermediate' | 'advanced' | 'master';
}

interface StudyVerificationProps {
  subject: string;
  topic: string;
  studyDuration: number;
  studyType: 'reading' | 'practice' | 'review';
  onComplete: (xpEarned: number) => void;
}

export default function StudyVerification({
  subject,
  topic,
  studyDuration,
  studyType,
  onComplete
}: StudyVerificationProps) {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [masteryLevel, setMasteryLevel] = useState<'beginner' | 'intermediate' | 'advanced' | 'master'>('beginner');
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [showProgress, setShowProgress] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [masteryProgress, setMasteryProgress] = useState({
    currentLevel: 'beginner' as const,
    progressToNext: 0,
    nextLevel: 'intermediate' as const
  });

  useEffect(() => {
    fetchMasteryLevel();
    generateQuestions();
  }, [subject, topic, difficulty]);

  const fetchMasteryLevel = async () => {
    if (!user) return;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const topicData = userData.subjects?.[subject]?.[topic] || {};
        const totalSessions = topicData.studySessions?.length || 0;
        const averageScore = topicData.studySessions?.reduce((acc: number, session: any) => acc + session.score, 0) / totalSessions || 0;

        // Determine mastery level based on sessions and performance
        if (totalSessions >= 10 && averageScore >= 90) {
          setMasteryLevel('master');
        } else if (totalSessions >= 5 && averageScore >= 80) {
          setMasteryLevel('advanced');
        } else if (totalSessions >= 3 && averageScore >= 70) {
          setMasteryLevel('intermediate');
        } else {
          setMasteryLevel('beginner');
        }
      }
    } catch (error) {
      console.error('Error fetching mastery level:', error);
    }
  };

  const generateQuestions = async () => {
    try {
      setLoading(true);
      const numQuestions = Math.floor(Math.random() * 16) + 5; // 5-20 questions
      const generatedQuestions = await generateQuestions({
        subject,
        topic,
        masteryLevel,
        difficulty,
        numQuestions
      });
      setQuestions(generatedQuestions);
    } catch (error) {
      setError('Failed to generate questions. Please try again.');
      console.error('Error generating questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = async (answer: string) => {
    setSelectedAnswer(answer);
    
    if (currentQuestion.type === 'reasoning') {
      try {
        const evaluation = await evaluateReasoningAnswer(
          currentQuestion.question,
          answer
        );
        
        // Calculate mastery progress
        const newScore = score + evaluation.score;
        const progress = calculateMasteryProgress(newScore, questions.length);
        setMasteryProgress(progress);
        
        // Generate detailed feedback
        const detailedFeedback = await generateDetailedFeedback(
          currentQuestion.question,
          answer,
          evaluation.score
        );
        
        setFeedback({
          score: evaluation.score,
          detailedFeedback: detailedFeedback.feedback,
          strengths: detailedFeedback.strengths,
          areasForImprovement: detailedFeedback.areasForImprovement,
          suggestedResources: detailedFeedback.suggestedResources,
          masteryLevel: progress.currentLevel
        });
        
        setScore(newScore);
        setShowFeedback(true);
      } catch (error) {
        console.error('Error evaluating answer:', error);
      }
    } else if (answer === currentQuestion.correctAnswer) {
      const newScore = score + 100;
      const progress = calculateMasteryProgress(newScore, questions.length);
      setMasteryProgress(progress);
      setScore(newScore);
    }
  };

  const calculateMasteryProgress = (currentScore: number, totalQuestions: number) => {
    const averageScore = currentScore / totalQuestions;
    let currentLevel: 'beginner' | 'intermediate' | 'advanced' | 'master' = 'beginner';
    let nextLevel: 'beginner' | 'intermediate' | 'advanced' | 'master' = 'intermediate';
    let progressToNext = 0;

    if (averageScore >= 90) {
      currentLevel = 'master';
      nextLevel = 'master';
      progressToNext = 100;
    } else if (averageScore >= 80) {
      currentLevel = 'advanced';
      nextLevel = 'master';
      progressToNext = ((averageScore - 80) / 10) * 100;
    } else if (averageScore >= 70) {
      currentLevel = 'intermediate';
      nextLevel = 'advanced';
      progressToNext = ((averageScore - 70) / 10) * 100;
    } else {
      currentLevel = 'beginner';
      nextLevel = 'intermediate';
      progressToNext = (averageScore / 70) * 100;
    }

    return { currentLevel, progressToNext, nextLevel };
  };

  const generateDetailedFeedback = async (
    question: string,
    answer: string,
    score: number
  ): Promise<{
    feedback: string;
    strengths: string[];
    areasForImprovement: string[];
    suggestedResources: string[];
  }> => {
    try {
      const feedback = await evaluateUserAnswer(question, answer);
      return {
        feedback,
        strengths: [],
        areasForImprovement: [],
        suggestedResources: []
      };
    } catch (error) {
      console.error('Error generating feedback:', error);
      return {
        feedback: 'Unable to generate detailed feedback at this time.',
        strengths: [],
        areasForImprovement: [],
        suggestedResources: []
      };
    }
  };

  const handleNext = async () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setUserAnswer('');
    } else {
      // Calculate XP based on performance and mastery level
      const performance = score / questions.length;
      const xpEarned = calculateXP({
        type: 'quiz',
        duration: studyDuration,
        difficulty: difficulty === 'easy' ? 5 : difficulty === 'medium' ? 7 : 10,
        performance: performance * 100,
        timeTaken: studyDuration,
        masteryLevel
      });

      // Update user's progress in Firestore
      if (user) {
        const userDoc = doc(db, 'users', user.uid);
        const userData = await getDoc(userDoc);
        
        if (userData.exists()) {
          const userSubjects = userData.data().subjects || {};
          const subjectData = userSubjects[subject] || {};
          const topicData = subjectData[topic] || {};

          await updateDoc(userDoc, {
            [`subjects.${subject}.${topic}`]: {
              ...topicData,
              lastStudied: new Date().toISOString(),
              studySessions: [
                ...(topicData.studySessions || []),
                {
                  date: new Date().toISOString(),
                  duration: studyDuration,
                  type: studyType,
                  score: performance * 100,
                  difficulty,
                  xpEarned,
                  masteryLevel
                }
              ]
            }
          });
        }
      }

      onComplete(xpEarned);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 text-red-700 rounded-lg">
        {error}
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="p-4 bg-yellow-100 text-yellow-700 rounded-lg">
        No questions available for this topic yet.
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="space-y-8">
      <div className="p-6 bg-white rounded-lg shadow-lg">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Study Verification</h2>
          <p className="text-gray-600">
            Please answer these questions to verify your understanding of {topic}.
            Current mastery level: {masteryLevel}
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Question Difficulty
          </label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
            className="w-full p-2 border rounded-lg"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <div className="mb-6">
          <p className="text-lg font-medium mb-4">{currentQuestion.question}</p>
          
          {currentQuestion.type === 'mcq' && (
            <div className="space-y-2">
              {currentQuestion.options?.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswer(option)}
                  className={`w-full p-3 text-left rounded-lg border ${
                    selectedAnswer === option
                      ? 'bg-blue-100 border-blue-500'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          {currentQuestion.type === 'reasoning' && (
            <div className="space-y-4">
              <textarea
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                className="w-full p-3 border rounded-lg"
                rows={4}
                placeholder="Type your explanation here..."
              />
              <button
                onClick={() => handleAnswer(userAnswer)}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
              >
                Submit Answer
              </button>
            </div>
          )}

          {currentQuestion.type === 'calculation' && (
            <div className="space-y-4">
              <input
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                className="w-full p-3 border rounded-lg"
                placeholder="Enter your answer"
              />
              {currentQuestion.steps && (
                <div className="mt-4">
                  <h3 className="font-medium mb-2">Steps to solve:</h3>
                  <ol className="list-decimal pl-5 space-y-1">
                    {currentQuestion.steps.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}
              <button
                onClick={() => handleAnswer(userAnswer)}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
              >
                Submit Answer
              </button>
            </div>
          )}
        </div>

        {selectedAnswer && (
          <div className="mb-6">
            <p className={`font-medium ${
              selectedAnswer === currentQuestion.correctAnswer
                ? 'text-green-600'
                : 'text-red-600'
            }`}>
              {selectedAnswer === currentQuestion.correctAnswer
                ? 'Correct!'
                : 'Incorrect'}
            </p>
            <p className="text-gray-600 mt-2">{currentQuestion.explanation}</p>
          </div>
        )}

        {showFeedback && feedback && (
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Detailed Feedback</h3>
            
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-lg font-medium">Score: {feedback.score}/100</span>
                <span className={`px-3 py-1 rounded-full ${
                  feedback.score >= 80 ? 'bg-green-100 text-green-800' :
                  feedback.score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {feedback.masteryLevel}
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                <div
                  className="bg-blue-600 h-2.5 rounded-full"
                  style={{ width: `${masteryProgress.progressToNext}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600">
                Progress to {masteryProgress.nextLevel}: {masteryProgress.progressToNext.toFixed(1)}%
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="font-medium mb-2">Analysis</h4>
                <p className="text-gray-700">{feedback.detailedFeedback}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Strengths</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {feedback.strengths.map((strength, index) => (
                      <li key={index} className="text-green-700">{strength}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Areas for Improvement</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {feedback.areasForImprovement.map((area, index) => (
                      <li key={index} className="text-red-700">{area}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Suggested Resources</h4>
                <ul className="list-disc pl-5 space-y-1">
                  {feedback.suggestedResources.map((resource, index) => (
                    <li key={index} className="text-blue-700">{resource}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center">
          <div>
            Question {currentQuestionIndex + 1} of {questions.length}
          </div>
          <button
            onClick={handleNext}
            disabled={!selectedAnswer}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Complete'}
          </button>
        </div>

        <div className="mt-6">
          <button
            onClick={() => setShowProgress(!showProgress)}
            className="text-blue-600 hover:text-blue-800"
          >
            {showProgress ? 'Hide Progress' : 'Show Progress'}
          </button>
        </div>
      </div>

      {showProgress && (
        <ProgressVisualization
          subject={subject}
          topic={topic}
        />
      )}
    </div>
  );
} 