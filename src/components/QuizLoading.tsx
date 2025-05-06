import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const loadingMessages = [
  "Analyzing your mastery levels...",
  "Crafting personalized questions...",
  "Preparing your MCAT practice session...",
  "Tailoring difficulty to your progress...",
  "Almost ready to challenge you...",
];

export function QuizLoading() {
  return (
    <Card className="w-full max-w-3xl mx-auto mt-8">
      <CardHeader>
        <CardTitle className="text-center">Preparing Your Quiz</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center space-y-4 py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="text-center space-y-2">
            {loadingMessages.map((message, index) => (
              <p
                key={index}
                className="text-muted-foreground animate-pulse"
                style={{
                  animationDelay: `${index * 0.5}s`,
                  opacity: 1 - index * 0.2,
                }}
              >
                {message}
              </p>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 