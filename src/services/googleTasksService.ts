import { HabitTask } from '../types';

export interface GoogleTaskItem {
  id: string;
  title: string;
  status: 'needsAction' | 'completed';
  notes?: string;
  due?: string;
  updated?: string;
}

export interface GoogleTaskList {
  id: string;
  title: string;
}

export const getOrCreateHabitTaskList = async (token: string): Promise<string> => {
  const listRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!listRes.ok) {
    throw new Error(`Google Tasks Error: ${listRes.statusText}`);
  }

  const data = await listRes.json();
  const lists: GoogleTaskList[] = data.items || [];
  const existing = lists.find(l => l.title === 'I.R.I.S. Habit Tracker' || l.title === 'My Habits');

  if (existing) {
    return existing.id;
  }

  // Create list
  const createRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title: 'I.R.I.S. Habit Tracker' }),
  });

  if (!createRes.ok) {
    throw new Error(`Gagal membuat daftar Google Tasks: ${createRes.statusText}`);
  }

  const newList = await createRes.json();
  return newList.id;
};

export const fetchGoogleTasks = async (token: string, taskListId: string): Promise<GoogleTaskItem[]> => {
  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks?showCompleted=true&showHidden=true`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Gagal mengambil tasks: ${res.statusText}`);
  }

  const data = await res.json();
  return data.items || [];
};

export const createGoogleTask = async (
  token: string,
  taskListId: string,
  task: { title: string; notes?: string; due?: string }
): Promise<GoogleTaskItem> => {
  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`, {
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
    throw new Error(`Gagal membuat task: ${res.statusText}`);
  }

  return await res.json();
};

export const updateGoogleTaskStatus = async (
  token: string,
  taskListId: string,
  taskId: string,
  completed: boolean
): Promise<void> => {
  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status: completed ? 'completed' : 'needsAction',
    }),
  });

  if (!res.ok) {
    console.warn(`Gagal mengupdate status Google Task: ${res.statusText}`);
  }
};

export const updateGoogleTaskDetails = async (
  token: string,
  taskListId: string,
  taskId: string,
  updates: { title?: string; notes?: string; due?: string }
): Promise<void> => {
  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!res.ok) {
    console.warn(`Gagal mengupdate detail Google Task: ${res.statusText}`);
  }
};


export const deleteGoogleTask = async (
  token: string,
  taskListId: string,
  taskId: string
): Promise<void> => {
  await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

export const syncLocalHabitsToGoogleTasks = async (
  token: string,
  taskListId: string,
  habits: HabitTask[]
): Promise<HabitTask[]> => {
  const remoteTasks = await fetchGoogleTasks(token, taskListId);
  const updatedHabits = [...habits];

  for (let i = 0; i < updatedHabits.length; i++) {
    const habit = updatedHabits[i];
    const existing = remoteTasks.find(t => t.title === habit.title || t.id === habit.googleTaskId);

    if (existing) {
      habit.googleTaskId = existing.id;
      habit.googleTaskListId = taskListId;
      // sync completion status if changed
      if (existing.status === 'completed' && !habit.completed) {
        habit.completed = true;
      }
    } else {
      // create in Google Tasks
      try {
        const created = await createGoogleTask(token, taskListId, {
          title: habit.title,
          notes: `[Kategori: ${habit.category}] [Waktu: ${habit.time}] ${habit.notes || ''}`,
        });
        habit.googleTaskId = created.id;
        habit.googleTaskListId = taskListId;
        if (habit.completed) {
          await updateGoogleTaskStatus(token, taskListId, created.id, true);
        }
      } catch (err) {
        console.error('Error creating task on Google:', err);
      }
    }
  }

  return updatedHabits;
};
