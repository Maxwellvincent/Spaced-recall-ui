import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { auth } from '@/lib/firebase';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: Request) {
  try {
    const { title, description, startTime, endTime } = await request.json();
    
    // Get the user's Google access token from Firestore
    const userDoc = await getDoc(doc(db, 'users', auth.currentUser?.uid || ''));
    const userData = userDoc.data();
    const accessToken = userData?.googleAccessToken;

    if (!accessToken) {
      return NextResponse.json({ error: 'No Google access token found' }, { status: 401 });
    }

    // Initialize the Google Calendar API
    const calendar = google.calendar({ version: 'v3', auth: new google.auth.OAuth2() });
    calendar.setCredentials({ access_token: accessToken });

    // Create the event
    const event = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: title,
        description: description,
        start: {
          dateTime: startTime,
          timeZone: 'UTC',
        },
        end: {
          dateTime: endTime,
          timeZone: 'UTC',
        },
      },
    });

    return NextResponse.json({ event: event.data });
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return NextResponse.json({ error: 'Failed to create calendar event' }, { status: 500 });
  }
} 