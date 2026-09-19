import React, { useState, useEffect } from 'react';
import {
  Menu,
  Sun,
  Moon,
  Plus,
  RefreshCw,
  Sparkles,
  Calendar,
  CloudCheck,
  CheckCircle,
} from 'lucide-react';
import { TimeFilter, GoogleUser, GoogleSyncState } from '../types';

interface HeaderProps {
  onOpenMobileMenu: () => void;
  timeFilter: TimeFilter;
  setTimeFilter: (filter: TimeFilter) => void;
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
  googleUser: GoogleUser | null;
  syncState: GoogleSyncState;
  onConnectGoogle: () => void;
  onSyncNow: () => void;
  onOpenQuickAdd: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileMenu,
  timeFilter,
  setTimeFilter,
  isDarkMode,
  setIsDarkMode,
  googleUser,
  syncState,
  onConnectGoogle,
  onSyncNow,
  onOpenQuickAdd,
}) => {
  const [currentDateString, setCurrentDateString] = useState('');
  const [currentTimeString, setCurrentTimeString] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentDateString(
        now.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      );
      setCurrentTimeString(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const userName = googleUser?.displayName?.split(' ')[0] || 'Rizky';

  return (
    <header className="sticky top-0 z-30 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        
        {/* Left: Mobile Toggle & Greetings */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              id="mobile-menu-toggle-btn"
              onClick={onOpenMobileMenu}
              className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Buka Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Good Day, {userName}! 👋
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
                  <Sparkles className="w-3 h-3" /> Intel Mode Active
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                <span>{currentDateString}</span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{currentTimeString} WIB</span>
              </div>
            </div>
          </div>

          {/* Quick mobile add button */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              id="mobile-quick-add-btn"
              onClick={onOpenQuickAdd}
              className="p-2 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20 active:scale-95 transition"
              title="Tambah Kegiatan"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Right: Filter Switcher & Action Controls */}
        <div className="flex flex-wrap items-center justify-between md:justify-end gap-2.5">
          
          {/* Time Filter Tabs */}
          <div
            id="time-filter-controls"
            className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60"
          >
            <button
              id="filter-today-btn"
              onClick={() => setTimeFilter('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                timeFilter === 'today'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Hari Ini
            </button>
            <button
              id="filter-week-btn"
              onClick={() => setTimeFilter('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                timeFilter === 'week'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              7 Hari
            </button>
            <button
              id="filter-month-btn"
              onClick={() => setTimeFilter('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                timeFilter === 'month'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Bulan Ini
            </button>
          </div>

          {/* Sync / Connect Google Button */}
          {syncState.isConnected ? (
            <button
              id="header-sync-btn"
              onClick={onSyncNow}
              disabled={syncState.isSyncing}
              title={syncState.lastSyncedAt ? `Terakhir sinkron: ${syncState.lastSyncedAt}` : 'Sinkronkan data'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-xs font-bold transition shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncState.isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{syncState.isSyncing ? 'Syncing...' : 'Sheets Synced'}</span>
              <span className="sm:hidden">Sync</span>
            </button>
          ) : (
            <button
              id="header-google-signin-btn"
              onClick={onConnectGoogle}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/70 text-xs font-bold transition shadow-sm"
              title="Hubungkan Google Sheets & Tasks"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span className="hidden sm:inline">Hubungkan Google</span>
              <span className="sm:hidden">Google</span>
            </button>
          )}

          {/* Quick Add Button Desktop */}
          <button
            id="desktop-quick-add-btn"
            onClick={onOpenQuickAdd}
            className="hidden md:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-md shadow-indigo-600/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Habit</span>
          </button>

          {/* Dark / Light Toggle */}
          <button
            id="theme-toggle-btn"
            onClick={() => setIsDarkMode(!isDarkMode)}
            aria-label="Ubah Tema"
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600 hover:-rotate-12 transition-transform" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
