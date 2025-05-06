import { addDays, format } from 'date-fns';

interface CalendarEventParams {
  title: string;
  description?: string;
  startDate: Date;
  durationMinutes?: number;
  location?: string;
}

export function generateGoogleCalendarLink({
  title,
  description = '',
  startDate,
  durationMinutes = 30,
  location = ''
}: CalendarEventParams): string {
  // Format dates for Google Calendar
  const endDate = addDays(startDate, 0);
  endDate.setMinutes(startDate.getMinutes() + durationMinutes);
  
  const formatForGCal = (date: Date) => format(date, "yyyyMMdd'T'HHmmss");
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    details: description,
    location: location,
    dates: `${formatForGCal(startDate)}/${formatForGCal(endDate)}`
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function generateCalendarDescription(concept: { name: string; description?: string }, topic: { name: string }): string {
  return `Review session for concept: ${concept.name}\nTopic: ${topic.name}\n${concept.description || ''}`;
} 