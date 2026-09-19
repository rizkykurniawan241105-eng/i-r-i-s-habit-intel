import { HabitTask, DayTrendData, UserStats } from '../types';

export const INITIAL_HABITS: HabitTask[] = [
  {
    id: 'habit-1',
    title: 'Sholat Subuh Berjamaah & Dzikir Pagi',
    category: 'Ibadah',
    time: '04:50',
    completed: true,
    priority: 'high',
    notes: 'Konsisten bangun pagi dan membaca dzikir pagi Al-Ma’tsurat.',
    createdAt: new Date().toISOString(),
    completedAt: '05:15',
    durationMinutes: 30,
  },
  {
    id: 'habit-2',
    title: 'Persiapan Diri & Sarapan Sehat',
    category: 'Rutin Harian',
    time: '06:15',
    completed: true,
    priority: 'medium',
    notes: 'Mandi pagi, sarapan bernutrisi tinggi, dan cek jadwal hari ini.',
    createdAt: new Date().toISOString(),
    completedAt: '06:45',
    durationMinutes: 40,
  },
  {
    id: 'habit-3',
    title: 'Fokus Belajar / Kelas Sesi Pagi',
    category: 'Sekolah/Belajar',
    time: '07:30',
    completed: true,
    priority: 'high',
    notes: 'Catat materi esensial dan aktif dalam diskusi pemecahan masalah.',
    createdAt: new Date().toISOString(),
    completedAt: '11:45',
    durationMinutes: 180,
  },
  {
    id: 'habit-4',
    title: 'Sholat Dzuhur & Power Nap 20 Menit',
    category: 'Ibadah',
    time: '12:15',
    completed: true,
    priority: 'high',
    notes: 'Istirahat sejenak untuk me-recharge fokus otak siang hari.',
    createdAt: new Date().toISOString(),
    completedAt: '12:50',
    durationMinutes: 45,
  },
  {
    id: 'habit-5',
    title: 'Penyelesaian Tugas Akademik & Praktikum',
    category: 'Sekolah/Belajar',
    time: '13:30',
    completed: true,
    priority: 'high',
    notes: 'Selesaikan modul tugas sebelum tenggat waktu.',
    createdAt: new Date().toISOString(),
    completedAt: '15:15',
    durationMinutes: 90,
  },
  {
    id: 'habit-6',
    title: 'Koordinasi Program Kerja OSIS & Tim',
    category: 'Rehat/OSIS',
    time: '15:45',
    completed: true,
    priority: 'medium',
    notes: 'Evaluasi mingguan agenda divisi dan penyusunan timeline event.',
    createdAt: new Date().toISOString(),
    completedAt: '16:45',
    durationMinutes: 60,
  },
  {
    id: 'habit-7',
    title: 'Olahraga Sore & Workout / Jogging',
    category: 'Olahraga & Kesehatan',
    time: '17:00',
    completed: true,
    priority: 'medium',
    notes: 'Lari 3 KM dan stretching untuk menjaga kebugaran fisik.',
    createdAt: new Date().toISOString(),
    completedAt: '17:40',
    durationMinutes: 40,
  },
  {
    id: 'habit-8',
    title: 'Sholat Maghrib & Tadarus Al-Qur\'an',
    category: 'Ibadah',
    time: '18:15',
    completed: true,
    priority: 'high',
    notes: 'Target 1 juz per hari atau minimal tilawah rutin 20 menit.',
    createdAt: new Date().toISOString(),
    completedAt: '18:50',
    durationMinutes: 35,
  },
  {
    id: 'habit-9',
    title: 'Deep Work: Project Coding & Skill Upgrade',
    category: 'Sekolah/Belajar',
    time: '19:30',
    completed: true,
    priority: 'high',
    notes: 'Eksplorasi arsitektur frontend web, cloud APIs, dan problem solving.',
    createdAt: new Date().toISOString(),
    completedAt: '21:00',
    durationMinutes: 90,
  },
  {
    id: 'habit-10',
    title: 'Review Capaian Harian & Daily Journaling',
    category: 'Rehat/OSIS',
    time: '21:30',
    completed: false,
    priority: 'low',
    notes: 'Catat 3 hal yang disyukuri dan susun to-do list untuk esok hari.',
    createdAt: new Date().toISOString(),
    durationMinutes: 20,
  }
];

export const INITIAL_WEEK_TREND: DayTrendData[] = [
  { date: 'Senin', dayName: 'Sen', completed: 8, total: 10, percentage: 80, hours: 6.2 },
  { date: 'Selasa', dayName: 'Sel', completed: 9, total: 10, percentage: 90, hours: 7.0 },
  { date: 'Rabu', dayName: 'Rab', completed: 10, total: 10, percentage: 100, hours: 7.8 },
  { date: 'Kamis', dayName: 'Kam', completed: 8, total: 10, percentage: 80, hours: 6.5 },
  { date: 'Jumat', dayName: 'Jum', completed: 9, total: 10, percentage: 90, hours: 7.2 },
  { date: 'Sabtu', dayName: 'Sab', completed: 7, total: 10, percentage: 70, hours: 5.5 },
  { date: 'Minggu (Hari Ini)', dayName: 'Min', completed: 9, total: 10, percentage: 90, hours: 6.8 },
];

export const INITIAL_MONTH_TREND: DayTrendData[] = [
  { date: 'Minggu 1', dayName: 'M1', completed: 62, total: 70, percentage: 88, hours: 45 },
  { date: 'Minggu 2', dayName: 'M2', completed: 65, total: 70, percentage: 92, hours: 48 },
  { date: 'Minggu 3', dayName: 'M3', completed: 60, total: 70, percentage: 85, hours: 43 },
  { date: 'Minggu 4', dayName: 'M4', completed: 64, total: 70, percentage: 91, hours: 47 },
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
  const completionRate = totalTasks > 0 ? Math.round((tasksCompleted / totalTasks) * 100) : 0;
  
  // Compute total duration hours
  const totalMinutes = safeHabits
    .filter(h => h && h.completed)
    .reduce((acc, curr) => acc + (curr?.durationMinutes || 30), 0);
  const timeInvestedHours = parseFloat((totalMinutes / 60).toFixed(1));

  // Productivity score out of 10
  const productivityScore = parseFloat(((completionRate / 100) * 8.5 + (tasksCompleted > 5 ? 1.0 : 0.5)).toFixed(1));

  return {
    tasksCompleted,
    totalTasks,
    completionRate,
    habitStreak: 7, // Default consecutive streak
    productivityScore: Math.min(10, productivityScore),
    timeInvestedHours: timeInvestedHours > 0 ? timeInvestedHours : 6.8,
  };
};
