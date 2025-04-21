import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export class CalendarService {
  private static oauth2Client: OAuth2Client;
  private static calendar: any;

  public static async initialize(accessToken: string) {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    this.oauth2Client.setCredentials({ access_token: accessToken });
    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  public static async scheduleStudySession(
    subject: string,
    topic: string,
    startTime: Date,
    duration: number
  ) {
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

    const event = {
      summary: `Study: ${subject} - ${topic}`,
      description: `Review ${topic} for ${subject}. Duration: ${duration} minutes.`,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'UTC',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 30 },
        ],
      },
    };

    try {
      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
      });
      return response.data;
    } catch (error) {
      console.error('Error scheduling calendar event:', error);
      throw error;
    }
  }

  public static async getUpcomingStudySessions() {
    try {
      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime',
        q: 'Study:',
      });
      return response.data.items;
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      throw error;
    }
  }
} 