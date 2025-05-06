import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, BookOpen, Target, ArrowRight, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface FocusArea {
  topic: string;
  reason: string;
  studyTips: string;
}

interface Recommendations {
  analysis: string;
  focusAreas: FocusArea[];
  nextSteps: string;
  recommendedDifficulty: string;
  estimatedStudyTime: string;
}

interface QuizRecommendationsProps {
  subject: string;
  topic: string;
  conceptName: string;
  quizScore: number;
  incorrectAnswers: any[];
  difficulty: string;
}

export function QuizRecommendations({
  subject,
  topic,
  conceptName,
  quizScore,
  incorrectAnswers,
  difficulty
}: QuizRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Recommendations | null>(null);
  const [loading, setLoading] = useState(false);

  const generateRecommendations = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/generate-recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject,
          topic,
          conceptName,
          quizScore,
          incorrectAnswers,
          difficulty,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate recommendations');
      }

      const data = await response.json();
      setRecommendations(data);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to generate recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-slate-300">Generating recommendations...</span>
      </div>
    );
  }

  if (!recommendations) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <p className="text-center text-slate-400">
          Get personalized recommendations based on your quiz performance
        </p>
        <Button 
          onClick={generateRecommendations}
          className="bg-blue-600 text-white hover:bg-blue-700"
        >
          Generate Recommendations
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="flex items-center text-slate-100">
            <Target className="h-5 w-5 mr-2 text-blue-400" />
            Performance Analysis
          </CardTitle>
          <CardDescription className="text-slate-300">{recommendations.analysis}</CardDescription>
        </CardHeader>
      </Card>

      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="flex items-center text-slate-100">
            <BookOpen className="h-5 w-5 mr-2 text-blue-400" />
            Focus Areas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recommendations.focusAreas.map((area, index) => (
              <div key={index} className="border border-slate-700 rounded-lg p-4 bg-slate-800/30">
                <h4 className="font-semibold mb-2 text-slate-100">{area.topic}</h4>
                <p className="text-sm text-slate-400 mb-2">{area.reason}</p>
                <p className="text-sm border-l-2 border-blue-500 pl-3 text-slate-300">{area.studyTips}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="flex items-center text-slate-100">
            <ArrowRight className="h-5 w-5 mr-2 text-blue-400" />
            Next Steps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-300">{recommendations.nextSteps}</p>
          <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1 text-blue-400" />
              Estimated study time: {recommendations.estimatedStudyTime}
            </div>
            <div>
              Recommended difficulty: {recommendations.recommendedDifficulty}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 