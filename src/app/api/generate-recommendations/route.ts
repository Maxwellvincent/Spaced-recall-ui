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
      topic,
      conceptName,
      quizScore,
      incorrectAnswers,
      difficulty,
    } = await request.json();
    
    const systemPrompt = `You are an expert educational advisor specializing in ${subject}, particularly in ${topic}. 
    Your task is to analyze quiz performance and provide personalized learning recommendations.
    Focus on:
    - Identifying knowledge gaps based on incorrect answers
    - Suggesting specific areas for improvement
    - Recommending related concepts to study
    - Providing practical study strategies
    - Adjusting difficulty levels for future study sessions`;

    const userPrompt = `Based on the student's quiz performance:

    Context:
    - Subject: ${subject}
    - Topic: ${topic}
    - Concept: ${conceptName}
    - Quiz Score: ${quizScore}%
    - Difficulty Level: ${difficulty}
    - Incorrect Answers: ${JSON.stringify(incorrectAnswers, null, 2)}
    
    Please provide:
    1. Analysis of performance
    2. 3-5 specific focus areas based on mistakes
    3. Recommended next steps
    4. Suggested difficulty for next session
    
    Return in this JSON format:
    {
      "analysis": "brief analysis of performance",
      "focusAreas": [
        {
          "topic": "specific topic to focus on",
          "reason": "why this needs attention",
          "studyTips": "how to improve in this area"
        }
      ],
      "nextSteps": "concrete action items",
      "recommendedDifficulty": "easy/medium/hard/expert",
      "estimatedStudyTime": "recommended duration in minutes"
    }`;

    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      model: "gpt-3.5-turbo",
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 1500,
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
    if (!parsedResponse.analysis || !parsedResponse.focusAreas || !Array.isArray(parsedResponse.focusAreas)) {
      console.error('Invalid response structure:', parsedResponse);
      throw new Error('Invalid response format from AI');
    }

    return NextResponse.json(parsedResponse);
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate recommendations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 