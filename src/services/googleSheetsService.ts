import { HabitTask, UserStats, DayTrendData } from '../types';
import { calculateStats } from '../data/dummyData';

const SHEET_TITLE = 'I.R.I.S. Habit Intel - Database & Log Harian';

export interface SheetSyncResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  updatedRows: number;
}

export const findOrCreateHabitSpreadsheet = async (token: string): Promise<{ id: string; url: string }> => {
  // Check Drive API for existing spreadsheet created by app
  try {
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(SHEET_TITLE)}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false&fields=files(id,name,webViewLink)`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.files && data.files.length > 0) {
        return {
          id: data.files[0].id,
          url: data.files[0].webViewLink || `https://docs.google.com/spreadsheets/d/${data.files[0].id}/edit`,
        };
      }
    }
  } catch (err) {
    console.warn('Drive search error, proceeding to create sheet', err);
  }

  // Create new spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: SHEET_TITLE,
      },
      sheets: [
        {
          properties: {
            title: 'Daily Summary',
            gridProperties: { rowCount: 150, columnCount: 10 },
          },
        },
        {
          properties: {
            title: 'Task Completion Log',
            gridProperties: { rowCount: 500, columnCount: 8 },
          },
        },
        {
          properties: {
            title: 'Active Tasks',
            gridProperties: { rowCount: 100, columnCount: 8 },
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Gagal membuat Google Spreadsheet Database: ${createRes.statusText}`);
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Initialize Header rows
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Daily Summary!A1:I1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: 'Daily Summary!A1:I1',
        majorDimension: 'ROWS',
        values: [
          [
            'Timestamp Log',
            'Tanggal',
            'Selesai',
            'Total Tasks',
            'Success Rate (%)',
            'Streak Hari',
            'Jam Produktif',
            'Skor Kinerja',
            'Sumber Input',
          ],
        ],
      }),
    }
  );

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Task Completion Log!A1:F1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: 'Task Completion Log!A1:F1',
        majorDimension: 'ROWS',
        values: [
          [
            'Timestamp',
            'Tanggal',
            'Nama Tugas (Google Tasks)',
            'Kategori',
            'Jam Selesai',
            'Status',
          ],
        ],
      }),
    }
  );

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Active Tasks!A1:F1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: 'Active Tasks!A1:F1',
        majorDimension: 'ROWS',
        values: [
          [
            'ID Tugas',
            'Nama Tugas / Kegiatan',
            'Kategori',
            'Waktu Rutin',
            'Status Centang',
            'Catatan',
          ],
        ],
      }),
    }
  );

  return { id: spreadsheetId, url: spreadsheetUrl };
};

/**
 * Sync current habits and summary metrics to Google Sheets database
 */
export const syncHabitsToSpreadsheet = async (
  token: string,
  spreadsheetId: string,
  habits: HabitTask[],
  stats?: UserStats
): Promise<SheetSyncResult> => {
  const activeStats = stats || calculateStats(habits);
  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // 1. Append or update Daily Summary
  const summaryRow = [
    `${dateStr} ${timeStr}`,
    dateStr,
    activeStats.tasksCompleted,
    activeStats.totalTasks,
    `${activeStats.completionRate}%`,
    `${activeStats.habitStreak} Hari`,
    `${activeStats.timeInvestedHours} Jam`,
    `${activeStats.productivityScore}/10`,
    'Google Tasks (Tugas Saya) Input',
  ];

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Daily Summary!A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: 'Daily Summary!A1',
        majorDimension: 'ROWS',
        values: [summaryRow],
      }),
    }
  );

  // 2. Overwrite Active Tasks table
  const habitRows = habits.map(h => [
    h.googleTaskId || h.id,
    h.title,
    h.category,
    h.time,
    h.completed ? 'SELESAI (Completed)' : 'BELUM (NeedsAction)',
    h.notes || '-',
  ]);

  if (habitRows.length > 0) {
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Active Tasks!A2:F${habitRows.length + 1}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          range: `Active Tasks!A2:F${habitRows.length + 1}`,
          majorDimension: 'ROWS',
          values: habitRows,
        }),
      }
    );
  }

  // 3. Append completed tasks to Completion Log
  const completedHabits = habits.filter(h => h.completed);
  if (completedHabits.length > 0) {
    const logRows = completedHabits.map(h => [
      `${dateStr} ${timeStr}`,
      dateStr,
      h.title,
      h.category,
      h.completedAt || timeStr,
      'Selesai di Google Tasks',
    ]);

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Task Completion Log!A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          range: 'Task Completion Log!A1',
          majorDimension: 'ROWS',
          values: logRows,
        }),
      }
    );
  }

  return {
    spreadsheetId,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    updatedRows: habitRows.length + 1,
  };
};

/**
 * Fetch daily trend data from Google Sheets database so the Web App charts
 * visualize real historical records stored in Google Sheets!
 */
export const fetchDailyHistoryFromSpreadsheet = async (
  token: string,
  spreadsheetId: string
): Promise<DayTrendData[]> => {
  try {
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Daily Summary!A2:I60`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!res.ok) return [];

    const data = await res.json();
    const rows: any[][] = data.values || [];
    if (rows.length === 0) return [];

    // Map rows to DayTrendData
    const mapped: DayTrendData[] = [];
    const seenDates = new Set<string>();

    // Parse from newest to oldest or deduplicate by date
    for (let i = rows.length - 1; i >= 0; i--) {
      const row = rows[i];
      if (!row || row.length < 5) continue;
      const fullDate = String(row[1] || row[0] || 'Hari Ini');
      const dateKey = fullDate.split(',')[0].trim(); // e.g. "Senin" or short date
      if (seenDates.has(dateKey)) continue;
      seenDates.add(dateKey);

      const completed = parseInt(row[2], 10) || 0;
      const total = parseInt(row[3], 10) || 10;
      const percentage = parseFloat(String(row[4]).replace('%', '')) || Math.round((completed / (total || 1)) * 100);
      const hours = parseFloat(String(row[6]).replace(' Jam', '')) || 6.0;

      mapped.unshift({
        date: fullDate,
        dayName: dateKey.slice(0, 3),
        completed,
        total,
        percentage,
        hours,
      });

      if (mapped.length >= 7) break; // Last 7 days
    }

    return mapped;
  } catch (err) {
    console.warn('Gagal membaca history dari Google Sheets:', err);
    return [];
  }
};
