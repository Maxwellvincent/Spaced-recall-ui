import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { SubjectStructure } from '@/types/subject';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { subject, additionalInfo } = await request.json();

    if (!subject) {
      return NextResponse.json(
        { error: 'Subject name is required' },
        { status: 400 }
      );
    }

    const systemPrompt = `You are an expert curriculum designer specializing in creating structured learning paths. Your task is to create a detailed subject structure that breaks down the given subject into logical topics and core concepts.

For each topic:
- Provide a clear description
- List 3-5 core concepts that are essential to master
- Suggest 2-3 high-quality learning resources
- Estimate study hours needed
- Optionally specify which knowledge branch it belongs to (e.g., "fundamentals", "advanced", "practical")

Format the response as a JSON object matching the SubjectStructure type with:
{
  "name": string,
  "description": string,
  "topics": Array<{
    "name": string,
    "description": string,
    "coreConcepts": string[],
    "branch"?: string,
    "recommendedResources"?: string[],
    "estimatedStudyHours": number
  }>,
  "totalEstimatedHours": number,
  "recommendedOrder"?: string[],
  "prerequisites"?: string[]
}`;

    const userPrompt = `Please create a structured curriculum for "${subject}".
${additionalInfo ? `Additional context: ${additionalInfo}` : ''}

Focus on creating a practical and efficient learning path that covers all essential aspects of the subject.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    const responseContent = completion.choices[0].message.content;
    if (!responseContent) {
      throw new Error('No response from OpenAI');
    }

    const structure: SubjectStructure = JSON.parse(responseContent);

    // Validate the structure matches our type
    if (!structure.name || !structure.description || !Array.isArray(structure.topics)) {
      throw new Error('Invalid structure format received from OpenAI');
    }

    return NextResponse.json(structure);
  } catch (error) {
    console.error('Error generating subject structure:', error);
    return NextResponse.json(
      { error: 'Failed to generate subject structure' },
      { status: 500 }
    );
  }
} 