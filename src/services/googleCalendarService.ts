import { CalendarEventItem, HabitTask } from '../types';

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

// Menghitung start/end date dan recurrence rule berdasarkan jadwal
const getEventDatesAndRecurrence = (time: string, durationMinutes = 45, scheduleType: 'all' | 'weekday' | 'weekend' = 'all') => {
  const [hours, minutes] = (time || '08:00').split(':').map(Number);
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours || 8, minutes || 0, 0);
  const endDate = new Date(startDate.getTime() + (durationMinutes || 45) * 60 * 1000);

  let recurrence: string[] | undefined = undefined;
  if (scheduleType === 'weekday') {
    // Senin sampai Jumat
    recurrence = ['RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR'];
  } else if (scheduleType === 'weekend') {
    // Sabtu dan Minggu
    recurrence = ['RRULE:FREQ=WEEKLY;BYDAY=SA,SU'];
  } else {
    // Setiap hari
    recurrence = ['RRULE:FREQ=DAILY'];
  }

  return { startDate, endDate, recurrence };
};

export const createCalendarEventForHabit = async (
  token: string,
  habit: HabitTask
): Promise<string | null> => {
  try {
    const { startDate, endDate, recurrence } = getEventDatesAndRecurrence(
      habit.time,
      habit.durationMinutes,
      habit.scheduleType || 'all'
    );

    const scheduleLabel =
      habit.scheduleType === 'weekday'
        ? 'Senin-Jumat'
        : habit.scheduleType === 'weekend'
        ? 'Sabtu-Minggu'
        : 'Setiap Hari';

    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: `[I.R.I.S.] ${habit.title}`,
        description: `Kategori: ${habit.category} | Jadwal: ${scheduleLabel}\n${habit.notes || ''}\n(Sinkronisasi otomatis I.R.I.S. Habit Tracker)`,
        start: {
          dateTime: startDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta',
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta',
        },
        recurrence,
      }),
    });

    if (!res.ok) {
      console.warn('Gagal membuat event di Google Calendar:', res.statusText);
      return null;
    }

    const data = await res.json();
    return data.id || null;
  } catch (err) {
    console.error('Calendar create event error:', err);
    return null;
  }
};

export const updateCalendarEventForHabit = async (
  token: string,
  eventId: string,
  habit: HabitTask
): Promise<boolean> => {
  try {
    const { startDate, endDate, recurrence } = getEventDatesAndRecurrence(
      habit.time,
      habit.durationMinutes,
      habit.scheduleType || 'all'
    );

    const scheduleLabel =
      habit.scheduleType === 'weekday'
        ? 'Senin-Jumat'
        : habit.scheduleType === 'weekend'
        ? 'Sabtu-Minggu'
        : 'Setiap Hari';

    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: `[I.R.I.S.] ${habit.title}`,
        description: `Kategori: ${habit.category} | Jadwal: ${scheduleLabel}\n${habit.notes || ''}\n(Sinkronisasi otomatis I.R.I.S. Habit Tracker)`,
        start: {
          dateTime: startDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta',
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta',
        },
        recurrence,
      }),
    });

    return res.ok;
  } catch (err) {
    console.error('Calendar update event error:', err);
    return false;
  }
};

export const deleteCalendarEventForHabit = async (
  token: string,
  eventId: string
): Promise<boolean> => {
  try {
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok || res.status === 404 || res.status === 410;
  } catch (err) {
    console.error('Calendar delete event error:', err);
    return false;
  }
};

export const addHabitToCalendar = async (
  token: string,
  titleOrHabit: string | HabitTask | { title: string; time: string; durationMinutes?: number; scheduleType?: any; notes?: string; category?: any },
  timeString?: string,
  durationMinutes = 45
): Promise<boolean> => {
  try {
    if (typeof titleOrHabit === 'object' && titleOrHabit !== null && 'id' in titleOrHabit) {
      const eventId = await createCalendarEventForHabit(token, titleOrHabit as HabitTask);
      return !!eventId;
    }

    let title = '';
    let time = '08:00';
    let duration = durationMinutes;

    if (typeof titleOrHabit === 'object' && titleOrHabit !== null) {
      title = titleOrHabit.title;
      time = titleOrHabit.time || '08:00';
      duration = titleOrHabit.durationMinutes || 45;
    } else {
      title = String(titleOrHabit);
      time = timeString || '08:00';
      duration = durationMinutes;
    }

    const [hours, minutes] = time.split(':').map(Number);
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours || 8, minutes || 0, 0);
    const endDate = new Date(startDate.getTime() + duration * 60 * 1000);

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
