import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Check, X } from "lucide-react";

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  topic: string;
}

interface QuizInterfaceProps {
  questions: QuizQuestion[];
  onComplete: (results: {
    score: number;
    incorrectAnswers: { question: string; topic: string }[];
  }) => void;
}

export function QuizInterface({ questions, onComplete }: QuizInterfaceProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>(
    new Array(questions.length).fill(null)
  );

  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const isLastQuestion = currentQuestion === questions.length - 1;

  const handleAnswerSelect = (index: number) => {
    if (selectedAnswer === null) {
      setSelectedAnswer(index);
      const newAnswers = [...answers];
      newAnswers[currentQuestion] = index;
      setAnswers(newAnswers);
      setShowExplanation(true);
    }
  };

  const handleNext = () => {
    if (isLastQuestion) {
      const score = answers.reduce(
        (acc, answer, idx) =>
          answer === questions[idx].correctAnswer ? acc + 1 : acc,
        0
      );
      const incorrectAnswers = questions
        .filter((_, idx) => answers[idx] !== questions[idx].correctAnswer)
        .map((q) => ({ question: q.question, topic: q.topic }));
      onComplete({ score, incorrectAnswers });
    } else {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    }
  };

  const question = questions[currentQuestion];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Question {currentQuestion + 1} of {questions.length}
        </span>
        <Progress value={progress} className="w-64" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">
            {question.question}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {question.options.map((option, index) => (
              <Button
                key={index}
                variant={
                  selectedAnswer === null
                    ? "outline"
                    : index === question.correctAnswer
                    ? "success"
                    : selectedAnswer === index
                    ? "destructive"
                    : "outline"
                }
                className="justify-start h-auto py-3 px-4"
                onClick={() => handleAnswerSelect(index)}
                disabled={selectedAnswer !== null}
              >
                <div className="flex items-start gap-3">
                  {selectedAnswer !== null && index === question.correctAnswer && (
                    <Check className="h-5 w-5 shrink-0 text-green-500" />
                  )}
                  {selectedAnswer === index &&
                    index !== question.correctAnswer && (
                      <X className="h-5 w-5 shrink-0 text-red-500" />
                    )}
                  <span>{option}</span>
                </div>
              </Button>
            ))}
          </div>

          {showExplanation && (
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Explanation</h4>
              <p className="text-sm text-muted-foreground">
                {question.explanation}
              </p>
            </div>
          )}

          {selectedAnswer !== null && (
            <Button
              className="w-full mt-4"
              onClick={handleNext}
            >
              {isLastQuestion ? "Complete Quiz" : "Next Question"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 