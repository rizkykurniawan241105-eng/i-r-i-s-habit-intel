import React from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { PieChart, Layers } from 'lucide-react';
import { HabitTask, CategoryType } from '../types';
import { CATEGORY_COLORS } from '../data/dummyData';

ChartJS.register(ArcElement, Tooltip, Legend);

interface CategoryDonutChartProps {
  habits: HabitTask[];
  isDarkMode: boolean;
}

export const CategoryDonutChart: React.FC<CategoryDonutChartProps> = ({
  habits = [],
  isDarkMode,
}) => {
  const safeHabits = Array.isArray(habits) ? habits : [];
  const categories: CategoryType[] = [
    'Ibadah',
    'Sekolah/Belajar',
    'Rutin Harian',
    'Rehat/OSIS',
    'Olahraga & Kesehatan',
  ];

  const categoryCounts = categories.map((cat) => {
    const total = safeHabits.filter((h) => h && h.category === cat).length;
    const completed = safeHabits.filter((h) => h && h.category === cat && h.completed).length;
    return {
      category: cat,
      total,
      completed,
      color: CATEGORY_COLORS[cat]?.main || '#6366F1',
    };
  });

  const chartData = {
    labels: categories,
    datasets: [
      {
        data: categoryCounts.map((c) => c.total),
        backgroundColor: [
          '#10B981', // Emerald - Ibadah
          '#6366F1', // Indigo - Belajar
          '#0EA5E9', // Sky - Rutin
          '#F59E0B', // Amber - OSIS/Rehat
          '#EC4899', // Pink - Olahraga
        ],
        borderColor: isDarkMode ? '#0f172a' : '#ffffff',
        borderWidth: 3,
        hoverOffset: 6,
      },
    ],
  };

  const chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: isDarkMode ? '#1e293b' : '#0f172a',
        titleColor: '#ffffff',
        bodyColor: '#e2e8f0',
        borderColor: isDarkMode ? '#334155' : '#334155',
        borderWidth: 1,
        padding: 10,
        boxPadding: 4,
        cornerRadius: 8,
        titleFont: {
          family: "'Plus Jakarta Sans', sans-serif",
          weight: 'bold',
        },
        callbacks: {
          label: (context: any) => {
            const cat = categoryCounts[context.dataIndex];
            return ` ${cat.category}: ${cat.completed}/${cat.total} Habit Selesai`;
          },
        },
      },
    },
  };

  const totalCompleted = safeHabits.filter((h) => h && h.completed).length;
  const overallPct = safeHabits.length > 0 ? Math.round((totalCompleted / safeHabits.length) * 100) : 0;

  return (
    <div
      id="category-donut-chart-card"
      className="p-5 md:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <PieChart className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
            Distribusi Kategori
          </h3>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          {safeHabits.length} Total Habit
        </span>
      </div>

      {/* Donut Chart with Center Indicator */}
      <div className="relative w-full h-52 sm:h-56 my-2 flex items-center justify-center">
        <Doughnut data={chartData} options={chartOptions} />
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {overallPct}%
          </span>
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Completed
          </span>
        </div>
      </div>

      {/* Category Breakdown List */}
      <div className="space-y-2 mt-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
        {categoryCounts.map((item) => (
          <div
            key={item.category}
            className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
          >
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {item.category}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 dark:text-slate-500">
                {item.completed}/{item.total}
              </span>
              <span className="font-bold text-slate-700 dark:text-slate-200">
                {item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
