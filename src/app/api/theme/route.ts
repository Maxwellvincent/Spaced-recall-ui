import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { preferences } = await request.json();
    
    const prompt = `Create a learning theme based on these preferences:
      Interests: ${preferences.interests.join(', ')}
      ${preferences.favoriteBooks ? `Favorite Books: ${preferences.favoriteBooks.join(', ')}` : ''}
      ${preferences.favoriteMovies ? `Favorite Movies: ${preferences.favoriteMovies.join(', ')}` : ''}
      ${preferences.learningStyle ? `Learning Style: ${preferences.learningStyle}` : ''}

      Generate a theme with:
      1. A unique name
      2. A brief description
      3. 5 avatar levels with names, descriptions, and image paths
      4. An XP multiplier (between 1.0 and 1.5)
      
      Format the response as a JSON object matching the ThemeConfig interface.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const themeConfig = JSON.parse(response.choices[0].message.content || '{}');
    return NextResponse.json(themeConfig);
  } catch (error) {
    console.error("Error generating custom theme:", error);
    return NextResponse.json({ error: "Failed to generate theme" }, { status: 500 });
  }
}
