import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  CheckCircle2,
  Calendar,
  FileSpreadsheet,
  CheckSquare,
  Lightbulb,
  ArrowRight,
  Zap,
  RotateCcw,
  Plus,
  Image as ImageIcon,
  X,
  Camera,
  FileText,
  Maximize2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChatMessage,
  HabitTask,
  UserStats,
  GoogleSyncState,
  GoogleUser,
  AIAction,
  ChatImageAttachment,
} from '../types';
import { sendGeminiChatMessage } from '../services/geminiService';
import { inferScheduleType } from '../services/googleTasksService';

export interface GeminiAiChatViewProps {
  habits: HabitTask[];
  stats: UserStats;
  googleUser: GoogleUser | null;
  syncState: GoogleSyncState;
  onAddHabit: (taskData: Omit<HabitTask, 'id' | 'createdAt'>) => Promise<void> | void;
  onBatchAddHabits?: (tasks: Array<Omit<HabitTask, 'id' | 'createdAt'>>) => Promise<void> | void;
  onToggleHabit: (id: string) => Promise<void> | void;
  onSetHabitStatus?: (id: string, completed: boolean) => Promise<void> | void;
  onDeleteHabit: (id: string) => Promise<void> | void;
  onUpdateHabit?: (id: string, updates: Partial<HabitTask>) => Promise<void> | void;
  onManualSync: () => Promise<void> | void;
  onConnectGoogle: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-welcome',
    sender: 'assistant',
    text: 'Halo! Saya **I.R.I.S. AI**, asisten produktivitas Anda.\n\nSistem ini terhubung langsung dengan:\n- 📋 **Google Tasks (Daftar: Tugas Saya)** sebagai input centang tugas\n- 📊 **Google Sheets** sebagai database permanen & log historis\n- 📈 **Web App Dashboard** sebagai output visual grafik produktivitas\n\nKEMAMPUAN SAYA:\n- 📸 **Membaca foto jadwal/catatan** (Klik tombol **+** di kiri untuk upload foto jadwal pelajaran, agenda kuliah/sekolah, atau to-do list tulisan tangan. Saya akan otomatis menjadwalkan ke Google Tasks!)\n- ✨ **Membuat habit baru** (misal: *"Tambahkan habit Belajar Matematika jam 19:30"*)\n- ⏱️ **Mengubah jam atau prioritas habit**\n- ✅ **Menandai habit selesai/belum**\n- 📊 **Mengevaluasi skor produktivitas & konsistensi**\n\nSilakan ketik pesan atau unggah foto jadwal Anda!',
    timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
  },
];

const SUGGESTED_PROMPTS = [
  'Tambahkan habit Belajar Coding malam jam 20:00 (45 menit)',
  'Tandai tugas Sholat Subuh sudah selesai',
  'Evaluasi skor produktivitas dan konsistensi saya hari ini',
  'Buatkan 3 habit mikro untuk meningkatkan fokus & energi',
];

// Helper to render formatted text (bold, bullet points, clean paragraphs)
const FormattedMessageText: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');

  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        // Check if line is a bullet item
        const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ');
        const cleanContent = isBullet ? trimmed.replace(/^[-•*]\s+/, '') : line;

        // Parse bold segments **bold text**
        const parts = cleanContent.split(/(\*\*.*?\*\*)/g);

        const renderedLine = parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={pIdx} className="font-bold text-slate-900 dark:text-white">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return <span key={pIdx}>{part}</span>;
        });

        if (isBullet) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm mt-0.5">•</span>
              <div className="flex-1">{renderedLine}</div>
            </div>
          );
        }

        return (
          <p key={idx} className="leading-relaxed">
            {renderedLine}
          </p>
        );
      })}
    </div>
  );
};

