import React from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  BarChart3,
  FileSpreadsheet,
  CalendarDays,
  Sparkles,
  RefreshCw,
  LogOut,
  ExternalLink,
  Flame,
  CheckCircle2,
  X,
} from 'lucide-react';
import { GoogleUser, GoogleSyncState } from '../types';

export interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
  googleUser: GoogleUser | null;
  syncState: GoogleSyncState;
  onConnectGoogle: () => void;
  onSyncNow: () => void;
  onLogout: () => void;
  streakCount: number;
  completionRate: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpenMobile,
  setIsOpenMobile,
  googleUser,
  syncState,
  onConnectGoogle,
  onSyncNow,
  onLogout,
  streakCount,
  completionRate,
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard Intel', icon: LayoutDashboard },
    { id: 'ai-chat', label: 'Gemini AI Assistant', icon: Sparkles, badge: 'AI Cerdas' },
    { id: 'habits', label: 'Habits & Tasks', icon: CheckSquare, badge: `${completionRate}%` },
    { id: 'analytics', label: 'Analytics & Trends', icon: BarChart3 },
    { id: 'schedule', label: 'Timeline & Calendar', icon: CalendarDays },
    { id: 'sheets', label: 'Google Sheets Sync', icon: FileSpreadsheet, isSync: true },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          id="sidebar-backdrop"
          onClick={() => setIsOpenMobile(false)}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="main-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header & Brand */}
        <div className="p-6">
          <div className="flex items-center justify-between pb-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                  I.R.I.S. <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">v2.5</span>
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Habit & Productivity Intel</p>
              </div>
            </div>
            <button
              id="close-mobile-sidebar-btn"
              onClick={() => setIsOpenMobile(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="mt-6 space-y-1.5" id="nav-menu-list">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-btn-${item.id}`}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsOpenMobile(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {item.isSync && (
                    <span className="flex h-2 w-2 relative">
                      <span
                        className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                          syncState.isConnected ? 'bg-emerald-400' : 'bg-amber-400'
                        }`}
                      />
                      <span
                        className={`relative inline-flex rounded-full h-2 w-2 ${
                          syncState.isConnected ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                      />
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick Streak Box */}
          <div className="mt-6 p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/20 dark:border-amber-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                  <Flame className="w-5 h-5 fill-amber-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {streakCount} Hari Berturut-turut
                  </p>
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                    Konsistensi Optimal 🔥
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Google Cloud & User Profile */}
        <div className="p-5 border-t border-slate-200/80 dark:border-slate-800 space-y-4">
          {/* Google Integration Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Google Workspace
                </span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium">
                {syncState.isConnected ? 'Terhubung' : 'Siap Sinkron'}
              </span>
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {syncState.isConnected ? (
                <span>Sheets & Tasks aktif tersinkronisasi otomatis.</span>
              ) : (
                <span>Hubungkan akun untuk sinkronisasi Google Sheets & Tasks.</span>
              )}
            </div>

            {syncState.isConnected ? (
              <div className="flex gap-2 pt-1">
                <button
                  id="sync-sidebar-action-btn"
                  onClick={onSyncNow}
                  disabled={syncState.isSyncing}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-600 dark:text-indigo-400 text-xs font-semibold transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncState.isSyncing ? 'animate-spin' : ''}`} />
                  <span>{syncState.isSyncing ? 'Syncing...' : 'Sync Data'}</span>
                </button>
                {syncState.spreadsheetUrl && (
                  <a
                    href={syncState.spreadsheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition"
                    title="Buka Spreadsheet"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            ) : (
              <button
                id="connect-google-sidebar-btn"
                onClick={onConnectGoogle}
                className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition shadow-sm"
              >
                <span>Hubungkan Google</span>
              </button>
            )}
          </div>

          {/* User Profile */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5 overflow-hidden">
              {googleUser?.photoURL ? (
                <img
                  src={googleUser.photoURL}
                  alt={googleUser.displayName || 'User'}
                  className="w-8 h-8 rounded-full border border-indigo-200 dark:border-indigo-900 object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center justify-center">
                  {googleUser?.displayName ? googleUser.displayName.charAt(0).toUpperCase() : 'R'}
                </div>
              )}
              <div className="truncate">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  {googleUser?.displayName || 'Rizky Kurniawan'}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {googleUser?.email || 'rizkykurniawan241105@gmail.com'}
                </p>
              </div>
            </div>

            {googleUser ? (
              <button
                id="logout-btn"
                onClick={onLogout}
                title="Keluar / Logout"
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <span title="Status Online" className="p-1 text-emerald-500">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
