import { NextResponse } from 'next/server';

export async function GET() {
  const envVars = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY ? 'PRESENT' : 'MISSING',
  };

  return NextResponse.json(envVars);
} 