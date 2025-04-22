import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getToken } from 'next-auth/jwt';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import OpenAI from 'openai';

// Initialize rate limiter: 10 requests per minute
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  analytics: true,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,    // guaranteed on server
});

export async function POST(req: Request) {
  try {
    // Get the session token from the headers
    const headersList = headers();
    const session = headersList.get('authorization');

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check rate limit
    const ip = headersList.get('x-forwarded-for') || '127.0.0.1';
    const { success, limit, reset, remaining } = await ratelimit.limit(ip);

    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests', reset },
        { status: 429 }
      );
    }

    // Parse request body
    const { prompt, model = 'gpt-3.5-turbo', maxTokens = 500 } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert educational evaluator. Provide detailed, constructive feedback on student answers. Keep feedback concise but informative.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: maxTokens
    });

    return NextResponse.json({
      content: response.choices[0].message.content,
      rateLimit: {
        limit,
        remaining,
        reset
      }
    });
  } catch (error) {
    console.error('OpenAI API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 