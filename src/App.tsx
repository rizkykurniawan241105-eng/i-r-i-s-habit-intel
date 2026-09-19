import React, { useState, useEffect } from 'react';
import {
  INITIAL_HABITS,
  calculateStats,
} from './data/dummyData';
import {
  HabitTask,
  TimeFilter,
  UserStats,
  GoogleUser,
  GoogleSyncState,
  CalendarEventItem,
} from './types';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
} from './services/firebaseAuth';
import {
  getOrCreateHabitTaskList,
  syncLocalHabitsToGoogleTasks,
  updateGoogleTaskStatus,
  updateGoogleTaskDetails,
  createGoogleTask,
  deleteGoogleTask,
} from './services/googleTasksService';
import {
  findOrCreateHabitSpreadsheet,
  syncHabitsToSpreadsheet,
} from './services/googleSheetsService';
import {
  fetchTodayCalendarEvents,
  addHabitToCalendar,
} from './services/googleCalendarService';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { MetricCards } from './components/MetricCards';
import { MainTrendChart } from './components/MainTrendChart';
import { CategoryDonutChart } from './components/CategoryDonutChart';
import { TaskChecklist } from './components/TaskChecklist';
import { QuickAddTaskModal } from './components/QuickAddTaskModal';
import { GoogleSheetsView } from './components/GoogleSheetsView';
import { AnalyticsView } from './components/AnalyticsView';
import { CalendarScheduleWidget } from './components/CalendarScheduleWidget';
import { GeminiAiChatView } from './components/GeminiAiChatView';
import { CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';

export default function App() {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return (
      localStorage.getItem('iris_theme') === 'dark' ||
      window.matchMedia('(prefers-color-scheme: dark)').matches
    );
  });

  // Navigation and time filter
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('today');
  const [isOpenMobile, setIsOpenMobile] = useState<boolean>(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState<boolean>(false);

  // Core habit state
  const [habits, setHabits] = useState<HabitTask[]>(() => {
    try {
      const saved = localStorage.getItem('iris_habits');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading iris_habits from localStorage', e);
    }
    return INITIAL_HABITS;
  });

  // User Stats state
  const [stats, setStats] = useState<UserStats>(() => calculateStats(habits || INITIAL_HABITS));

  // Google Workspace Auth & Sync state
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);
  const [syncState, setSyncState] = useState<GoogleSyncState>({
    isConnected: false,
    isSyncing: false,
    lastSyncedAt: null,
    spreadsheetId: null,
    spreadsheetUrl: null,
    taskListId: null,
    statusMessage: null,
  });

  // Google Calendar state
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventItem[]>([]);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState<boolean>(false);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sync theme with HTML class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('iris_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('iris_theme', 'light');
    }
  }, [isDarkMode]);

  // Recalculate stats & save to localStorage whenever habits change
  useEffect(() => {
    const newStats = calculateStats(habits);
    setStats(newStats);
    localStorage.setItem('iris_habits', JSON.stringify(habits));
  }, [habits]);

  // Initialize Firebase Auth listener on startup
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setSyncState(prev => ({ ...prev, isConnected: true }));
        handleInitialGoogleSync(token);
      },
      () => {
        // Not signed in
      }
    );

    return () => unsubscribe();
  }, []);

  const handleInitialGoogleSync = async (token: string) => {
    try {
      setSyncState(prev => ({ ...prev, isSyncing: true }));
      // 1. Google Tasks Setup
      const taskListId = await getOrCreateHabitTaskList(token);
      const syncedHabits = await syncLocalHabitsToGoogleTasks(token, taskListId, habits);
      setHabits(syncedHabits);

      // 2. Google Sheets Setup
      const sheet = await findOrCreateHabitSpreadsheet(token);
      await syncHabitsToSpreadsheet(token, sheet.id, syncedHabits, calculateStats(syncedHabits));

      // 3. Calendar Events
      const events = await fetchTodayCalendarEvents(token);
      setCalendarEvents(events);

      const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      setSyncState(prev => ({
        ...prev,
        isConnected: true,
        isSyncing: false,
        taskListId,
        spreadsheetId: sheet.id,
        spreadsheetUrl: sheet.url,
        lastSyncedAt: nowStr,
        statusMessage: 'Tersinkronisasi dengan Google Sheets & Tasks',
      }));

      showToast('Google Workspace terhubung & tersinkronisasi!', 'success');
    } catch (err: any) {
      console.error('Initial sync error:', err);
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        statusMessage: `Sync parsial: ${err?.message || 'Gagal tersambung'}`,
      }));
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setSyncState(prev => ({ ...prev, isSyncing: true }));
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setSyncState(prev => ({ ...prev, isConnected: true }));
        await handleInitialGoogleSync(result.accessToken);
      } else {
        // User closed or dismissed popup window intentionally
        setSyncState(prev => ({ ...prev, isSyncing: false }));
      }
    } catch (error: any) {
      setSyncState(prev => ({ ...prev, isSyncing: false }));
      if (
        error?.code === 'auth/popup-closed-by-user' ||
        error?.code === 'auth/cancelled-popup-request'
      ) {
        return;
      }
      if (error?.code === 'auth/popup-blocked') {
        showToast('Jendela popup diblokir oleh browser. Izinkan popup atau buka di tab baru.', 'info');
        return;
      }
      console.error('Sign in error:', error);
      showToast('Gagal menghubungkan Google: ' + (error?.message || 'Coba lagi'), 'error');
    }
  };

  const handleLogout = async () => {
    await logout();
    setGoogleUser(null);
    setSyncState(prev => ({
      ...prev,
      isConnected: false,
      lastSyncedAt: null,
      spreadsheetId: null,
      spreadsheetUrl: null,
      taskListId: null,
    }));
    setCalendarEvents([]);
    showToast('Telah keluar dari akun Google.', 'info');
  };

  const handleManualSync = async () => {
    const token = await getAccessToken();
    if (!token) {
      handleGoogleSignIn();
      return;
    }

    try {
      setSyncState(prev => ({ ...prev, isSyncing: true }));
      const sheet = await findOrCreateHabitSpreadsheet(token);
      await syncHabitsToSpreadsheet(token, sheet.id, habits, stats);

      if (syncState.taskListId) {
        await syncLocalHabitsToGoogleTasks(token, syncState.taskListId, habits);
      }

      const events = await fetchTodayCalendarEvents(token);
      setCalendarEvents(events);

      const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncedAt: nowStr,
        spreadsheetId: sheet.id,
        spreadsheetUrl: sheet.url,
      }));

      showToast('Data berhasil disinkronkan ke Google Sheets & Tasks!', 'success');
    } catch (err: any) {
      console.error('Manual sync error:', err);
      setSyncState(prev => ({ ...prev, isSyncing: false }));
      showToast('Gagal sinkron data: ' + (err?.message || 'Periksa koneksi'), 'error');
    }
  };

  const handleToggleHabit = async (id: string) => {
    const updated = habits.map(h => {
      if (h.id === id) {
        const nextCompleted = !h.completed;
        return {
          ...h,
          completed: nextCompleted,
          completedAt: nextCompleted
            ? new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
            : undefined,
        };
      }
      return h;
    });

    setHabits(updated);

    // If connected to Google Tasks, sync remote status asynchronously
    const target = updated.find(h => h.id === id);
    if (target && target.googleTaskId && syncState.taskListId) {
      const token = await getAccessToken();
      if (token) {
        updateGoogleTaskStatus(token, syncState.taskListId, target.googleTaskId, target.completed);
      }
    }
  };

  const handleAddHabit = async (taskData: Omit<HabitTask, 'id' | 'createdAt'>) => {
    const newId = `habit-${Date.now()}`;
    const newTask: HabitTask = {
      ...taskData,
      id: newId,
      createdAt: new Date().toISOString(),
    };

    // If connected, create in Google Tasks
    const token = await getAccessToken();
    if (token && syncState.taskListId) {
      try {
        const created = await createGoogleTask(token, syncState.taskListId, {
          title: newTask.title,
          notes: `[Kategori: ${newTask.category}] [Waktu: ${newTask.time}] ${newTask.notes || ''}`,
        });
        newTask.googleTaskId = created.id;
        newTask.googleTaskListId = syncState.taskListId;
      } catch (err) {
        console.warn('Gagal sinkron habit baru ke Google Tasks:', err);
      }
    }

    setHabits(prev => [newTask, ...prev]);
    showToast(`Kegiatan "${newTask.title}" berhasil ditambahkan!`, 'success');
  };

  const handleBatchAddHabits = async (tasksData: Array<Omit<HabitTask, 'id' | 'createdAt'>>) => {
    const token = await getAccessToken();
    const newTasks: HabitTask[] = [];

    for (const taskData of tasksData) {
      const newId = `habit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      const newTask: HabitTask = {
        ...taskData,
        id: newId,
        createdAt: new Date().toISOString(),
      };

      if (token && syncState.taskListId) {
        try {
          const created = await createGoogleTask(token, syncState.taskListId, {
            title: newTask.title,
            notes: `[Kategori: ${newTask.category}] [Waktu: ${newTask.time}] ${newTask.notes || ''}`,
          });
          newTask.googleTaskId = created.id;
          newTask.googleTaskListId = syncState.taskListId;
        } catch (err) {
          console.warn('Gagal sinkron batch habit ke Google Tasks:', err);
        }
      }
      newTasks.push(newTask);
    }

    setHabits(prev => [...newTasks, ...prev]);
    showToast(`${newTasks.length} kegiatan berhasil ditambahkan ke daftar & Google Tasks!`, 'success');
  };

  const handleUpdateHabit = async (id: string, updates: Partial<HabitTask>) => {
    const updated = (habits || []).map(h => {
      if (h.id === id) {
        return { ...h, ...updates };
      }
      return h;
    });

    setHabits(updated);

    const target = updated.find(h => h.id === id);
    if (target?.googleTaskId && syncState.taskListId) {
      const token = await getAccessToken();
      if (token) {
        updateGoogleTaskDetails(token, syncState.taskListId, target.googleTaskId, {
          title: target.title,
          notes: `[Kategori: ${target.category}] [Waktu: ${target.time}] ${target.notes || ''}`,
        });
        if (updates.completed !== undefined) {
          updateGoogleTaskStatus(token, syncState.taskListId, target.googleTaskId, target.completed);
        }
      }
    }
    showToast(`Kegiatan "${target?.title || ''}" telah diperbarui!`, 'success');
  };

  const handleDeleteHabit = async (id: string) => {
    const target = (habits || []).find(h => h.id === id);
    setHabits(prev => (prev || []).filter(h => h.id !== id));

    if (target?.googleTaskId && syncState.taskListId) {
      const token = await getAccessToken();
      if (token) {
        deleteGoogleTask(token, syncState.taskListId, target.googleTaskId);
      }
    }
    showToast('Kegiatan telah dihapus.', 'info');
  };

  const handleAddToCalendar = async (habit: HabitTask) => {
    const token = await getAccessToken();
    if (!token) {
      handleGoogleSignIn();
      return;
    }

    const success = await addHabitToCalendar(token, habit.title, habit.time, habit.durationMinutes || 45);
    if (success) {
      showToast(`Jadwal "${habit.title}" ditambahkan ke Google Calendar!`, 'success');
      const events = await fetchTodayCalendarEvents(token);
      setCalendarEvents(events);
    } else {
      showToast('Gagal menambahkan ke Google Calendar.', 'error');
    }
  };

  const handleRefreshCalendar = async () => {
    const token = await getAccessToken();
    if (!token) return;
    setIsLoadingCalendar(true);
    try {
      const events = await fetchTodayCalendarEvents(token);
      setCalendarEvents(events);
      showToast('Jadwal Calendar diperbarui.', 'info');
    } finally {
      setIsLoadingCalendar(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors duration-300">
      
      {/* Toast Notification Container */}
      {toastMessage && (
        <div
          id="toast-notification-banner"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xl border border-slate-700 dark:border-slate-200 animate-slide-up text-xs font-bold"
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
          ) : toastMessage.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-red-400 dark:text-red-600" />
          ) : (
            <Sparkles className="w-4 h-4 text-indigo-400 dark:text-indigo-600" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Sidebar Component */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpenMobile={isOpenMobile}
        setIsOpenMobile={setIsOpenMobile}
        googleUser={googleUser}
        syncState={syncState}
        onConnectGoogle={handleGoogleSignIn}
        onSyncNow={handleManualSync}
        onLogout={handleLogout}
        streakCount={stats.habitStreak}
        completionRate={stats.completionRate}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
        
        {/* Header Bar */}
        <Header
          onOpenMobileMenu={() => setIsOpenMobile(true)}
          timeFilter={timeFilter}
          setTimeFilter={setTimeFilter}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          googleUser={googleUser}
          syncState={syncState}
          onConnectGoogle={handleGoogleSignIn}
          onSyncNow={handleManualSync}
          onOpenQuickAdd={() => setIsQuickAddOpen(true)}
        />

        {/* Dynamic View Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fade-in" id="dashboard-main-view">
              
              {/* 1. Top Metric Cards (4 Kolom Desktop, 1 Kolom Mobile) */}
              <MetricCards stats={stats} />

              {/* 2. Main Visual Area: 2/3 Main Chart + 1/3 Side Donut Widget */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <MainTrendChart
                    timeFilter={timeFilter}
                    isDarkMode={isDarkMode}
                    habits={habits}
                  />
                </div>
                <div className="lg:col-span-1">
                  <CategoryDonutChart
                    habits={habits}
                    isDarkMode={isDarkMode}
                  />
                </div>
              </div>

              {/* 3. Interactive Task Checklist Section */}
              <div className="grid grid-cols-1 gap-6">
                <TaskChecklist
                  habits={habits}
                  onToggleHabit={handleToggleHabit}
                  onDeleteHabit={handleDeleteHabit}
                  onOpenQuickAdd={() => setIsQuickAddOpen(true)}
                  onAddToCalendar={handleAddToCalendar}
                  onOpenAiAssistant={() => setActiveTab('ai-chat')}
                />
              </div>
            </div>
          )}

          {activeTab === 'ai-chat' && (
            <div className="space-y-6 animate-fade-in" id="gemini-ai-chat-tab-view">
              <GeminiAiChatView
                habits={habits}
                stats={stats}
                googleUser={googleUser}
                syncState={syncState}
                onAddHabit={handleAddHabit}
                onBatchAddHabits={handleBatchAddHabits}
                onToggleHabit={handleToggleHabit}
                onDeleteHabit={handleDeleteHabit}
                onUpdateHabit={handleUpdateHabit}
                onManualSync={handleManualSync}
                onConnectGoogle={handleGoogleSignIn}
                showToast={showToast}
              />
            </div>
          )}

          {activeTab === 'habits' && (
            <div className="space-y-6 animate-fade-in" id="habits-tasks-view">
              <TaskChecklist
                habits={habits}
                onToggleHabit={handleToggleHabit}
                onDeleteHabit={handleDeleteHabit}
                onOpenQuickAdd={() => setIsQuickAddOpen(true)}
                onAddToCalendar={handleAddToCalendar}
                onOpenAiAssistant={() => setActiveTab('ai-chat')}
              />
            </div>
          )}

          {activeTab === 'analytics' && (
            <AnalyticsView
              habits={habits}
              stats={stats}
            />
          )}

          {activeTab === 'schedule' && (
            <CalendarScheduleWidget
              habits={habits}
              calendarEvents={calendarEvents}
              onRefreshEvents={handleRefreshCalendar}
              isLoadingEvents={isLoadingCalendar}
              onOpenQuickAdd={() => setIsQuickAddOpen(true)}
            />
          )}

          {activeTab === 'sheets' && (
            <GoogleSheetsView
              syncState={syncState}
              onSyncNow={handleManualSync}
              onConnectGoogle={handleGoogleSignIn}
              habits={habits}
              stats={stats}
              googleUser={googleUser}
            />
          )}
        </main>
      </div>

      {/* Quick Add Habit Modal */}
      <QuickAddTaskModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onAddTask={handleAddHabit}
      />
    </div>
  );
}
