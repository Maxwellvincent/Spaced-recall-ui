import { StudyFramework, AIPrompt, Topic } from '@/types/study';

export const calculateMasteryScore = (progress: StudyFramework['progress']): number => {
  const weights = {
    learnRecall: 0.2,
    testingEffect: 0.3,
    reflectionDiagnosis: 0.15,
    integration: 0.2,
    teaching: 0.15
  };

  return Object.entries(progress).reduce((score, [phase, value]) => {
    return score + (value * weights[phase as keyof typeof weights]);
  }, 0);
};

export const calculateRetentionScore = (framework: StudyFramework): number => {
  const daysSinceLastActivity = Math.floor(
    (Date.now() - new Date(framework.lastActivityDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  return Math.max(0, 100 - (daysSinceLastActivity * 5)); // Decrease by 5 points per day
};

export const calculateClarityScore = (framework: StudyFramework): number => {
  const teachingWeight = 0.6;
  const integrationWeight = 0.4;
  
  return (framework.progress.teaching * teachingWeight) + 
         (framework.progress.integration * integrationWeight);
};

export const evaluateUserAnswer = (prompt: AIPrompt, answer: string): AIPrompt => {
  const minScore = 0.6;
  const maxScore = 1.0;
  const randomScore = minScore + Math.random() * (maxScore - minScore);
  
  return {
    ...prompt,
    userAnswer: answer,
    aiFeedback: "Your answer shows good understanding. Keep practicing!",
    score: randomScore
  };
};

export const generateAIPrompt = (phase: string, concept: Topic): AIPrompt => {
  const prompts = {
    learnRecall: `Explain the key concept of ${concept.name} in your own words.`,
    testingEffect: `How would you apply ${concept.name} to solve a real-world problem?`,
    reflectionDiagnosis: `What are the key challenges in understanding ${concept.name}?`,
    integration: `How does ${concept.name} connect with other concepts you've learned?`,
    teaching: `Create a comprehensive explanation of ${concept.name} that would help someone else understand it.`
  };

  return {
    prompt: prompts[phase as keyof typeof prompts] || prompts.learnRecall,
    score: 0
  };
}; 