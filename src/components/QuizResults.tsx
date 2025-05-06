import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface QuizResultsProps {
  score: number;
  totalQuestions: number;
  incorrectAnswers: { question: string; topic: string }[];
  subject: string;
  onRetry: () => void;
}

interface Recommendation {
  analysis: string;
  focusAreas: string[];
  nextSteps: string[];
  recommendedDifficulty: string;
  estimatedStudyTime: string;
}

export function QuizResults({
  score,
  totalQuestions,
  incorrectAnswers,
  subject,
  onRetry,
}: QuizResultsProps) {
  const [recommendations, setRecommendations] = useState<Recommendation | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  const percentage = Math.round((score / totalQuestions) * 100);

  const generateRecommendations = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/generate-recommendations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject,
          quizScore: percentage,
          incorrectAnswers,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate recommendations");
      }

      const data = await response.json();
      setRecommendations(data);
    } catch (error) {
      console.error("Error generating recommendations:", error);
      toast.error("Failed to generate recommendations. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Quiz Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium">Score: {percentage}%</span>
              <span className="text-sm text-muted-foreground">
                {score} out of {totalQuestions} correct
              </span>
            </div>
            <Progress value={percentage} />
          </div>

          {incorrectAnswers.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium">Areas for Improvement</h3>
              <ul className="space-y-2">
                {incorrectAnswers.map((answer, index) => (
                  <li
                    key={index}
                    className="text-sm text-muted-foreground flex items-start gap-2"
                  >
                    <span className="font-medium text-foreground">
                      {answer.topic}:
                    </span>
                    {answer.question}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {recommendations ? (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  {recommendations.analysis}
                </p>
              </div>

              <div>
                <h3 className="font-medium mb-2">Focus Areas</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {recommendations.focusAreas.map((area, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      {area}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-medium mb-2">Next Steps</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {recommendations.nextSteps.map((step, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      {step}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-1">Recommended Difficulty</h3>
                  <p className="text-sm text-muted-foreground">
                    {recommendations.recommendedDifficulty}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium mb-1">Estimated Study Time</h3>
                  <p className="text-sm text-muted-foreground">
                    {recommendations.estimatedStudyTime}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <Button
              onClick={generateRecommendations}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Recommendations...
                </>
              ) : (
                "Get Personalized Recommendations"
              )}
            </Button>
          )}

          <Button onClick={onRetry} variant="outline" className="w-full">
            Try Another Quiz
          </Button>
        </CardContent>
      </Card>
    </div>
  );
} 