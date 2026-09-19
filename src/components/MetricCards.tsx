import React from 'react';
import {
  CheckCircle2,
  TrendingUp,
  Flame,
  Award,
  Clock,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { UserStats } from '../types';

export interface MetricCardsProps {
  stats: UserStats;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ stats }) => {
  return (
    <div
      id="top-metric-summary-grid"
      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5"
    >
      {/* Card 1: Tasks Completed */}
      <div
        id="card-tasks-completed"
        className="group relative p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Tasks Completed
          </span>
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {stats.tasksCompleted}
          </span>
          <span className="text-sm font-semibold text-slate-400 dark:text-slate-500">
            / {stats.totalTasks} Selesai
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500"
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Progress Hari Ini</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              {stats.tasksCompleted} dari {stats.totalTasks} habit
            </span>
          </div>
        </div>
      </div>

      {/* Card 2: Completion Rate */}
      <div
        id="card-completion-rate"
        className="group relative p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Daily Success Rate
          </span>
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {stats.completionRate}%
          </span>
          <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
            <ArrowUpRight className="w-3 h-3" /> +12%
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-500" /> Kategori Efisiensi
          </span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">
            {stats.completionRate >= 80 ? 'Target Optimal' : 'Meningkat'}
          </span>
        </div>
      </div>

      {/* Card 3: Habit Streak */}
      <div
        id="card-habit-streak"
        className="group relative p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Current Habit Streak
          </span>
          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
            <Flame className="w-5 h-5 fill-amber-500" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-amber-500 dark:text-amber-400 tracking-tight flex items-center gap-1.5">
            🔥 {stats.habitStreak}
          </span>
          <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Hari Aktif
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400">
          <span>Rekor Terbaik: 14 Hari</span>
          <span className="font-bold text-amber-600 dark:text-amber-400">
            Level Master ⭐
          </span>
        </div>
      </div>

      {/* Card 4: Productivity Score & Hours */}
      <div
        id="card-productivity-score"
        className="group relative p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Productivity Score
          </span>
          <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {stats.productivityScore}
          </span>
          <span className="text-sm font-semibold text-slate-400 dark:text-slate-500">
            / 10 Score
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-purple-500" /> Total Waktu
          </span>
          <span className="font-bold text-purple-600 dark:text-purple-400">
            {stats.timeInvestedHours} Jam Terinvestasi
          </span>
        </div>
      </div>
    </div>
  );
};
