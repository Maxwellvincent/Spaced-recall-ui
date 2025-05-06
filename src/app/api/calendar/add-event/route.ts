import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.NEXTAUTH_URL + '/api/auth/callback/google'
);

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { title, description, startDate, durationMinutes = 30 } = body;

    if (!title || !startDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get the user's access token
    const accessToken = session.accessToken;
    if (!accessToken) {
      return NextResponse.json(
        { error: 'No Google access token found' },
        { status: 401 }
      );
    }

    // Set up OAuth2 client with the access token
    oauth2Client.setCredentials({
      access_token: accessToken
    });

    // Create Calendar API instance
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Calculate end time
    const start = new Date(startDate);
    const end = new Date(start.getTime() + durationMinutes * 60000);

    // Create the calendar event
    const event = {
      summary: title,
      description,
      start: {
        dateTime: start.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: end.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      reminders: {
        useDefault: true,
      },
    };

    // Insert the event
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });

    return NextResponse.json({
      success: true,
      eventId: response.data.id,
      htmlLink: response.data.htmlLink,
    });
  } catch (error) {
    console.error('Error adding calendar event:', error);
    return NextResponse.json(
      { error: 'Failed to add event to calendar' },
      { status: 500 }
    );
  }
} 