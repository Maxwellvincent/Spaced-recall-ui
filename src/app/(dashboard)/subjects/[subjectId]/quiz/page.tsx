"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Brain, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import type { Subject, Topic } from '@/types/study';

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  topic: string;
  concept: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface PageProps {
  params: {
    subjectId: string;
  }
}

export default function QuizPage({ params }: PageProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isGenerating, setIsGenerating] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const quizType = searchParams.get('type') || 'all';
  const topicsList = searchParams.get('topics')?.split(',') || [];

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    const fetchSubjectAndGenerateQuiz = async () => {
      try {
        // Fetch subject data
        const subjectRef = doc(db, 'subjects', params.subjectId);
        const subjectDoc = await getDoc(subjectRef);
        
        if (!subjectDoc.exists()) {
          setError('Subject not found');
          return;
        }

        const subjectData = subjectDoc.data() as Subject;
        setSubject(subjectData);

        // Filter topics based on quiz type
        const selectedTopics = subjectData.topics.filter(topic => 
          topicsList.includes(topic.name)
        );

        // Generate quiz questions
        const response = await fetch('/api/generate-quiz', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subject: subjectData.name,
            topics: selectedTopics.map(topic => ({
              name: topic.name,
              concepts: topic.concepts || [],
              masteryLevel: topic.masteryLevel || 0
            })),
            questionCount: 10,
            quizType
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to generate quiz questions');
        }

        const data = await response.json();
        setQuestions(data.questions);
        setIsGenerating(false);
      } catch (error) {
        console.error('Error:', error);
        setError('Failed to generate quiz. Please try again.');
        setIsGenerating(false);
      }
    };

    fetchSubjectAndGenerateQuiz();
  }, [user, loading, params.subjectId, quizType, topicsList, router]);

  const handleAnswerSelect = (answer: string) => {
    if (isAnswered) return;
    
    setSelectedAnswer(answer);
    setIsAnswered(true);

    if (answer === questions[currentQuestionIndex].correctAnswer) {
      setScore(score + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      // Quiz completed
      const finalScore = (score / questions.length) * 100;
      
      toast.success(`Quiz completed! Score: ${Math.round(finalScore)}%`);
      
      // Navigate back to subject page
      router.push(`/subjects/${params.subjectId}`);
    }
  };

  if (loading || isGenerating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-slate-200">
            {loading ? 'Loading...' : 'Generating quiz questions...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="bg-red-900/20 p-8 rounded-lg text-center max-w-md">
          <h2 className="text-2xl font-bold text-red-400 mb-4">Error</h2>
          <p className="text-slate-300 mb-6">{error}</p>
          <Link 
            href={`/subjects/${params.subjectId}`}
            className="inline-block bg-slate-800 text-white px-6 py-2 rounded-lg hover:bg-slate-700 transition"
          >
            Return to Subject
          </Link>
        </div>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-slate-200">Preparing your quiz...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link 
            href={`/subjects/${params.subjectId}`}
            className="text-blue-400 hover:text-blue-300 transition mb-2 inline-block"
          >
            <ArrowLeft className="h-4 w-4 inline mr-2" />
            Back to Subject
          </Link>
          <h1 className="text-3xl font-bold">
            {quizType === 'weak' ? 'Focus Practice' : 'Comprehensive Quiz'}
          </h1>
          <p className="text-slate-400 mt-2">
            Question {currentQuestionIndex + 1} of {questions.length}
          </p>
        </div>

        <Card className="border-slate-700 bg-slate-800/50 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center text-slate-100">
              <Brain className="h-5 w-5 mr-2 text-blue-400" />
              {currentQuestion.topic} • {currentQuestion.concept}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg mb-6">{currentQuestion.question}</p>
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(option)}
                  disabled={isAnswered}
                  className={`w-full text-left p-4 rounded-lg transition ${
                    isAnswered
                      ? option === currentQuestion.correctAnswer
                        ? 'bg-green-500/20 border-green-500'
                        : option === selectedAnswer
                        ? 'bg-red-500/20 border-red-500'
                        : 'bg-slate-700/50 border-slate-600'
                      : 'bg-slate-700/50 border-slate-600 hover:bg-slate-600/50'
                  } border`}
                >
                  {option}
                </button>
              ))}
            </div>
            {isAnswered && (
              <div className="mt-6 p-4 rounded-lg bg-slate-700/30">
                <p className={`font-medium ${
                  selectedAnswer === currentQuestion.correctAnswer
                    ? 'text-green-400'
                    : 'text-red-400'
                }`}>
                  {selectedAnswer === currentQuestion.correctAnswer
                    ? 'Correct!'
                    : 'Incorrect'}
                </p>
                <p className="text-slate-300 mt-2">{currentQuestion.explanation}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between items-center">
          <div className="text-slate-400">
            Score: {score}/{currentQuestionIndex + 1}
          </div>
          {isAnswered && (
            <Button
              onClick={handleNextQuestion}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
} 