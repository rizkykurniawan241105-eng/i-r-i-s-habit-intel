import React from 'react';
import {
  BarChart3,
  Award,
  Zap,
  TrendingUp,
  Clock,
  Sparkles,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { HabitTask, UserStats } from '../types';
import { INITIAL_WEEK_TREND } from '../data/dummyData';

interface AnalyticsViewProps {
  habits: HabitTask[];
  stats: UserStats;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ habits = [], stats }) => {
  const daysOfWeek = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

  return (
    <div className="space-y-6 animate-fade-in" id="analytics-overview-view">
      {/* Analytics Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              Analisis Produktivitas & Konsistensi Habit
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Laporan komprehensif efisiensi waktu, habit retention, dan tren konsistensi
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-bold border border-indigo-200/60 dark:border-indigo-800/60">
            <Sparkles className="w-4 h-4" /> Intel Score: {stats.productivityScore}/10
          </span>
        </div>
      </div>

      {/* Heatmap & Weekly Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Heatmap Card */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Matriks Konsistensi Mingguan
            </h3>
            <span className="text-xs text-slate-400">7 Hari Terakhir</span>
          </div>

          <div className="grid grid-cols-7 gap-2.5 pt-2">
            {INITIAL_WEEK_TREND.map((day, idx) => (
              <div
                key={day.date}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60 flex flex-col items-center justify-between gap-2 text-center group hover:border-indigo-500 transition"
              >
                <span className="text-[11px] font-bold text-slate-400 uppercase">
                  {day.dayName}
                </span>
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-extrabold shadow-xs ${
                    day.percentage >= 90
                      ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                      : day.percentage >= 80
                      ? 'bg-indigo-600 text-white shadow-indigo-600/30'
                      : 'bg-amber-500 text-white shadow-amber-500/30'
                  }`}
                >
                  {day.percentage}%
                </div>
                <span className="text-[10px] text-slate-500 font-medium">
                  {day.hours} Jam
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Rata-rata Penyelesaian: <strong>85.7%</strong></span>
            <span>Total Jam Produktif: <strong>48.5 Jam</strong></span>
          </div>
        </div>

        {/* Highlight Insights */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-purple-500" />
            Pencapaian & Milestone
          </h3>

          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 flex items-start gap-3">
              <Flame className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5 fill-amber-500" />
              <div>
                <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  Konsistensi 7 Hari Sempurna
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                  Anda telah mempertahankan streak berturut-turut tanpa jeda.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  Ibadah & Belajar Tertinggi
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                  Kategori Ibadah & Belajar mencapai 100% completion rate.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
