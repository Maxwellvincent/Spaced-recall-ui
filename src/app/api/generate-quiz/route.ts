import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const {
      subject,
      topics,
      questionCount = 10,
      quizType
    } = await request.json();

    const systemPrompt = `You are an expert MCAT tutor specializing in ${subject}. 
    Create challenging but fair multiple-choice questions that test understanding of the provided topics.
    Focus more on concepts with lower mastery levels.
    For each question:
    - Make it relevant to MCAT-style questions
    - Include 4 options with one correct answer
    - Provide a detailed explanation
    - Ensure questions test understanding, not just memorization
    - Match the difficulty to the topic's current mastery level`;

    const topicsPrompt = topics.map(topic => `
      Topic: ${topic.name}
      Current Mastery: ${topic.masteryLevel}%
      Concepts: ${topic.concepts.map(c => c.name).join(', ')}
    `).join('\n');

    const userPrompt = `Generate ${questionCount} multiple-choice questions for a ${quizType === 'weak' ? 'focused practice' : 'comprehensive'} quiz.

    Subject: ${subject}
    Topics:
    ${topicsPrompt}

    ${quizType === 'weak' ? 'Focus on topics with lower mastery levels.' : 'Cover all topics evenly.'}

    Return in this JSON format:
    {
      "questions": [
        {
          "question": "question text",
          "options": ["option1", "option2", "option3", "option4"],
          "correctAnswer": "correct option",
          "explanation": "detailed explanation",
          "topic": "topic name",
          "concept": "concept name",
          "difficulty": "easy/medium/hard"
        }
      ]
    }`;

    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      model: "gpt-3.5-turbo",
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2500,
    });

    const responseContent = completion.choices[0].message.content;
    if (!responseContent) {
      throw new Error('No content in response');
    }

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseContent);
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      console.error('Raw response:', responseContent);
      throw new Error('Invalid response format from AI');
    }

    // Validate the response format
    if (!parsedResponse.questions || !Array.isArray(parsedResponse.questions)) {
      console.error('Invalid response structure:', parsedResponse);
      throw new Error('Invalid response format from AI');
    }

    // Validate each question
    parsedResponse.questions.forEach((question: any) => {
      if (!question.question || !question.options || !question.correctAnswer || !question.explanation) {
        throw new Error('Invalid question format in AI response');
      }
    });

    return NextResponse.json(parsedResponse);
  } catch (error) {
    console.error('Error generating quiz:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate quiz questions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 