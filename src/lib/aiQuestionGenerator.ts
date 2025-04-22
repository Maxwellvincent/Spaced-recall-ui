"use client";

export interface QuestionGenerationParams {
  subject: string;
  topic: string;
  masteryLevel: 'beginner' | 'intermediate' | 'advanced' | 'master';
  difficulty: 'easy' | 'medium' | 'hard';
  numQuestions: number;
}

export interface GeneratedQuestion {
  question: string;
  type: 'reasoning' | 'mcq' | 'calculation';
  options?: string[];
  correctAnswer: string;
  explanation: string;
  steps?: string[];
}

export async function generateQuestions({
  subject,
  topic,
  masteryLevel,
  difficulty,
  numQuestions
}: QuestionGenerationParams): Promise<GeneratedQuestion[]> {
  try {
    const prompt = `Generate ${numQuestions} questions about ${topic} in ${subject} for a ${masteryLevel} student.
    Difficulty level: ${difficulty}
    
    For ${masteryLevel} students:
    ${masteryLevel === 'beginner' || masteryLevel === 'intermediate' 
      ? 'Focus on reasoning and understanding questions. Include real-world applications.' 
      : 'Focus on multiple-choice questions testing deep understanding and application.'}
    
    ${subject.toLowerCase().includes('math') || subject.toLowerCase().includes('physics') 
      ? 'Include calculation questions with step-by-step solutions.' 
      : ''}
    
    Format each question as JSON with:
    - question: The question text
    - type: 'reasoning', 'mcq', or 'calculation'
    - options: Array of options (for MCQ)
    - correctAnswer: The correct answer
    - explanation: Detailed explanation
    - steps: Array of steps (for calculation questions)
    
    Return an array of questions in JSON format.`;

    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        model: "gpt-4",
        maxTokens: 1000
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate questions');
    }

    const data = await response.json();
    return JSON.parse(data.content);
  } catch (error) {
    console.error('Error generating questions:', error);
    throw new Error('Failed to generate questions');
  }
}

export async function evaluateReasoningAnswer(
  question: string,
  answer: string
): Promise<{ score: number; feedback: string }> {
  try {
    const prompt = `Evaluate this answer to the question: "${question}"
    
    Answer: "${answer}"
    
    Provide:
    1. A score from 0-100 based on:
       - Understanding of concepts
       - Clarity of explanation
       - Accuracy of information
       - Real-world application
    2. Detailed feedback on strengths and areas for improvement
    
    Return as JSON: { score: number, feedback: string }`;

    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        model: "gpt-4",
        maxTokens: 500
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to evaluate answer');
    }

    const data = await response.json();
    return JSON.parse(data.content);
  } catch (error) {
    console.error('Error evaluating answer:', error);
    throw new Error('Failed to evaluate answer');
  }
} 