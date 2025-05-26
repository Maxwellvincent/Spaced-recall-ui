import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, TrendingDown, Target } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PracticeQuizSectionProps {
  subjectId: string;
  topics: { name: string; masteryLevel?: number }[];
  themeStyles?: any;
}

export function PracticeQuizSection({ subjectId, topics = [], themeStyles = {} }: PracticeQuizSectionProps) {
  const router = useRouter();
  const [quizType, setQuizType] = useState<'all' | 'weak'>('all');

  // Calculate weakest topics
  const weakestTopics = topics
    .filter(topic => (topic.masteryLevel || 0) < 70)
    .sort((a, b) => (a.masteryLevel || 0) - (b.masteryLevel || 0))
    .slice(0, 3);

  const startQuiz = () => {
    const quizParams = new URLSearchParams({
      type: quizType,
      topics:
        quizType === 'weak'
          ? weakestTopics.map(t => t.name).join(',')
          : topics.map(t => t.name).join(',')
    });
    router.push(`/subjects/${subjectId}/quiz?${quizParams.toString()}`);
  };

  return (
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
  );
} 