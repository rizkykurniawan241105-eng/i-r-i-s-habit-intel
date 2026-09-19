import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  CheckCheck,
  Search,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  CalendarPlus,
  Sparkles,
} from 'lucide-react';
import { HabitTask } from '../types';
import { CATEGORY_COLORS } from '../data/dummyData';

export interface TaskChecklistProps {
  habits: HabitTask[];
  onToggleHabit: (id: string) => void;
  onDeleteHabit: (id: string) => void;
  onOpenQuickAdd: () => void;
  onAddToCalendar?: (habit: HabitTask) => void;
  onOpenAiAssistant?: () => void;
}

export const TaskChecklist: React.FC<TaskChecklistProps> = ({
  habits = [],
  onToggleHabit,
  onDeleteHabit,
  onOpenQuickAdd,
  onAddToCalendar,
  onOpenAiAssistant,
}) => {
  const safeHabits = Array.isArray(habits) ? habits : [];
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const categories = ['all', 'Ibadah', 'Sekolah/Belajar', 'Rutin Harian', 'Rehat/OSIS', 'Olahraga & Kesehatan'];

  const handleToggle = (habit: HabitTask) => {
    if (!habit.completed) {
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#6366F1', '#10B981', '#F59E0B', '#EC4899'],
        });
      } catch (e) {
        // ignore
      }
    }
    onToggleHabit(habit.id);
  };

  const filteredHabits = safeHabits.filter((habit) => {
    if (!habit) return false;
    const matchesCategory = selectedCategory === 'all' || habit.category === selectedCategory;
    const matchesSearch =
      (habit.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (habit.notes && habit.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const completedCount = safeHabits.filter((h) => h && h.completed).length;

  return (
    <div
      id="interactive-task-checklist-container"
      className="p-5 md:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between"
    >
      {/* Header & Controls */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <CheckCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-base md:text-lg font-extrabold text-slate-900 dark:text-white">
                Daftar Kegiatan & Checklist Harian
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tersinkron dengan arsitektur Google Tasks & Spreadsheet
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {completedCount} / {safeHabits.length} Selesai
            </span>
            {onOpenAiAssistant && (
              <button
                id="tasklist-open-gemini-ai-btn"
                onClick={onOpenAiAssistant}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold transition shadow-sm active:scale-95"
                title="Kelola dengan Gemini AI"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tanya Gemini AI</span>
                <span className="sm:hidden">AI</span>
              </button>
            )}
            <button
              id="add-task-header-btn"
              onClick={onOpenQuickAdd}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah</span>
            </button>
          </div>
        </div>

        {/* Search & Category Filter Pills */}
        <div className="mt-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="habit-search-input"
              type="text"
              placeholder="Cari kegiatan atau catatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                id={`filter-pill-${cat.replace(/[^a-zA-Z0-9]/g, '-')}`}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat === 'all' ? 'Semua Kategori' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Task List Items */}
        <div className="mt-4 space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
          {filteredHabits.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Tidak ada kegiatan yang cocok dengan filter.
            </div>
          ) : (
            filteredHabits.map((habit) => {
              const categoryColor = CATEGORY_COLORS[habit.category] || CATEGORY_COLORS['Sekolah/Belajar'];
              const isExpanded = expandedId === habit.id;

              return (
                <div
                  key={habit.id}
                  id={`habit-item-${habit.id}`}
                  className={`group relative p-3.5 rounded-xl border transition-all duration-200 ${
                    habit.completed
                      ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800 shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <button
                      id={`checkbox-${habit.id}`}
                      onClick={() => handleToggle(habit)}
                      className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                        habit.completed
                          ? 'bg-emerald-500 text-white shadow-xs shadow-emerald-500/30'
                          : 'border-2 border-slate-300 dark:border-slate-600 hover:border-indigo-500 text-transparent hover:text-slate-300'
                      }`}
                      aria-label={habit.completed ? 'Batalkan Selesai' : 'Tandai Selesai'}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span
                          className={`text-xs md:text-sm font-bold tracking-tight transition-colors ${
                            habit.completed
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {habit.title}
                        </span>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          {onAddToCalendar && (
                            <button
                              onClick={() => onAddToCalendar(habit)}
                              title="Jadwalkan ke Google Calendar"
                              className="p-1 rounded text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            >
                              <CalendarPlus className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : habit.id)}
                            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => onDeleteHabit(habit.id)}
                            title="Hapus Kegiatan"
                            className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Badges & Meta */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        {/* Time Badge */}
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                          <Clock className="w-3 h-3 text-indigo-500" />
                          {habit.time} WIB
                        </span>

                        {/* Category Badge */}
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${categoryColor.bgBadge}`}
                        >
                          {habit.category}
                        </span>

                        {habit.durationMinutes && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">
                            ~{habit.durationMinutes} mnt
                          </span>
                        )}

                        {habit.googleTaskId && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                            • Google Tasks
                          </span>
                        )}
                      </div>

                      {/* Notes / Details Expand */}
                      {isExpanded && habit.notes && (
                        <div className="mt-2.5 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
                          <FileText className="w-3.5 h-3.5 mt-0.5 text-indigo-500 flex-shrink-0" />
                          <p className="leading-relaxed">{habit.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>Setiap centang otomatis me-recalculate skor & kurva grafik.</span>
        <span className="font-semibold text-indigo-600 dark:text-indigo-400">
          Auto-Save Active
        </span>
      </div>
    </div>
  );
};
