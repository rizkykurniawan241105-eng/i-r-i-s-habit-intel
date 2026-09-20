import React, { useState } from 'react';
import {
  CalendarDays,
  Clock,
  Plus,
  CheckCircle2,
  Calendar,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { HabitTask, CalendarEventItem } from '../types';
import { CATEGORY_COLORS } from '../data/dummyData';

interface CalendarScheduleWidgetProps {
  habits: HabitTask[];
  calendarEvents: CalendarEventItem[];
  onRefreshEvents: () => void;
  isLoadingEvents: boolean;
  onOpenQuickAdd: () => void;
}

export const CalendarScheduleWidget: React.FC<CalendarScheduleWidgetProps> = ({
  habits = [],
  calendarEvents = [],
  onRefreshEvents,
  isLoadingEvents,
  onOpenQuickAdd,
}) => {
  const safeHabits = Array.isArray(habits) ? habits : [];
  // Sort habits by execution time
  const sortedHabits = [...safeHabits].sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  return (
    <div className="space-y-6 animate-fade-in" id="timeline-calendar-view">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              Timeline Harian & Google Calendar
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Urutan waktu eksekusi habit harian dan integrasi jadwal Google Calendar
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefreshEvents}
            disabled={isLoadingEvents}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingEvents ? 'animate-spin' : ''}`} />
            <span>Refresh Jadwal</span>
          </button>
          <button
            onClick={onOpenQuickAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-md shadow-indigo-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Jadwal</span>
          </button>
        </div>
      </div>

      {/* Grid: Habit Timeline vs Google Calendar Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Timeline */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              Alur Waktu Habit Harian
            </h3>
            <span className="text-xs text-slate-400">
              {safeHabits.filter(h => h && h.completed).length} dari {safeHabits.length} terlaksana
            </span>
          </div>

          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            {sortedHabits.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Belum ada timeline habit. Tambahkan kegiatan baru untuk memvisualisasikan alur waktu.
              </div>
            ) : (
              sortedHabits.map((habit) => {
                const categoryColor = CATEGORY_COLORS[habit.category] || CATEGORY_COLORS['Sekolah/Belajar'];
                return (
                  <div key={habit.id} className="relative group">
                    {/* Dot */}
                    <span
                      className={`absolute -left-[19px] top-2 w-3.5 h-3.5 rounded-full border-2 transition-all ${
                        habit.completed
                          ? 'bg-emerald-500 border-white dark:border-slate-900 ring-2 ring-emerald-500/30'
                          : 'bg-white dark:bg-slate-800 border-indigo-500 ring-2 ring-indigo-500/20'
                      }`}
                    />

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 hover:border-indigo-300 dark:hover:border-indigo-700 transition">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          {habit.title}
                        </span>
                        <span className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400">
                          {habit.time} WIB
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${categoryColor.bgBadge}`}>
                          {habit.category}
                        </span>
                        {habit.scheduleType === 'weekday' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                            Senin - Jumat
                          </span>
                        ) : habit.scheduleType === 'weekend' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60">
                            Sabtu - Minggu
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            Setiap Hari
                          </span>
                        )}
                        {habit.notes && (
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs">
                            {habit.notes}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right 1 Col: Google Calendar Events */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-500" />
              Agenda Google Calendar
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 font-bold">
              Today
            </span>
          </div>

          {calendarEvents.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <CalendarDays className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Tidak ada agenda di Google Calendar hari ini.
              </p>
              <p className="text-[11px] text-slate-400">
                Hubungkan Google Workspace untuk menampilkan time-blocking kalender Anda.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {calendarEvents.map((evt) => {
                const startTime = evt.start.dateTime
                  ? new Date(evt.start.dateTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                  : 'Sepanjang Hari';

                return (
                  <div
                    key={evt.id}
                    className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60"
                  >
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      {evt.summary}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                      <Clock className="w-3 h-3" />
                      <span>{startTime}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
