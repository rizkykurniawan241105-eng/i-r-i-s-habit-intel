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
  DayTrendData,
} from './types';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
} from './services/firebaseAuth';
import {
  getPrimaryTugasSayaTaskList,
  syncWithTugasSaya,
  resetGoogleTasksForNewDay,
  updateGoogleTaskStatus,
  updateGoogleTaskDetails,
  createGoogleTask,
  deleteGoogleTask,
  isDemoTask,
  cleanLegacyDemoTasksFromGoogleTasks,
} from './services/googleTasksService';
import {
  findOrCreateHabitSpreadsheet,
  syncHabitsToSpreadsheet,
  fetchDailyHistoryFromSpreadsheet,
} from './services/googleSheetsService';
import {
  fetchTodayCalendarEvents,
  addHabitToCalendar,
  createCalendarEventForHabit,
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
import { CheckCircle2, AlertTriangle, Sparkles, Layers, Database } from 'lucide-react';

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

  // Core habit state (mulai dari bersih, hapus sisa demo lama)
  const [habits, setHabits] = useState<HabitTask[]>(() => {
    try {
      const saved = localStorage.getItem('iris_habits');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Bersihkan semua tugas bawaan/demo lama agar tidak muncul
          const cleaned = parsed.filter(h => !isDemoTask(h.title, h.notes));
          if (cleaned.length !== parsed.length) {
            localStorage.setItem('iris_habits', JSON.stringify(cleaned));
          }
          return cleaned;
        }
      }
    } catch (e) {
      console.warn('Error reading iris_habits from localStorage', e);
    }
    return [];
  });

  // User Stats state
  const [stats, setStats] = useState<UserStats>(() => calculateStats(habits || INITIAL_HABITS));

  // Historical Trends loaded from Google Sheets Database
  const [historicalTrends, setHistoricalTrends] = useState<DayTrendData[]>([]);

  // Google Workspace Auth & Sync state
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);
  const [syncState, setSyncState] = useState<GoogleSyncState>({
    isConnected: false,
    isSyncing: false,
    lastSyncedAt: null,
    spreadsheetId: null,
    spreadsheetUrl: null,
    taskListId: null,
    taskListName: 'Tugas Saya',
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

  // Day-change detection (automatic rollover & checkmark reset)
  useEffect(() => {
    const checkDayChange = async () => {
      const todayKey = new Date().toISOString().split('T')[0];
      const savedDate = localStorage.getItem('iris_last_active_date');

      if (savedDate && savedDate !== todayKey) {
        console.log(`[Day Change] Detected new day: previous ${savedDate}, now ${todayKey}`);
        localStorage.setItem('iris_last_active_date', todayKey);

        // Reset checkmarks for new day
        const freshHabits = habits.map(h => ({
          ...h,
          completed: false,
          completedAt: undefined,
        }));
        setHabits(freshHabits);

        // Sync with Google Tasks & Sheets if connected
        const token = await getAccessToken();
        if (token && syncState.taskListId) {
          try {
            await resetGoogleTasksForNewDay(token, syncState.taskListId, habits);
            if (syncState.spreadsheetId) {
              await syncHabitsToSpreadsheet(token, syncState.spreadsheetId, freshHabits);
              const history = await fetchDailyHistoryFromSpreadsheet(token, syncState.spreadsheetId);
              if (history && history.length > 0) setHistoricalTrends(history);
            }
          } catch (e) {
            console.warn('Auto reset day sync error:', e);
          }
        }
        showToast('Hari baru telah tiba! Centang tugas otomatis direset untuk hari ini.', 'info');
      } else if (!savedDate) {
        localStorage.setItem('iris_last_active_date', todayKey);
      }
    };

    checkDayChange();
    const interval = setInterval(checkDayChange, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [syncState.taskListId, syncState.spreadsheetId, habits]);

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

      // 1. Google Tasks: Target "Tugas Saya" as the authoritative input source
      const primaryList = await getPrimaryTugasSayaTaskList(token);
      const { syncedHabits, importedCount } = await syncWithTugasSaya(token, primaryList.id, habits);
      setHabits(syncedHabits);

      // 2. Google Sheets: Database for historical logs and current task lists
      const sheet = await findOrCreateHabitSpreadsheet(token);
      await syncHabitsToSpreadsheet(token, sheet.id, syncedHabits, calculateStats(syncedHabits));

      // 3. Load historical trends from Google Sheets database
      const history = await fetchDailyHistoryFromSpreadsheet(token, sheet.id);
      if (history && history.length > 0) {
        setHistoricalTrends(history);
      }

      // 4. Calendar Events
      const events = await fetchTodayCalendarEvents(token);
      setCalendarEvents(events);

      const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      setSyncState(prev => ({
        ...prev,
        isConnected: true,
        isSyncing: false,
        taskListId: primaryList.id,
        taskListName: primaryList.title,
        spreadsheetId: sheet.id,
        spreadsheetUrl: sheet.url,
        databaseLogsCount: history.length,
        lastSyncedAt: nowStr,
        statusMessage: `Tersinkron: ${primaryList.title} (Tasks) & Google Sheets (DB)`,
      }));

      showToast(
        importedCount > 0
          ? `Tersinkron! ${importedCount} tugas baru dari Google Tasks (${primaryList.title}) diimpor.`
          : `Google Tasks (${primaryList.title}) & Google Sheets Database aktif!`,
        'success'
      );
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
      taskListName: 'Tugas Saya',
      statusMessage: null,
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

      // 1. Sync with Google Tasks (Tugas Saya)
      const primaryList = await getPrimaryTugasSayaTaskList(token);
      const { syncedHabits, importedCount } = await syncWithTugasSaya(token, primaryList.id, habits);
      setHabits(syncedHabits);

      // 2. Sync to Google Sheets Database
      const sheet = await findOrCreateHabitSpreadsheet(token);
      await syncHabitsToSpreadsheet(token, sheet.id, syncedHabits, calculateStats(syncedHabits));

      // 3. Fetch historical database trends for chart output
      const history = await fetchDailyHistoryFromSpreadsheet(token, sheet.id);
      if (history && history.length > 0) {
        setHistoricalTrends(history);
      }

      // 4. Fetch Calendar
      const events = await fetchTodayCalendarEvents(token);
      setCalendarEvents(events);

      const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        taskListId: primaryList.id,
        taskListName: primaryList.title,
        spreadsheetId: sheet.id,
        spreadsheetUrl: sheet.url,
        databaseLogsCount: history.length,
        lastSyncedAt: nowStr,
        statusMessage: `Tersinkron: ${primaryList.title} & Google Sheets DB`,
      }));

      showToast(
        importedCount > 0
          ? `Sinkron berhasil! ${importedCount} tugas dari Google Tasks (${primaryList.title}) diperbarui.`
          : 'Data berhasil disinkronkan ke Google Tasks & Google Sheets Database!',
        'success'
      );
    } catch (err: any) {
      console.error('Manual sync error:', err);
      setSyncState(prev => ({ ...prev, isSyncing: false }));
      showToast('Gagal sinkron data: ' + (err?.message || 'Periksa koneksi'), 'error');
    }
  };

  // Toggle habit checkbox (Input centang)
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

    // If connected to Google Tasks, sync status directly to Google Tasks
    const target = updated.find(h => h.id === id);
    if (target && target.googleTaskId && syncState.taskListId) {
      const token = await getAccessToken();
      if (token) {
        updateGoogleTaskStatus(token, syncState.taskListId, target.googleTaskId, target.completed);
      }
    }
  };

  // Set habit completed explicitly (used by AI chat)
  const handleSetHabitStatus = async (id: string, completed: boolean) => {
    const updated = habits.map(h => {
      if (h.id === id) {
        return {
          ...h,
          completed,
          completedAt: completed
            ? (h.completedAt || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }))
            : undefined,
        };
      }
      return h;
    });

    setHabits(updated);

    const target = updated.find(h => h.id === id);
    if (target && target.googleTaskId && syncState.taskListId) {
      const token = await getAccessToken();
      if (token) {
        updateGoogleTaskStatus(token, syncState.taskListId, target.googleTaskId, completed);
      }
    }
  };

  // Reset checkboxes for a fresh new day & persist archive to Sheets
  const handleResetDay = async () => {
    try {
      showToast('Memulai hari baru...', 'info');
      const resetHabits = habits.map(h => ({
        ...h,
        completed: false,
        completedAt: undefined,
      }));
      setHabits(resetHabits);

      const token = await getAccessToken();
      if (token && syncState.taskListId) {
        // Reset all corresponding Google Tasks to 'needsAction'
        await resetGoogleTasksForNewDay(token, syncState.taskListId, habits);

        // Archive into Google Sheets database
        if (syncState.spreadsheetId) {
          await syncHabitsToSpreadsheet(token, syncState.spreadsheetId, resetHabits);
          const history = await fetchDailyHistoryFromSpreadsheet(token, syncState.spreadsheetId);
          if (history && history.length > 0) {
            setHistoricalTrends(history);
          }
        }
      }
      showToast('Hari baru dimulai! Centang Google Tasks direset & riwayat tersimpan di Google Sheets.', 'success');
    } catch (e: any) {
      console.error('Reset day error:', e);
      showToast('Reset hari lokal berhasil.', 'info');
    }
  };

  const handleAddHabit = async (taskData: Omit<HabitTask, 'id' | 'createdAt'>) => {
    const newId = `habit-${Date.now()}`;
    const schedLabel =
      taskData.scheduleType === 'weekday'
        ? 'Senin-Jumat'
        : taskData.scheduleType === 'weekend'
        ? 'Sabtu-Minggu'
        : 'Setiap Hari';

    const newTask: HabitTask = {
      ...taskData,
      id: newId,
      createdAt: new Date().toISOString(),
    };

    // If connected, create in Google Tasks (Tugas Saya) & Google Calendar
    const token = await getAccessToken();
    if (token) {
      if (syncState.taskListId) {
        try {
          const created = await createGoogleTask(token, syncState.taskListId, {
            title: newTask.title,
            notes: `[Jadwal: ${schedLabel}] [Kategori: ${newTask.category}] [Waktu: ${newTask.time}] ${newTask.notes || ''}`,
          });
          newTask.googleTaskId = created.id;
          newTask.googleTaskListId = syncState.taskListId;
        } catch (e) {
          console.warn('Gagal sync ke Google Tasks:', e);
        }
      }

      // Automatically sync recurring event to Google Calendar
      try {
        const calEventId = await createCalendarEventForHabit(token, newTask);
        if (calEventId) {
          newTask.googleCalendarEventId = calEventId;
        }
      } catch (calErr) {
        console.warn('Gagal sync ke Google Calendar:', calErr);
      }
    }

    const nextHabits = [...habits, newTask];
    setHabits(nextHabits);
    showToast(`Kegiatan "${newTask.title}" berhasil ditambahkan & disinkronkan!`, 'success');

    // Asynchronously log to Google Sheets database
    if (token && syncState.spreadsheetId) {
      syncHabitsToSpreadsheet(token, syncState.spreadsheetId, nextHabits, calculateStats(nextHabits));
    }
  };

  const handleBatchAddHabits = async (tasks: Array<Omit<HabitTask, 'id' | 'createdAt'>>) => {
    const token = await getAccessToken();
    const newHabits: HabitTask[] = [];

    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      const newId = `habit-${Date.now()}-${i}`;
      const schedLabel =
        t.scheduleType === 'weekday'
          ? 'Senin-Jumat'
          : t.scheduleType === 'weekend'
          ? 'Sabtu-Minggu'
          : 'Setiap Hari';

      const newTask: HabitTask = {
        ...t,
        id: newId,
        createdAt: new Date().toISOString(),
      };

      if (token) {
        if (syncState.taskListId) {
          try {
            const created = await createGoogleTask(token, syncState.taskListId, {
              title: newTask.title,
              notes: `[Jadwal: ${schedLabel}] [Kategori: ${newTask.category}] [Waktu: ${newTask.time}] ${newTask.notes || ''}`,
            });
            newTask.googleTaskId = created.id;
            newTask.googleTaskListId = syncState.taskListId;
          } catch (e) {
            console.warn('Gagal sync task ke Google Tasks:', newTask.title, e);
          }
        }

        try {
          const calEventId = await createCalendarEventForHabit(token, newTask);
          if (calEventId) {
            newTask.googleCalendarEventId = calEventId;
          }
        } catch (calErr) {
          console.warn('Gagal sync task ke Google Calendar:', calErr);
        }
      }

      newHabits.push(newTask);
    }

    const merged = [...habits, ...newHabits];
    setHabits(merged);
    showToast(`${newHabits.length} kegiatan berhasil dijadwalkan & disinkronkan ke Google Tasks!`, 'success');

    if (token && syncState.spreadsheetId) {
      syncHabitsToSpreadsheet(token, syncState.spreadsheetId, merged, calculateStats(merged));
    }
  };

  const handleDeleteHabit = async (id: string) => {
    const target = habits.find(h => h.id === id);
    const updated = habits.filter(h => h.id !== id);
    setHabits(updated);

    if (target && target.googleTaskId && syncState.taskListId) {
      const token = await getAccessToken();
      if (token) {
        try {
          await deleteGoogleTask(token, syncState.taskListId, target.googleTaskId);
        } catch (e) {
          console.warn('Gagal hapus di Google Tasks:', e);
        }
      }
    }
    showToast('Kegiatan telah dihapus.', 'info');
  };

  const handleUpdateHabit = async (id: string, updates: Partial<HabitTask>) => {
    const updated = habits.map(h => {
      if (h.id === id) {
        return { ...h, ...updates };
      }
      return h;
    });
    setHabits(updated);

    const target = updated.find(h => h.id === id);
    if (target && target.googleTaskId && syncState.taskListId) {
      const token = await getAccessToken();
      if (token) {
        updateGoogleTaskDetails(token, syncState.taskListId, target.googleTaskId, {
          title: target.title,
          notes: target.notes,
        });
      }
    }
    showToast('Kegiatan berhasil diperbarui.', 'success');
  };

  const handleAddToCalendar = async (habit: HabitTask) => {
    const token = await getAccessToken();
    if (!token) {
      showToast('Hubungkan akun Google terlebih dahulu untuk menjadwalkan ke Google Calendar.', 'info');
      handleGoogleSignIn();
      return;
    }

    try {
      await addHabitToCalendar(token, habit);
      showToast(`Kegiatan "${habit.title}" berhasil dijadwalkan ke Google Calendar!`, 'success');
      const events = await fetchTodayCalendarEvents(token);
      setCalendarEvents(events);
    } catch (err: any) {
      console.error('Calendar schedule error:', err);
      showToast('Gagal menambahkan ke Google Calendar: ' + (err?.message || 'Error'), 'error');
    }
  };

  const handleRefreshCalendar = async () => {
    const token = await getAccessToken();
    if (!token) return;

    try {
      setIsLoadingCalendar(true);
      const events = await fetchTodayCalendarEvents(token);
      setCalendarEvents(events);
      showToast('Agenda Google Calendar diperbarui.', 'info');
    } catch (err) {
      console.error('Error refresh calendar:', err);
    } finally {
      setIsLoadingCalendar(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          id="global-toast-notification"
          className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold animate-fade-in transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-100 border-emerald-300 dark:border-emerald-800'
              : toastMessage.type === 'error'
              ? 'bg-red-50 dark:bg-red-950 text-red-900 dark:text-red-100 border-red-300 dark:border-red-800'
              : 'bg-indigo-50 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-100 border-indigo-300 dark:border-indigo-800'
          }`}
        >
          {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
          {toastMessage.type === 'error' && <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />}
          {toastMessage.type === 'info' && <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
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
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header */}
        <Header
          timeFilter={timeFilter}
          setTimeFilter={setTimeFilter}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          onOpenMobileMenu={() => setIsOpenMobile(true)}
          syncState={syncState}
          onSyncNow={handleManualSync}
          onOpenQuickAdd={() => setIsQuickAddOpen(true)}
          googleUser={googleUser}
          onConnectGoogle={handleGoogleSignIn}
        />

        {/* Tab Content Views */}
        <main className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fade-in" id="dashboard-main-view">
              {/* Architecture Info Pill */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/60 text-xs">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1.5 font-bold text-indigo-900 dark:text-indigo-200">
                    <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Input Centang: Google Tasks ({syncState.taskListName || 'Tugas Saya'})
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="flex items-center gap-1.5 font-bold text-indigo-900 dark:text-indigo-200">
                    <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    Database: Google Sheets ({syncState.spreadsheetId ? 'Tersambung' : 'Siap Sync'})
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Web App sebagai Output Tampilan & Visualisasi Grafik
                </span>
              </div>

              {/* 1. Top Metric Cards */}
              <MetricCards stats={stats} />

              {/* 2. Main Visual Area: 2/3 Main Chart + 1/3 Side Donut Widget */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <MainTrendChart
                    timeFilter={timeFilter}
                    isDarkMode={isDarkMode}
                    habits={habits}
                    historicalTrends={historicalTrends}
                    spreadsheetUrl={syncState.spreadsheetUrl}
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
                  onResetDay={handleResetDay}
                  onManualSync={handleManualSync}
                  taskListName={syncState.taskListName}
                  isSyncing={syncState.isSyncing}
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
                onSetHabitStatus={handleSetHabitStatus}
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
                onResetDay={handleResetDay}
                onManualSync={handleManualSync}
                taskListName={syncState.taskListName}
                isSyncing={syncState.isSyncing}
              />
            </div>
          )}

          {activeTab === 'analytics' && (
            <AnalyticsView
              habits={habits}
              stats={stats}
              historicalTrends={historicalTrends}
              spreadsheetUrl={syncState.spreadsheetUrl}
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
