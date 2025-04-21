"use client";

import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OpenAI API key');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Export utility functions for AI-related operations
export const generateStudyPrompt = async (concept: string, phase: string) => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful study assistant that creates effective study prompts based on the Feynman technique and active recall principles."
        },
        {
          role: "user",
          content: `Create a study prompt for the concept "${concept}" in the ${phase} phase of learning.`
        }
      ],
      temperature: 0.7,
      max_tokens: 150
    });

    return response.choices[0]?.message?.content || "No response generated";
  } catch (error) {
    console.error("Error generating study prompt:", error);
    return "Error generating study prompt";
  }
};

export const evaluateUserAnswer = async (prompt: string, userAnswer: string) => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful study assistant that evaluates user answers and provides constructive feedback."
        },
        {
          role: "user",
          content: `Original prompt: "${prompt}"\nUser's answer: "${userAnswer}"\nPlease evaluate this answer and provide feedback.`
        }
      ],
      temperature: 0.7,
      max_tokens: 200
    });

    return response.choices[0]?.message?.content || "No feedback generated";
  } catch (error) {
    console.error("Error evaluating user answer:", error);
    return "Error evaluating answer";
  }
}; 