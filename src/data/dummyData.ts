import { HabitTask, DayTrendData, UserStats } from '../types';

// Data awal bersih (kosong/nol) sesuai instruksi pengguna:
// Tidak ada data demo. Jika belum ada input, statistik & grafik bernilai 0.
export const INITIAL_HABITS: HabitTask[] = [];

export const INITIAL_WEEK_TREND: DayTrendData[] = [
  { date: 'Senin', dayName: 'Sen', completed: 0, total: 0, percentage: 0, hours: 0 },
  { date: 'Selasa', dayName: 'Sel', completed: 0, total: 0, percentage: 0, hours: 0 },
  { date: 'Rabu', dayName: 'Rab', completed: 0, total: 0, percentage: 0, hours: 0 },
  { date: 'Kamis', dayName: 'Kam', completed: 0, total: 0, percentage: 0, hours: 0 },
  { date: 'Jumat', dayName: 'Jum', completed: 0, total: 0, percentage: 0, hours: 0 },
  { date: 'Sabtu', dayName: 'Sab', completed: 0, total: 0, percentage: 0, hours: 0 },
  { date: 'Minggu', dayName: 'Min', completed: 0, total: 0, percentage: 0, hours: 0 },
];

export const INITIAL_MONTH_TREND: DayTrendData[] = [
  { date: 'Minggu 1', dayName: 'M1', completed: 0, total: 0, percentage: 0, hours: 0 },
  { date: 'Minggu 2', dayName: 'M2', completed: 0, total: 0, percentage: 0, hours: 0 },
  { date: 'Minggu 3', dayName: 'M3', completed: 0, total: 0, percentage: 0, hours: 0 },
  { date: 'Minggu 4', dayName: 'M4', completed: 0, total: 0, percentage: 0, hours: 0 },
];

export const CATEGORY_COLORS: Record<string, { main: string; light: string; border: string; text: string; bgBadge: string }> = {
  'Ibadah': {
    main: '#10B981',
    light: '#ECFDF5',
    border: '#A7F3D0',
    text: '#065F46',
    bgBadge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  'Sekolah/Belajar': {
    main: '#6366F1',
    light: '#EEF2FF',
    border: '#C7D2FE',
    text: '#3730A3',
    bgBadge: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  },
  'Rutin Harian': {
    main: '#0EA5E9',
    light: '#F0F9FF',
    border: '#BAE6FD',
    text: '#0369A1',
    bgBadge: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
  },
  'Rehat/OSIS': {
    main: '#F59E0B',
    light: '#FFFBEB',
    border: '#FDE68A',
    text: '#92400E',
    bgBadge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  'Olahraga & Kesehatan': {
    main: '#EC4899',
    light: '#FDF2F8',
    border: '#FBCFE8',
    text: '#9D174D',
    bgBadge: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
  },
};

export const calculateStats = (habits: HabitTask[] = []): UserStats => {
  const safeHabits = Array.isArray(habits) ? habits : [];
  const totalTasks = safeHabits.length;
  const tasksCompleted = safeHabits.filter(h => h && h.completed).length;

  if (totalTasks === 0) {
    return {
      tasksCompleted: 0,
      totalTasks: 0,
      completionRate: 0,
      habitStreak: 0,
      productivityScore: 0,
      timeInvestedHours: 0,
    };
  }

  const completionRate = Math.round((tasksCompleted / totalTasks) * 100);

  // Hitung total durasi dalam jam
  const totalMinutes = safeHabits
    .filter(h => h && h.completed)
    .reduce((acc, curr) => acc + (curr?.durationMinutes || 30), 0);
  const timeInvestedHours = parseFloat((totalMinutes / 60).toFixed(1));

  // Productivity score out of 10
  const productivityScore = parseFloat(((completionRate / 100) * 10).toFixed(1));

  return {
    tasksCompleted,
    totalTasks,
    completionRate,
    habitStreak: tasksCompleted > 0 ? 1 : 0,
    productivityScore: Math.min(10, productivityScore),
    timeInvestedHours,
  };
};
