export type CategoryType = 'Ibadah' | 'Sekolah/Belajar' | 'Rutin Harian' | 'Rehat/OSIS' | 'Olahraga & Kesehatan';

export type TimeFilter = 'today' | 'week' | 'month';

export type ScheduleType = 'all' | 'weekday' | 'weekend';

export interface HabitTask {
  id: string;
  title: string;
  category: CategoryType;
  time: string; // e.g. "04:50"
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  notes?: string;
  scheduleType?: ScheduleType; // 'all' = Setiap Hari, 'weekday' = Senin-Jumat, 'weekend' = Sabtu-Minggu
  googleTaskId?: string;
  googleTaskListId?: string;
  googleCalendarEventId?: string;
  createdAt: string;
  completedAt?: string;
  durationMinutes?: number;
}

export interface DayTrendData {
  date: string;
  dayName: string;
  completed: number;
  total: number;
  percentage: number;
  hours: number;
}

export interface UserStats {
  tasksCompleted: number;
  totalTasks: number;
  completionRate: number; // 0-100
  habitStreak: number;
  productivityScore: number; // out of 10
  timeInvestedHours: number;
}

export interface GoogleUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export interface GoogleSyncState {
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  taskListId: string | null;
  taskListName?: string | null;
  databaseLogsCount?: number;
  statusMessage: string | null;
}

export interface CalendarEventItem {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  color?: string;
}

export type AIActionType = 'ADD_HABIT' | 'UPDATE_HABIT' | 'DELETE_HABIT' | 'TOGGLE_HABIT' | 'BATCH_ADD_HABITS';

export interface AIAction {
  type: AIActionType;
  habit?: Partial<HabitTask>;
  habits?: Array<Partial<HabitTask>>;
  targetId?: string;
  targetTitle?: string;
  completed?: boolean;
  description: string;
}

export interface ChatImageAttachment {
  data: string; // base64 string
  mimeType: string;
  name?: string;
  previewUrl?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  actions?: AIAction[];
  image?: ChatImageAttachment;
  isPending?: boolean;
}


