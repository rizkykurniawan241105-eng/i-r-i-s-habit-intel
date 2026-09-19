import React, { useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { TrendingUp, Sparkles, Activity } from 'lucide-react';
import { TimeFilter, HabitTask } from '../types';
import { INITIAL_WEEK_TREND, INITIAL_MONTH_TREND } from '../data/dummyData';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export interface MainTrendChartProps {
  timeFilter: TimeFilter;
  isDarkMode: boolean;
  habits: HabitTask[];
}

export const MainTrendChart: React.FC<MainTrendChartProps> = ({
  timeFilter,
  isDarkMode,
  habits = [],
}) => {
  const chartRef = useRef<any>(null);
  const safeHabits = Array.isArray(habits) ? habits : [];

  const completedTodayCount = safeHabits.filter(h => h && h.completed).length;
  const totalTodayCount = safeHabits.length;

  let labels: string[] = [];
  let dataPoints: number[] = [];
  let secondaryDataPoints: number[] = [];

  if (timeFilter === 'today') {
    labels = ['05:00', '08:00', '12:00', '15:00', '18:00', '21:00', '23:00'];
    const p1 = safeHabits.filter(h => h && h.completed && (h.time || '') <= '05:30').length;
    const p2 = safeHabits.filter(h => h && h.completed && (h.time || '') <= '08:30').length;
    const p3 = safeHabits.filter(h => h && h.completed && (h.time || '') <= '12:30').length;
    const p4 = safeHabits.filter(h => h && h.completed && (h.time || '') <= '15:45').length;
    const p5 = safeHabits.filter(h => h && h.completed && (h.time || '') <= '18:30').length;
    const p6 = completedTodayCount;
    const p7 = completedTodayCount;

    dataPoints = [
      Math.round((p1 / (totalTodayCount || 1)) * 100),
      Math.round((p2 / (totalTodayCount || 1)) * 100),
      Math.round((p3 / (totalTodayCount || 1)) * 100),
      Math.round((p4 / (totalTodayCount || 1)) * 100),
      Math.round((p5 / (totalTodayCount || 1)) * 100),
      Math.round((p6 / (totalTodayCount || 1)) * 100),
      Math.round((p7 / (totalTodayCount || 1)) * 100),
    ];
    secondaryDataPoints = [20, 40, 60, 75, 85, 95, 100];
  } else if (timeFilter === 'week') {
    labels = INITIAL_WEEK_TREND.map(d => d.date);
    dataPoints = INITIAL_WEEK_TREND.map((d, idx) => {
      if (idx === INITIAL_WEEK_TREND.length - 1) {
        return totalTodayCount > 0 ? Math.round((completedTodayCount / totalTodayCount) * 100) : 90;
      }
      return d.percentage;
    });
    secondaryDataPoints = [75, 80, 85, 80, 85, 80, 85];
  } else {
    labels = INITIAL_MONTH_TREND.map(d => d.date);
    dataPoints = INITIAL_MONTH_TREND.map(d => d.percentage);
    secondaryDataPoints = [80, 85, 85, 90];
  }

  const textColor = isDarkMode ? '#94a3b8' : '#64748b';
  const gridColor = isDarkMode ? 'rgba(51, 65, 85, 0.4)' : 'rgba(226, 232, 240, 0.8)';

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Tingkat Keberhasilan (%)',
        data: dataPoints,
        borderColor: '#6366F1',
        borderWidth: 3,
        pointBackgroundColor: '#6366F1',
        pointBorderColor: isDarkMode ? '#0F172A' : '#FFFFFF',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 7,
        pointHoverBackgroundColor: '#4F46E5',
        pointHoverBorderColor: '#FFFFFF',
        pointHoverBorderWidth: 3,
        tension: 0.4,
        fill: true,
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 320);
          gradient.addColorStop(0, 'rgba(99, 102, 241, 0.42)');
          gradient.addColorStop(0.65, 'rgba(99, 102, 241, 0.08)');
          gradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)');
          return gradient;
        },
      },
      {
        label: 'Target Baseline (80%)',
        data: secondaryDataPoints,
        borderColor: isDarkMode ? 'rgba(148, 163, 184, 0.35)' : 'rgba(148, 163, 184, 0.5)',
        borderWidth: 1.5,
        borderDash: [5, 5],
        pointRadius: 0,
        pointHoverRadius: 0,
        fill: false,
        tension: 0.3,
      },
    ],
  };

  const chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        align: 'end',
        labels: {
          color: textColor,
          font: {
            family: "'Plus Jakarta Sans', sans-serif",
            size: 11,
            weight: '600',
          },
          usePointStyle: true,
          boxWidth: 8,
          boxHeight: 8,
        },
      },
      tooltip: {
        backgroundColor: isDarkMode ? '#1e293b' : '#0f172a',
        titleColor: '#ffffff',
        bodyColor: '#e2e8f0',
        borderColor: isDarkMode ? '#334155' : '#334155',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
        cornerRadius: 10,
        titleFont: {
          family: "'Plus Jakarta Sans', sans-serif",
          weight: 'bold',
          size: 13,
        },
        bodyFont: {
          family: "'Plus Jakarta Sans', sans-serif",
          size: 12,
        },
        callbacks: {
          label: (context: any) => {
            return ` ${context.dataset.label}: ${context.parsed.y}%`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: gridColor,
          drawBorder: false,
        },
        ticks: {
          color: textColor,
          font: {
            family: "'Plus Jakarta Sans', sans-serif",
            size: 11,
            weight: '500',
          },
        },
      },
      y: {
        min: 0,
        max: 100,
        grid: {
          color: gridColor,
          drawBorder: false,
        },
        ticks: {
          color: textColor,
          stepSize: 20,
          callback: (value: number) => `${value}%`,
          font: {
            family: "'Plus Jakarta Sans', sans-serif",
            size: 11,
            weight: '500',
          },
        },
      },
    },
  };

  return (
    <div
      id="main-trend-chart-card"
      className="p-5 md:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between"
    >
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base md:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Grafik Tren Penyelesaian Tugas & Habit
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Visualisasi konsistensi harian dengan kurva presisi dan interpolasi gradient
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-200/60 dark:border-indigo-800/60">
            <Activity className="w-3.5 h-3.5" />
            {timeFilter === 'today' ? 'Live Track' : timeFilter === 'week' ? '7 Hari Terakhir' : 'Bulan Berjalan'}
          </span>
        </div>
      </div>

      {/* Chart Canvas Container */}
      <div className="relative w-full h-72 sm:h-80 md:h-84 mt-4">
        <Line ref={chartRef} data={chartData} options={chartOptions} />
      </div>

      {/* Sub-bar Intel Insights */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Fokus Puncak: <strong>Pagi & Sore Hari (07.30 - 18.00)</strong></span>
        </div>
        <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
          Sinkron dengan Google Sheets Log
        </div>
      </div>
    </div>
  );
};
