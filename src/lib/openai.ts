"use client";

import type { AIPrompt, AIResponse } from "@/types/study";

export type StudyPromptResponse = {
  content: string;
  error?: string;
};

export type EvaluationResponse = {
  content: string;
  error?: string;
};

// Export utility functions for AI-related operations
export const generateStudyPrompt = async (concept: string, phase: string): Promise<StudyPromptResponse> => {
  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: `Create a study prompt for the concept "${concept}" in the ${phase} phase of learning.`,
        model: "gpt-3.5-turbo",
        maxTokens: 150
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate study prompt');
    }

    const data = await response.json();
    return {
      content: data.content || "No response generated"
    };
  } catch (error) {
    console.error("Error generating study prompt:", error);
    return {
      content: "Error generating study prompt",
      error: "Failed to generate study prompt"
    };
  }
};

export const evaluateUserAnswer = async (aiPrompt: AIPrompt): Promise<AIResponse> => {
  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: `
Topic: ${aiPrompt.topic}
Subject: ${aiPrompt.subject}
Question: ${aiPrompt.question}
User's Answer: ${aiPrompt.userAnswer}

Please evaluate this answer and provide:
1. Whether the answer is correct (true/false)
2. Detailed feedback explaining why
3. A score from 0-100

Return the response in JSON format:
{
  "isCorrect": boolean,
  "aiFeedback": string,
  "score": number
}`,
        model: "gpt-3.5-turbo",
        maxTokens: 500
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to evaluate answer');
    }

    const data = await response.json();
    const evaluation = JSON.parse(data.content);
    
    return {
      isCorrect: evaluation.isCorrect,
      aiFeedback: evaluation.aiFeedback,
      score: evaluation.score
    };
  } catch (error) {
    console.error("Error evaluating user answer:", error);
    throw new Error("Failed to evaluate answer");
  }
}; 