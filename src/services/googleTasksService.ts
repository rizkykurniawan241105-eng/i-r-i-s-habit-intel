import { HabitTask, CategoryType } from '../types';

export interface GoogleTaskItem {
  id: string;
  title: string;
  status: 'needsAction' | 'completed';
  notes?: string;
  due?: string;
  updated?: string;
  completed?: string;
}

export interface GoogleTaskList {
  id: string;
  title: string;
  updated?: string;
}

// Fetch all available Google Task lists
export const fetchUserTaskLists = async (token: string): Promise<GoogleTaskList[]> => {
  const listRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!listRes.ok) {
    throw new Error(`Google Tasks Error: ${listRes.statusText}`);
  }

  const data = await listRes.json();
  return data.items || [];
};

// Locate the user's primary "Tugas Saya" / "My Tasks" / "@default" list
export const getPrimaryTugasSayaTaskList = async (
  token: string
): Promise<{ id: string; title: string }> => {
  const lists = await fetchUserTaskLists(token);

  // 1. Exact match "Tugas Saya" (Indonesian default)
  const tugasSaya = lists.find(l => l.title.trim().toLowerCase() === 'tugas saya');
  if (tugasSaya) return { id: tugasSaya.id, title: tugasSaya.title };

  // 2. Exact match "My Tasks" (English default)
  const myTasks = lists.find(l => l.title.trim().toLowerCase() === 'my tasks');
  if (myTasks) return { id: myTasks.id, title: myTasks.title };

  // 3. ID "@default"
  const defaultList = lists.find(l => l.id === '@default');
  if (defaultList) return { id: defaultList.id, title: defaultList.title || 'Tugas Saya' };

  // 4. Any list containing "tugas" (excluding "i.r.i.s")
  const partialTugas = lists.find(
    l => l.title.toLowerCase().includes('tugas') && !l.title.toLowerCase().includes('i.r.i.s')
  );
  if (partialTugas) return { id: partialTugas.id, title: partialTugas.title };

  // 5. Fallback to first available list or '@default'
  if (lists.length > 0) {
    return { id: lists[0].id, title: lists[0].title };
  }

  return { id: '@default', title: 'Tugas Saya' };
};

// Backward compatibility helper
export const getOrCreateHabitTaskList = async (token: string): Promise<string> => {
  const primary = await getPrimaryTugasSayaTaskList(token);
  return primary.id;
};

// Fetch tasks from a specific list
export const fetchGoogleTasks = async (token: string, taskListId: string): Promise<GoogleTaskItem[]> => {
  const res = await fetch(
    `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(taskListId)}/tasks?showCompleted=true&showHidden=true&maxResults=100`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    throw new Error(`Gagal mengambil tasks dari Google Tasks: ${res.statusText}`);
  }

  const data = await res.json();
  return data.items || [];
};

// Create a task in Google Tasks
export const createGoogleTask = async (
  token: string,
  taskListId: string,
  task: { title: string; notes?: string; due?: string }
): Promise<GoogleTaskItem> => {
  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(taskListId)}/tasks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: task.title,
      notes: task.notes,
      due: task.due,
    }),
  });

  if (!res.ok) {
    throw new Error(`Gagal membuat task di Google Tasks: ${res.statusText}`);
  }

  return await res.json();
};

// Update task completion status in Google Tasks (input centang)
export const updateGoogleTaskStatus = async (
  token: string,
  taskListId: string,
  taskId: string,
  completed: boolean
): Promise<void> => {
  const res = await fetch(
    `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: completed ? 'completed' : 'needsAction',
        completed: completed ? new Date().toISOString() : null,
      }),
    }
  );

  if (!res.ok) {
    console.warn(`Gagal mengupdate status Google Task ${taskId}: ${res.statusText}`);
  }
};

// Update task details
export const updateGoogleTaskDetails = async (
  token: string,
  taskListId: string,
  taskId: string,
  updates: { title?: string; notes?: string; due?: string }
): Promise<void> => {
  const res = await fetch(
    `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    }
  );

  if (!res.ok) {
    console.warn(`Gagal mengupdate detail Google Task: ${res.statusText}`);
  }
};

