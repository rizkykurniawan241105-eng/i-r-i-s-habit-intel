import { CalendarEventItem } from '../types';

export const fetchTodayCalendarEvents = async (token: string): Promise<CalendarEventItem[]> => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
      startOfDay
    )}&timeMax=${encodeURIComponent(endOfDay)}&singleEvents=true&orderBy=startTime`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    console.warn(`Gagal mengambil Calendar Events: ${res.statusText}`);
    return [];
  }

  const data = await res.json();
  const items = (data.items || []).map((item: any) => ({
    id: item.id,
    summary: item.summary || '(Tanpa Judul)',
    start: item.start || {},
    end: item.end || {},
    color: item.colorId || '#6366F1',
  }));

  return items;
};

export const addHabitToCalendar = async (
  token: string,
  title: string,
  timeString: string,
  durationMinutes = 45
): Promise<boolean> => {
  try {
    const [hours, minutes] = timeString.split(':').map(Number);
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours || 8, minutes || 0, 0);
    const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: `[I.R.I.S. Habit] ${title}`,
        description: 'Scheduled from I.R.I.S. Personal Productivity & Habit Tracker',
        start: { dateTime: startDate.toISOString() },
        end: { dateTime: endDate.toISOString() },
      }),
    });

    return res.ok;
  } catch (err) {
    console.error('Calendar add error:', err);
    return false;
  }
};
