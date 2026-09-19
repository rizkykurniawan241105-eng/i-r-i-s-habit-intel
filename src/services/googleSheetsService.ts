import { HabitTask, UserStats } from '../types';

const SHEET_TITLE = 'I.R.I.S. Habit Intel - Daily Logs & Metrics';

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
            gridProperties: { rowCount: 100, columnCount: 10 },
          },
        },
        {
          properties: {
            title: 'Active Habits',
            gridProperties: { rowCount: 50, columnCount: 8 },
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Gagal membuat Google Spreadsheet: ${createRes.statusText}`);
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
            'Status Sinkronisasi',
          ],
        ],
      }),
    }
  );

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Active Habits!A1:F1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: 'Active Habits!A1:F1',
        majorDimension: 'ROWS',
        values: [
          [
            'ID Habit',
            'Nama Kegiatan / Habit',
            'Kategori',
            'Waktu Rutin',
            'Status Hari Ini',
            'Catatan / Refleksi',
          ],
        ],
      }),
    }
  );

  return { id: spreadsheetId, url: spreadsheetUrl };
};

export const syncHabitsToSpreadsheet = async (
  token: string,
  spreadsheetId: string,
  habits: HabitTask[],
  stats: UserStats
): Promise<SheetSyncResult> => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // 1. Append to Daily Summary
  const summaryRow = [
    `${dateStr} ${timeStr}`,
    dateStr,
    stats.tasksCompleted,
    stats.totalTasks,
    `${stats.completionRate}%`,
    `${stats.habitStreak} Hari`,
    `${stats.timeInvestedHours} Jam`,
    `${stats.productivityScore}/10`,
    'I.R.I.S. Real-time Intel Synced',
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

  // 2. Overwrite Active Habits table
  const habitRows = habits.map(h => [
    h.id,
    h.title,
    h.category,
    h.time,
    h.completed ? 'SELESAI (Completed)' : 'BELUM (Pending)',
    h.notes || '-',
  ]);

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Active Habits!A2:F${habitRows.length + 1}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: `Active Habits!A2:F${habitRows.length + 1}`,
        majorDimension: 'ROWS',
        values: habitRows,
      }),
    }
  );

  return {
    spreadsheetId,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    updatedRows: habitRows.length + 1,
  };
};