export const GeminiAiChatView: React.FC<GeminiAiChatViewProps> = ({
  habits = [],
  stats,
  googleUser,
  syncState,
  onAddHabit,
  onBatchAddHabits,
  onToggleHabit,
  onSetHabitStatus,
  onDeleteHabit,
  onUpdateHabit,
  onManualSync,
  onConnectGoogle,
  showToast,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('iris_ai_chat_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.warn('Error loading chat history', e);
      }
    }
    return INITIAL_MESSAGES;
  });

  const [inputMessage, setInputMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<ChatImageAttachment | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewModalImage, setPreviewModalImage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('iris_ai_chat_history', JSON.stringify(messages.slice(-20)));
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Harap pilih file gambar (JPG, PNG, WebP)', 'error');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      showToast('Ukuran gambar maksimal 8MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        setSelectedImage({
          data: dataUrl,
          mimeType: file.type || 'image/jpeg',
          name: file.name,
          previewUrl: dataUrl,
        });
        showToast('Foto berhasil dipilih! Tambahkan instruksi lalu kirim ke AI.', 'info');
      }
    };
    reader.onerror = () => {
      showToast('Gagal membaca file gambar', 'error');
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageFile(file);
    }
    // Reset file input value so same file can be selected again
    e.target.value = '';
  };

  const executeAction = async (action: AIAction) => {
    try {
      const actType = (action.type || '').toUpperCase();
      const habitTitle =
        action.habit?.title ||
        action.targetTitle ||
        (action as any).title ||
        action.description?.replace(/^(menambahkan|tambah|jadwalkan|buat)\s+/i, '');

      if (
        (actType === 'ADD_HABIT' || actType === 'ADD_TASK' || actType === 'CREATE_TASK' || actType === 'SCHEDULE_EVENT') &&
        habitTitle
      ) {
        await onAddHabit({
          title: habitTitle,
          category: (action.habit?.category as any) || 'Rutin Harian',
          scheduleType:
            (action.habit as any)?.scheduleType ||
            inferScheduleType(habitTitle, action.habit?.notes || action.description),
          time: action.habit?.time || '08:00',
          completed: action.habit?.completed || false,
          priority: action.habit?.priority || 'medium',
          durationMinutes: action.habit?.durationMinutes || 30,
          notes: action.habit?.notes || `Ditambahkan via I.R.I.S. Gemini AI (${action.description || 'Foto/Teks'})`,
        });
      } else if (
        actType === 'BATCH_ADD_HABITS' ||
        (Array.isArray(action.habits) && action.habits.length > 0)
      ) {
        const rawList = action.habits || [];
        const validList = rawList.filter((h) => h && h.title);
        if (validList.length > 0) {
          if (onBatchAddHabits) {
            await onBatchAddHabits(
              validList.map((h) => ({
                title: h.title || 'Kegiatan Baru',
                category: (h.category as any) || 'Rutin Harian',
                scheduleType:
                  (h as any).scheduleType ||
                  inferScheduleType(h.title || '', h.notes || action.description || ''),
                time: h.time || '08:00',
                completed: false,
                priority: h.priority || 'medium',
                durationMinutes: h.durationMinutes || 30,
                notes: h.notes || 'Ditambahkan otomatis via I.R.I.S. Gemini AI (Foto Jadwal)',
              }))
            );
          } else {
            for (const h of validList) {
              if (h.title) {
                await onAddHabit({
                  title: h.title,
                  category: (h.category as any) || 'Rutin Harian',
                  scheduleType:
                    (h as any).scheduleType ||
                    inferScheduleType(h.title, h.notes || ''),
                  time: h.time || '08:00',
                  completed: false,
                  priority: h.priority || 'medium',
                  durationMinutes: h.durationMinutes || 30,
                  notes: h.notes || 'Ditambahkan via I.R.I.S. Gemini AI',
                });
              }
            }
          }
        }
      } else if (
        actType === 'TOGGLE_HABIT' ||
        actType === 'COMPLETE_HABIT' ||
        actType === 'MARK_DONE' ||
        actType === 'MARK_COMPLETED'
      ) {
        const query = (action.targetTitle || habitTitle || '').toLowerCase().trim();
        const found = habits.find(
          (h) =>
            (action.targetId && h.id === action.targetId) ||
            (query && (h.title.toLowerCase().includes(query) || query.includes(h.title.toLowerCase())))
        );
        if (found) {
          if (onSetHabitStatus && action.completed !== undefined) {
            await onSetHabitStatus(found.id, action.completed);
          } else {
            await onToggleHabit(found.id);
          }
        }
      } else if (actType === 'DELETE_HABIT' || actType === 'REMOVE_HABIT') {
        const query = (action.targetTitle || habitTitle || '').toLowerCase().trim();
        const found = habits.find(
          (h) =>
            (action.targetId && h.id === action.targetId) ||
            (query && (h.title.toLowerCase().includes(query) || query.includes(h.title.toLowerCase())))
        );
        if (found) {
          await onDeleteHabit(found.id);
        }
      } else if (actType === 'UPDATE_HABIT' && onUpdateHabit) {
        const query = (action.targetTitle || habitTitle || '').toLowerCase().trim();
        const found = habits.find(
          (h) =>
            (action.targetId && h.id === action.targetId) ||
            (query && (h.title.toLowerCase().includes(query) || query.includes(h.title.toLowerCase())))
        );
        if (found && action.habit) {
          await onUpdateHabit(found.id, action.habit);
        }
      }
    } catch (err: any) {
      console.error('Failed to execute AI action:', action, err);
      showToast(`Gagal mengeksekusi aksi: ${err?.message || 'Error'}`, 'error');
    }
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputMessage).trim();
    const imageToSend = selectedImage;

    if ((!textToSend && !imageToSend) || isLoading) return;

    const userMsgId = `msg-user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: textToSend || (imageToSend ? 'Tolong baca dan jadwalkan informasi dari foto ini' : ''),
      image: imageToSend || undefined,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
      const response = await sendGeminiChatMessage(
        textToSend || 'Tolong baca dan jadwalkan informasi dari foto yang saya unggah ini.',
        messages,
        habits,
        stats,
        imageToSend || undefined
      );

      const executedActions: AIAction[] = [];
      if (response.actions && response.actions.length > 0) {
        for (const act of response.actions) {
          await executeAction(act);
          executedActions.push(act);
        }
        showToast(`${response.actions.length} kegiatan otomatis ditambahkan & disinkronkan!`, 'success');
      }

      const aiMsgId = `msg-ai-${Date.now()}`;
      const aiMsg: ChatMessage = {
        id: aiMsgId,
        sender: 'assistant',
        text: response.message,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        actions: executedActions.length > 0 ? executedActions : undefined,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (error: any) {
      console.error('Gemini chat failed:', error);
      const errMsg: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        sender: 'assistant',
        text: `Maaf, terjadi kendala saat memproses foto/pesan Anda: ${error?.message || 'Koneksi terputus'}. Silakan coba kembali.`,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errMsg]);
      showToast('Gagal memproses dengan Gemini AI', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages(INITIAL_MESSAGES);
    localStorage.removeItem('iris_ai_chat_history');
    showToast('Riwayat percakapan telah dibersihkan.', 'info');
  };

  return (
    <div id="gemini-chat-container" className="flex flex-col h-[calc(100vh-9rem)] max-w-5xl mx-auto space-y-3.5 overflow-hidden">
      {/* Hidden File Input for Image Upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Top Header Card */}
      <div
        id="gemini-top-banner"
        className="p-3.5 sm:p-4.5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5 transition-colors shrink-0"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-emerald-500/25 shrink-0">
            <Sparkles className="w-5 h-5 text-slate-950 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                I.R.I.S. Gemini AI Assistant
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                Multimodal Vision AI
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Bisa baca foto jadwal pelajaran / to-do list & sinkronisasi otomatis ke <strong>Google Tasks</strong> & <strong>Google Sheets</strong>
            </p>
          </div>
        </div>

        {/* Integration Status Badges */}
        <div className="flex items-center gap-2 flex-wrap text-xs w-full md:w-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 font-medium">
            <CheckSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="truncate max-w-[150px] sm:max-w-none">
              Google Tasks: <strong className="font-bold text-slate-900 dark:text-white">{syncState.isConnected ? (syncState.taskListName || 'Tugas Saya') : 'Siap Sync'}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 font-medium">
            <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
            <span className="truncate max-w-[150px] sm:max-w-none">
              Sheets DB: <strong className="font-bold text-slate-900 dark:text-white">{syncState.spreadsheetId ? 'Database Aktif' : 'Siap Sync'}</strong>
            </span>
          </div>

          <button
            id="clear-chat-history-btn"
            onClick={handleClearHistory}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors ml-auto md:ml-0"
            title="Bersihkan riwayat percakapan"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Main Chat Stream Container */}
      <div
        id="gemini-chat-scroll-area"
        className="flex-1 overflow-y-auto overflow-x-hidden bg-white/70 dark:bg-slate-900/60 backdrop-blur-xs border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 sm:p-5 space-y-4 shadow-sm"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isAI = msg.sender === 'assistant';
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex gap-3 sm:gap-3.5 ${isAI ? 'justify-start' : 'justify-end'}`}
              >
                {/* AI Avatar */}
                {isAI && (
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 shrink-0 mt-0.5">
                    <Bot className="w-5 h-5" />
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`max-w-[90%] sm:max-w-[78%] rounded-3xl p-4 sm:p-5 shadow-sm transition-all ${
                    isAI
                      ? 'bg-white dark:bg-slate-800/95 border border-slate-200/90 dark:border-slate-700/80 text-slate-800 dark:text-slate-100 rounded-tl-sm'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-tr-sm shadow-md shadow-emerald-600/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 mb-2 text-[11px] font-semibold opacity-75">
                    <span className={isAI ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-emerald-100 font-bold'}>
                      {isAI ? 'I.R.I.S. AI' : googleUser?.displayName || 'Anda'}
                    </span>
                    <span className={isAI ? 'text-slate-400 dark:text-slate-500' : 'text-emerald-100'}>
                      {msg.timestamp}
                    </span>
                  </div>

                  {/* Attached Image inside User Message */}
                  {msg.image && msg.image.data && (
                    <div className="mb-3">
                      <div
                        onClick={() => setPreviewModalImage(msg.image?.data || null)}
                        className="group relative cursor-pointer inline-block overflow-hidden rounded-2xl border-2 border-white/40 shadow-md max-w-full sm:max-w-xs transition-transform hover:scale-[1.02]"
                      >
                        <img
                          src={msg.image.data}
                          alt="Foto jadwal terunggah"
                          className="max-h-60 w-auto object-cover rounded-xl"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-bold">
                          <Maximize2 className="w-4 h-4" />
                          <span>Perbesar Foto</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-emerald-100 font-medium mt-1">
                        <ImageIcon className="w-3 h-3" />
                        <span>Foto Jadwal / Dokumen Terlampir</span>
                      </div>
                    </div>
                  )}

                  {/* Rendered Text */}
                  <div className={isAI ? 'text-slate-700 dark:text-slate-200' : 'text-white'}>
                    <FormattedMessageText text={msg.text} />
                  </div>

                  {/* Executed Action Chips */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-3.5 pt-3 border-t border-slate-200 dark:border-slate-700/80 space-y-2">
                      <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        Perubahan Otomatis Diterapkan ke Google Tasks & Dashboard:
                      </div>
                      {msg.actions.map((action, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-2.5 text-xs bg-emerald-50 dark:bg-emerald-950/50 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800/70 text-emerald-900 dark:text-emerald-200 font-medium"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span className="truncate">{action.description}</span>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-200/70 dark:bg-emerald-800/80 text-emerald-800 dark:text-emerald-100 shrink-0">
                            Synced
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* User Avatar */}
                {!isAI && (
                  <div className="w-9 h-9 rounded-2xl bg-emerald-700 flex items-center justify-center text-white shrink-0 mt-0.5 font-bold text-xs shadow-md shadow-emerald-700/20 overflow-hidden">
                    {googleUser?.photoURL ? (
                      <img
                        src={googleUser.photoURL}
                        alt="User"
                        className="w-9 h-9 rounded-2xl object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <User className="w-5 h-5" />
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Loading Indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 sm:gap-3.5 justify-start"
          >
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 shrink-0">
              <Bot className="w-5 h-5 animate-spin" />
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-4 rounded-tl-sm flex items-center gap-3 shadow-sm">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-bounce"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]"></span>
              </div>
              <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
                I.R.I.S. Gemini sedang menganalisis foto & menyinkronkan tugas...
              </span>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompt Chips */}
      <div id="gemini-quick-prompts" className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar shrink-0">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 shrink-0 pl-1">
          <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" /> Rekomendasi:
        </span>
        {SUGGESTED_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(prompt)}
            disabled={isLoading}
            className="px-3.5 py-1.5 rounded-full bg-white hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-200 dark:border-slate-700/80 hover:border-emerald-300 dark:hover:border-emerald-700 text-xs font-medium whitespace-nowrap transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            <span>{prompt}</span>
            <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-emerald-600" />
          </button>
        ))}
      </div>

      {/* Attached Image Preview Bar (Above Input Form) */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-2.5 flex items-center justify-between gap-3 shadow-xs shrink-0"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative group">
                <img
                  src={selectedImage.data}
                  alt="Preview"
                  className="w-12 h-12 object-cover rounded-xl border border-emerald-300 dark:border-emerald-700 shadow-xs"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 dark:text-emerald-200 truncate">
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">{selectedImage.name || 'Foto Jadwal Terpilih'}</span>
                </div>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-0.5">
                  Foto siap dianalisis oleh Gemini AI. Ketik instruksi tambahan jika ada, lalu tekan Kirim.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="p-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-500 hover:text-rose-600 border border-slate-200 dark:border-slate-700 transition-colors shrink-0"
              title="Hapus foto"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Input Floating Dock with Plus (+) Image Upload Button on the Left */}
      <form
        id="gemini-chat-input-form"
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-2 sm:p-2.5 shadow-lg shadow-slate-200/50 dark:shadow-none focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all shrink-0"
      >
        {/* Plus (+) Button to Upload Image */}
        <button
          type="button"
          id="gemini-upload-image-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all shrink-0 ${
            selectedImage
              ? 'bg-emerald-500 text-slate-950 font-bold ring-2 ring-emerald-400 shadow-md'
              : 'bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-emerald-600 border border-slate-200 dark:border-slate-700/80 active:scale-95'
          }`}
          title="Tambah Foto / Jadwal Pelajaran (Klik untuk unggah)"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Text Input */}
        <input
          id="gemini-chat-input"
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder={
            selectedImage
              ? 'Ketik instruksi (misal: "Ekstrak semua jadwal di foto ini ke Google Tasks")...'
              : 'Minta Gemini AI: buat jadwal, ubah jam kegiatan, atau klik (+) untuk upload foto jadwal...'
          }
          disabled={isLoading}
          className="flex-1 bg-transparent px-2 sm:px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none disabled:opacity-50 font-normal"
        />

        {/* Send Button */}
        <button
          id="gemini-chat-send-btn"
          type="submit"
          disabled={(!inputMessage.trim() && !selectedImage) || isLoading}
          className="px-4.5 sm:px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold flex items-center gap-2 text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-emerald-600/25 active:scale-95 shrink-0"
        >
          <span>Kirim</span>
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Lightbox / Modal for Image Preview */}
      <AnimatePresence>
        {previewModalImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewModalImage(null)}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700"
            >
              <button
                onClick={() => setPreviewModalImage(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={previewModalImage}
                alt="Foto Diperbesar"
                className="max-h-[85vh] w-auto object-contain mx-auto"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
