import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Brain, TrendingUp, TrendingDown, Target, Calendar, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ReviewScheduler } from '@/components/ReviewScheduler';
import { getFirebaseDb } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import type { Topic } from '@/types/study';
import Link from 'next/link';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { cn } from '@/lib/utils';

dayjs.extend(relativeTime);

const MASTERY_THRESHOLD = 70; // Topics below this mastery level are considered weak
const REVIEW_THRESHOLD_DAYS = 7; // Topics not studied in this many days are considered for review

interface TopicPerformance {
  name: string;
  masteryLevel: number;
  lastStudied: string;
  nextReview?: string;
  reviewInterval?: number;
  hasActivity: boolean;
  concepts: Array<{
    name: string;
    masteryLevel: number;
    nextReview?: string;
    reviewInterval?: number;
  }>;
}

interface SubjectAnalyticsProps {
  subjectId: string;
  topics: Topic[];
  progress?: {
    totalXP: number;
    averageMastery: number;
    completedTopics: number;
    totalTopics: number;
    lastStudied?: string;
  };
  themeStyles?: any; // Accept themeStyles for theme-specific colors
}

export function SubjectAnalytics({ 
  subjectId, 
  topics = [],
  progress = { 
    totalXP: 0, 
    averageMastery: 0, 
    completedTopics: 0, 
    totalTopics: 0 
  },
  themeStyles = {} // Default to empty object
}: SubjectAnalyticsProps) {
  const router = useRouter();
  const [quizType, setQuizType] = useState<'all' | 'weak'>('all');
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);

  // Use getFirebaseDb() to ensure proper initialization
  const db = getFirebaseDb();

  // Add debug logging
  useEffect(() => {
    console.log('SubjectAnalytics received props:', {
      subjectId,
      topicsCount: topics.length,
      progress,
      calculatedTotalXP: topics.reduce((sum, t) => sum + (t.xp || 0), 0),
      calculatedAverageMastery: Math.floor(
        topics.reduce((sum, t) => sum + (t.masteryLevel || 0), 0) / 
        (topics.length || 1)
      )
    });
  }, [subjectId, topics, progress]);

  // Calculate topic performance
  const topicPerformance = topics.map(topic => ({
    name: topic.name,
    masteryLevel: topic.masteryLevel || 0,
    lastStudied: topic.lastStudied || '',
    nextReview: topic.nextReview,
    reviewInterval: topic.reviewInterval,
    hasActivity: Boolean(
      (topic.studySessions && topic.studySessions.length > 0) || 
      (topic.concepts && topic.concepts.some(c => c.studySessions && c.studySessions.length > 0)) ||
      topic.xp > 0
    ),
    concepts: topic.concepts?.map(concept => ({
      name: concept.name,
      masteryLevel: concept.masteryLevel || 0,
      nextReview: concept.nextReview,
      reviewInterval: concept.reviewInterval
    })) || []
  }));

  // Filter and sort topics by mastery level
  const activeTopics = topicPerformance.filter(topic => topic.hasActivity);
  const sortedTopics = [...activeTopics].sort((a, b) => a.masteryLevel - b.masteryLevel);
  const weakestTopics = sortedTopics.filter(topic => topic.masteryLevel < 70).slice(0, 3);
  const strongestTopics = [...activeTopics]
    .sort((a, b) => b.masteryLevel - a.masteryLevel)
    .filter(topic => topic.masteryLevel >= 70)
    .slice(0, 3);

  const handleScheduleUpdate = async (topicName: string, nextReview: string, interval: number) => {
    const subjectRef = doc(db, 'subjects', subjectId);
    const updatedTopics = topics.map(topic => {
      if (topic.name === topicName) {
        return {
          ...topic,
          nextReview,
          reviewInterval: interval
        };
      }
      return topic;
    });

    await updateDoc(subjectRef, {
      topics: updatedTopics
    });
  };

  const startQuiz = () => {
    const quizParams = new URLSearchParams({
      type: quizType,
      topics: quizType === 'weak' 
        ? weakestTopics.map(t => t.name).join(',')
        : topics.map(t => t.name).join(',')
    });
    router.push(`/subjects/${subjectId}/quiz?${quizParams.toString()}`);
  };

  const calculateWeakAreas = (topics: Topic[]): Topic[] => {
    console.log('Calculating weak areas:', {
      totalTopics: topics.length,
      topicsWithMastery: topics.map(t => ({
        name: t.name,
        mastery: t.masteryLevel,
        lastStudied: t.lastStudied,
        isHabitBased: t.isHabitBased
      }))
    });

    const weakTopics = topics
      .filter(topic => {
        // Log each topic's evaluation
        const isBelowThreshold = (topic.masteryLevel || 0) < MASTERY_THRESHOLD;
        const isNotHabitBased = !topic.isHabitBased;
        const needsReview = topic.lastStudied 
          ? dayjs().diff(dayjs(topic.lastStudied), 'day') >= REVIEW_THRESHOLD_DAYS
          : true;

        console.log(`Topic ${topic.name} evaluation:`, {
          masteryLevel: topic.masteryLevel || 0,
          isBelowThreshold,
          isNotHabitBased,
          lastStudied: topic.lastStudied,
          daysSinceLastStudy: topic.lastStudied 
            ? dayjs().diff(dayjs(topic.lastStudied), 'day')
            : 'never',
          needsReview
        });

        // Include topic if it's not habit-based and either has low mastery or needs review
        return isNotHabitBased && (isBelowThreshold || needsReview);
      })
      .sort((a, b) => (a.masteryLevel || 0) - (b.masteryLevel || 0));

    console.log('Identified weak topics:', weakTopics.map(t => t.name));
    return weakTopics;
  };

  const weakAreas = calculateWeakAreas(topics);
  const habitTopics = topics.filter(t => t.isHabitBased);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={`${themeStyles.cardBg || 'bg-slate-950'} ${themeStyles.border || 'border-slate-800'} p-4 flex flex-col space-y-2`}>
          <div className="flex items-center space-x-2">
            <Star className={`h-5 w-5 ${themeStyles.accent || 'text-yellow-500'}`} />
            <h3 className={`font-medium ${themeStyles.textSecondary || 'text-slate-200'}`}>Total XP</h3>
          </div>
          <p className={`text-2xl font-bold ${themeStyles.textPrimary || 'text-slate-100'}`}>{progress.totalXP.toLocaleString()}</p>
        </Card>

        <Card className={`${themeStyles.cardBg || 'bg-slate-950'} ${themeStyles.border || 'border-slate-800'} p-4 flex flex-col space-y-2`}>
          <div className="flex items-center space-x-2">
            <Brain className={`h-5 w-5 ${themeStyles.accent || 'text-blue-500'}`} />
            <h3 className={`font-medium ${themeStyles.textSecondary || 'text-slate-200'}`}>Average Mastery</h3>
          </div>
          <div className="space-y-2">
            <p className={`text-2xl font-bold ${themeStyles.textPrimary || 'text-slate-100'}`}>{Math.round(progress.averageMastery)}%</p>
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  progress.averageMastery < 40 ? "bg-red-500" :
                  progress.averageMastery < 60 ? "bg-yellow-500" : "bg-emerald-500"
                )}
                style={{ width: `${progress.averageMastery}%` }}
              />
            </div>
          </div>
        </Card>

        <Card className={`${themeStyles.cardBg || 'bg-slate-950'} ${themeStyles.border || 'border-slate-800'} p-4 flex flex-col space-y-2`}>
          <div className="flex items-center space-x-2">
            <Calendar className={`h-5 w-5 ${themeStyles.accent || 'text-green-500'}`} />
            <h3 className={`font-medium ${themeStyles.textSecondary || 'text-slate-200'}`}>Topics</h3>
          </div>
          <p className={`text-2xl font-bold ${themeStyles.textPrimary || 'text-slate-100'}`}>{progress.totalTopics}</p>
          <p className={`text-sm ${themeStyles.textMuted || 'text-slate-400'}`}>{progress.completedTopics} completed</p>
        </Card>

        <Card className={`${themeStyles.cardBg || 'bg-slate-950'} ${themeStyles.border || 'border-slate-800'} p-4 flex flex-col space-y-2`}>
          <div className="flex items-center space-x-2">
            <TrendingUp className={`h-5 w-5 ${themeStyles.accent || 'text-purple-500'}`} />
            <h3 className={`font-medium ${themeStyles.textSecondary || 'text-slate-200'}`}>Areas to Focus</h3>
          </div>
          <p className={`text-2xl font-bold ${themeStyles.textPrimary || 'text-slate-100'}`}>{weakAreas.length}</p>
        </Card>
      </div>

      <Card className={`p-6 ${themeStyles.cardBg || 'bg-slate-950'} ${themeStyles.border || 'border-slate-800'}`}>
        <h3 className={`text-lg font-medium mb-4 ${themeStyles.textPrimary || 'text-slate-100'}`}>Areas Needing Review</h3>
        {weakAreas.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {weakAreas.map((topic) => (
              <div
                key={topic.name}
                onClick={() => router.push(`/subjects/${subjectId}/topics/${encodeURIComponent(topic.name)}`)}
                className={`p-3 rounded-lg ${themeStyles.border || 'border-slate-800'} ${themeStyles.cardBg || 'bg-slate-900/70'} hover:bg-slate-800/70 transition-colors cursor-pointer group`}
              >
                <h4 className={`font-medium text-sm mb-2 ${themeStyles.textPrimary || 'text-slate-100'} line-clamp-1 group-hover:text-blue-400 transition-colors`}>
                  {topic.name}
                </h4>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className={themeStyles.textSecondary || 'text-slate-300'}>Mastery</span>
                    <span className={cn(
                      "font-medium",
                      topic.masteryLevel < 40 ? "text-red-400" :
                      topic.masteryLevel < 60 ? "text-yellow-400" : "text-emerald-400"
                    )}>
                      {Math.round(topic.masteryLevel)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        topic.masteryLevel < 40 ? "bg-red-500" :
                        topic.masteryLevel < 60 ? "bg-yellow-500" : "bg-emerald-500"
                      )}
                      style={{ width: `${topic.masteryLevel}%` }}
                    />
                  </div>
                  {topic.lastStudied && (
                    <p className={`text-xs ${themeStyles.textMuted || 'text-slate-400'} truncate`}>
                      Last: {dayjs(topic.lastStudied).fromNow()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 ${themeStyles.textMuted || 'text-slate-300'}">
            <p>No topics currently need review! 🎉</p>
            {habitTopics.length > 0 && (
              <p className="mt-2 text-sm text-slate-400">
                Note: Self-managed topics like Anki decks are tracked separately for XP but not included in review recommendations.
              </p>
            )}
          </div>
        )}
      </Card>

      <Card className={`${themeStyles.cardBg || 'bg-slate-950'} ${themeStyles.border || 'border-slate-800'}`}>
        <CardHeader>
          <CardTitle className={`flex items-center ${themeStyles.textPrimary || 'text-slate-100'}`}>
            <Brain className={`h-5 w-5 mr-2 ${themeStyles.accent || 'text-blue-400'}`} />
            Practice Quiz
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <Button
                variant={quizType === 'all' ? 'default' : 'secondary'}
                onClick={() => setQuizType('all')}
                className={`flex-1 ${quizType === 'all' ? themeStyles.primary : themeStyles.secondary}`}
              >
                <Target className="h-4 w-4 mr-2" />
                All Topics
              </Button>
              <Button
                variant={quizType === 'weak' ? 'default' : 'secondary'}
                onClick={() => setQuizType('weak')}
                className={`flex-1 ${quizType === 'weak' ? themeStyles.primary : themeStyles.secondary}`}
              >
                <TrendingDown className="h-4 w-4 mr-2" />
                Focus on Weak Areas
              </Button>
            </div>
            <Button
              onClick={startQuiz}
              className={`w-full ${themeStyles.primary} text-white`}
            >
              <Brain className="h-4 w-4 mr-2" />
              Start Quiz
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 