// Delete a task in Google Tasks
export const deleteGoogleTask = async (
  token: string,
  taskListId: string,
  taskId: string
): Promise<void> => {
  await fetch(
    `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
};

// Helper: infer schedule type (Senin-Jumat vs Sabtu-Minggu vs Setiap Hari)
export const inferScheduleType = (title: string, notes?: string): 'all' | 'weekday' | 'weekend' => {
  const text = `${title} ${notes || ''}`.toLowerCase();
  if (
    text.includes('senin-jumat') ||
    text.includes('senin - jumat') ||
    text.includes('weekday') ||
    text.includes('hari kerja') ||
    text.includes('[jadwal: senin-jumat]')
  ) {
    return 'weekday';
  }
  if (
    text.includes('sabtu-minggu') ||
    text.includes('sabtu - minggu') ||
    text.includes('weekend') ||
    text.includes('akhir pekan') ||
    text.includes('[jadwal: sabtu-minggu]')
  ) {
    return 'weekend';
  }
  if (text.includes('setiap hari') || text.includes('harian') || text.includes('daily') || text.includes('[jadwal: setiap hari]')) {
    return 'all';
  }
  // Default infer based on common school/work routines
  if (text.includes('sekolah') || text.includes('pelajaran') || text.includes('kelas') || text.includes('upacara')) {
    return 'weekday';
  }
  return 'all';
};

// Helper: infer category from title or notes
const inferCategory = (title: string, notes?: string): CategoryType => {
  const text = `${title} ${notes || ''}`.toLowerCase();
  if (text.includes('sholat') || text.includes('dzikir') || text.includes('doa') || text.includes('ngaji') || text.includes('masjid') || text.includes('qur')) {
    return 'Ibadah';
  }
  if (text.includes('belajar') || text.includes('tugas') || text.includes('kuliah') || text.includes('sekolah') || text.includes('ujian') || text.includes('pr') || text.includes('coding') || text.includes('baca')) {
    return 'Sekolah/Belajar';
  }
  if (text.includes('olahraga') || text.includes('lari') || text.includes('jogging') || text.includes('workout') || text.includes('gym') || text.includes('jalan')) {
    return 'Olahraga & Kesehatan';
  }
  if (text.includes('istirahat') || text.includes('rehat') || text.includes('tidur') || text.includes('osis') || text.includes('rapat') || text.includes('santai')) {
    return 'Rehat/OSIS';
  }
  return 'Rutin Harian';
};

// Helper: infer time from notes or due
const inferTime = (notes?: string, due?: string): string => {
  if (notes) {
    const timeMatch = notes.match(/\b([01]?[0-9]|2[0-3]):([0-5][0-9])\b/);
    if (timeMatch) return timeMatch[0];
  }
  if (due) {
    try {
      const d = new Date(due);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      }
    } catch {}
  }
  return '08:00';
};

export const DEMO_TASK_TITLES = [
  'bangun pagi & sholat subuh',
  'persiapan & sarapan nutrisi',
  'pembelajaran sekolah / deep study',
  'istirahat siang & sholat dzuhur',
  'penyelesaian tugas akademik & praktikum',
  'koordinasi program kerja osis & tim',
  'olahraga sore & workout / jogging',
  'sholat maghrib & tadarus al-qur\'an',
  'deep work: project coding & skill upgrade',
  'review capaian harian & daily journaling',
];

export const isDemoTask = (title: string, notes?: string): boolean => {
  const t = (title || '').toLowerCase().trim();
  const n = (notes || '').toLowerCase().trim();
  return DEMO_TASK_TITLES.some(demo => {
    const d = demo.toLowerCase();
    return t === d || t.includes(d) || d.includes(t);
  });
};

/**
 * Hapus semua tugas demo bawaan lama yang terlanjur terunggah ke akun Google Tasks pengguna
 */
export const cleanLegacyDemoTasksFromGoogleTasks = async (
  token: string,
  taskListId: string
): Promise<number> => {
  try {
    const remoteTasks = await fetchGoogleTasks(token, taskListId);
    let cleaned = 0;
    for (const rTask of remoteTasks) {
      if (isDemoTask(rTask.title, rTask.notes)) {
        try {
          await deleteGoogleTask(token, taskListId, rTask.id);
          cleaned++;
        } catch (err) {
          console.warn('Gagal menghapus tugas demo lama dari Google Tasks:', rTask.title, err);
        }
      }
    }
    return cleaned;
  } catch (e) {
    console.warn('Error saat membersihkan tugas demo:', e);
    return 0;
  }
};

/**
 * Sync with "Tugas Saya" in Google Tasks:
 * 1. Pulls all tasks from the user's "Tugas Saya" list.
 * 2. Purges any legacy demo tasks automatically from Google Tasks.
 * 3. Uses Google Tasks as the authoritative source for checkmarks ('completed' vs 'needsAction').
 * 4. Imports user's real tasks that are in Google Tasks.
 * 5. Pushes local tasks to Google Tasks.
 */
export const syncWithTugasSaya = async (
  token: string,
  taskListId: string,
  localHabits: HabitTask[]
): Promise<{ syncedHabits: HabitTask[]; importedCount: number; cleanedDemoCount: number }> => {
  const remoteTasks = await fetchGoogleTasks(token, taskListId);
  // Filter out demo habits from local habits list
  const updatedHabits: HabitTask[] = localHabits.filter(h => !isDemoTask(h.title, h.notes));
  let importedCount = 0;
  let cleanedDemoCount = 0;

  // 1. Process all remote tasks from "Tugas Saya"
  const processedRemoteIds = new Set<string>();

  for (const rTask of remoteTasks) {
    if (!rTask.title || !rTask.title.trim()) continue;

    // JIKA TUGAS MERUPAKAN DATA DEMO/BAWAAN LAMA:
    // Hapus langsung dari Google Tasks pengguna agar tidak mengotori daftar "Selesai"!
    if (isDemoTask(rTask.title, rTask.notes)) {
      try {
        await deleteGoogleTask(token, taskListId, rTask.id);
        cleanedDemoCount++;
      } catch (err) {
        console.warn('Gagal hapus demo task:', rTask.title, err);
      }
      continue;
    }

    processedRemoteIds.add(rTask.id);

    // Find existing habit matching this Google Task
    const existingIndex = updatedHabits.findIndex(
      h => h.googleTaskId === rTask.id || h.title.trim().toLowerCase() === rTask.title.trim().toLowerCase()
    );

    const isRemoteCompleted = rTask.status === 'completed';

    if (existingIndex >= 0) {
      // Sync from Google Task (Google Tasks is input centang)
      const existing = updatedHabits[existingIndex];
      existing.googleTaskId = rTask.id;
      existing.googleTaskListId = taskListId;
      existing.title = rTask.title;
      // If remote task notes specify schedule, update local scheduleType
      if (rTask.notes) {
        existing.scheduleType = inferScheduleType(rTask.title, rTask.notes);
      }
      if (existing.completed !== isRemoteCompleted) {
        existing.completed = isRemoteCompleted;
        existing.completedAt = isRemoteCompleted
          ? (rTask.completed ? new Date(rTask.completed).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }))
          : undefined;
      }
    } else {
      // New task found in Google Tasks "Tugas Saya" -> Import into Web App!
      const newHabit: HabitTask = {
        id: `gtask-${rTask.id}`,
        title: rTask.title,
        category: inferCategory(rTask.title, rTask.notes),
        time: inferTime(rTask.notes, rTask.due),
        scheduleType: inferScheduleType(rTask.title, rTask.notes),
        completed: isRemoteCompleted,
        completedAt: isRemoteCompleted
          ? (rTask.completed ? new Date(rTask.completed).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }))
          : undefined,
        priority: 'medium',
        durationMinutes: 30,
        notes: rTask.notes || 'Diambil dari Google Tasks (Tugas Saya)',
        createdAt: rTask.updated || new Date().toISOString(),
        googleTaskId: rTask.id,
        googleTaskListId: taskListId,
      };
      updatedHabits.push(newHabit);
      importedCount++;
    }
  }

  // 2. Upload any local tasks that don't exist yet in Google Tasks
  for (let i = 0; i < updatedHabits.length; i++) {
    const habit = updatedHabits[i];
    if (!habit.googleTaskId || !processedRemoteIds.has(habit.googleTaskId)) {
      try {
        const schedLabel =
          habit.scheduleType === 'weekday'
            ? 'Senin-Jumat'
            : habit.scheduleType === 'weekend'
            ? 'Sabtu-Minggu'
            : 'Setiap Hari';
        const created = await createGoogleTask(token, taskListId, {
          title: habit.title,
          notes: `[Jadwal: ${schedLabel}] [Kategori: ${habit.category}] [Waktu: ${habit.time}] ${habit.notes || ''}`,
        });
        habit.googleTaskId = created.id;
        habit.googleTaskListId = taskListId;
        if (habit.completed) {
          await updateGoogleTaskStatus(token, taskListId, created.id, true);
        }
      } catch (err) {
        console.warn('Gagal mengunggah local task ke Google Tasks:', habit.title, err);
      }
    }
  }

  return { syncedHabits: updatedHabits, importedCount, cleanedDemoCount };
};

// Reset all Google Tasks to 'needsAction' when a new day arrives
export const resetGoogleTasksForNewDay = async (
  token: string,
  taskListId: string,
  habits: HabitTask[]
): Promise<void> => {
  for (const habit of habits) {
    if (habit.googleTaskId && habit.completed) {
      try {
        await updateGoogleTaskStatus(token, taskListId, habit.googleTaskId, false);
      } catch (err) {
        console.warn('Gagal reset status Google Task pada ganti hari:', habit.title, err);
      }
    }
  }
};
