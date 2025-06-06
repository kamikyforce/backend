import { createEvent, EventAttributes } from 'ics';
import { promisify } from 'util';

const createEventAsync = promisify(
  (event: EventAttributes, callback: (error: Error | null | undefined, value: string) => void) => {
    createEvent(event, callback);
  }
);

export async function generateICalEvent(event: {
  id: string;
  name: string;
  description?: string | null;
  eventDate: Date;
  location?: string | null;
  onlineLink?: string | null;
}) {
  try {
    const eventDate = new Date(event.eventDate);
    const endDate = new Date(eventDate);
    endDate.setHours(endDate.getHours() + 2);

    const startArray = [
      eventDate.getFullYear(),
      eventDate.getMonth() + 1,
      eventDate.getDate(),
      eventDate.getHours(),
      eventDate.getMinutes()
    ];

    const endArray = [
      endDate.getFullYear(),
      endDate.getMonth() + 1,
      endDate.getDate(),
      endDate.getHours(),
      endDate.getMinutes()
    ];

    const eventData: EventAttributes = {
      start: startArray as [number, number, number, number, number],
      end: endArray as [number, number, number, number, number],
      title: event.name,
      description: event.description || '',
      location: event.location || event.onlineLink || '',
      status: 'CONFIRMED',
      busyStatus: 'BUSY',
      productId: 'event-management-system/ics'
    };

    if (event.onlineLink && event.onlineLink.trim() !== '') {
      eventData.url = event.onlineLink;
    }

    const value = await createEventAsync(eventData);
    return value;
  } catch (error) {
    console.error('Error generating iCal event:', error);
    throw new Error('Failed to generate calendar event');
  }
}

export function generateGoogleCalendarUrl(event: {
  name: string;
  description?: string | null;
  eventDate: Date;
  location?: string | null;
  onlineLink?: string | null;
}) {
  const eventDate = new Date(event.eventDate);
  const endDate = new Date(eventDate);
  endDate.setHours(endDate.getHours() + 2);

  const startIso = eventDate.toISOString().replace(/-|:|\./g, '');
  const endIso = endDate.toISOString().replace(/-|:|\./g, '');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.name,
    dates: `${startIso}/${endIso}`,
    details: event.description || '',
    location: event.location || event.onlineLink || ''
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
