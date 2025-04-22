import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    const systemPrompt = `You are an expert in Naruto lore and character progression. Create a unique Naruto character with a detailed power progression path.
    The character should have:
    1. A unique name and background that fits the Naruto universe
    2. A clear progression path with 6 distinct power levels
    3. Realistic abilities that align with Naruto's power system (chakra, jutsu, etc.)
    4. A compelling character arc that explains their growth

    Format the response as a JSON object with:
    {
      "id": "unique-id",
      "name": "Character Name",
      "description": "Brief character background",
      "levels": ["Level 1", "Level 2", "Level 3", "Level 4", "Level 5", "Level 6"]
    }`;

    const userPrompt = `Create a Naruto character based on this description: ${prompt}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: "json_object" }
    });

    const characterData = JSON.parse(response.choices[0].message.content || '{}');
    
    // Generate a unique ID if not provided
    if (!characterData.id) {
      characterData.id = `custom-${Date.now()}`;
    }

    return NextResponse.json(characterData);
  } catch (error) {
    console.error("Error generating character:", error);
    return NextResponse.json(
      { error: "Failed to generate character" },
      { status: 500 }
    );
  }
} 