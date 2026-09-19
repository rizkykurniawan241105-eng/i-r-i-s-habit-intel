import React, { useState } from 'react';
import {
  FileSpreadsheet,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Table,
  Sparkles,
  ArrowRight,
  Database,
  Code2,
} from 'lucide-react';
import { GoogleSyncState, HabitTask, UserStats, GoogleUser } from '../types';

interface GoogleSheetsViewProps {
  syncState: GoogleSyncState;
  onSyncNow: () => void;
  onConnectGoogle: () => void;
  habits: HabitTask[];
  stats: UserStats;
  googleUser: GoogleUser | null;
}

export const GoogleSheetsView: React.FC<GoogleSheetsViewProps> = ({
  syncState,
  onSyncNow,
  onConnectGoogle,
  habits,
  stats,
  googleUser,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);

  const appsScriptCode = `// Apps Script Integration for I.R.I.S. Habit Intel
function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Daily Summary") || ss.getActiveSheet();
  var data = sheet.getDataRange().getValues();
  return ContentService.createTextOutput(JSON.stringify({ status: "success", data: data }))
    .setMimeType(ContentService.MimeType.JSON);
}

function logHabitEntry(summaryData) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Daily Summary");
  if (!sheet) {
    sheet = ss.insertSheet("Daily Summary");
    sheet.appendRow(["Timestamp", "Tanggal", "Selesai", "Total Tasks", "Success Rate (%)", "Streak Hari", "Jam", "Skor"]);
  }
  sheet.appendRow(summaryData);
  return { success: true };
}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in" id="google-sheets-sync-view">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Google Sheets & Apps Script Architecture
          </span>
          <h2 className="text-xl md:text-2xl font-black tracking-tight">
            Sinkronisasi Database Spreadsheet Otomatis
          </h2>
          <p className="text-xs md:text-sm text-white/85 mt-2 leading-relaxed">
            Data habit, streak, jam produktif, dan log harian tersinkronisasi langsung ke Google Spreadsheet di akun Anda.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {syncState.isConnected ? (
              <>
                <button
                  id="sheets-view-sync-btn"
                  onClick={onSyncNow}
                  disabled={syncState.isSyncing}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-emerald-800 text-xs font-bold hover:bg-white/90 transition shadow-md"
                >
                  <RefreshCw className={`w-4 h-4 ${syncState.isSyncing ? 'animate-spin' : ''}`} />
                  <span>{syncState.isSyncing ? 'Sedang Menyinkronkan...' : 'Sinkronkan Data Sekarang'}</span>
                </button>
                {syncState.spreadsheetUrl && (
                  <a
                    href={syncState.spreadsheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold backdrop-blur-md transition"
                  >
                    <span>Buka Spreadsheet di Tab Baru</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </>
            ) : (
              <button
                id="sheets-view-connect-btn"
                onClick={onConnectGoogle}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-slate-900 text-xs font-bold hover:bg-white/90 transition shadow-md"
              >
                <span>Hubungkan Google Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid Status & Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Status Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Database className="w-5 h-5 text-emerald-500" />
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Status Koneksi</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-slate-50 dark:bg-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Akun Google:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {googleUser?.email || 'rizkykurniawan241105@gmail.com'}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-slate-50 dark:bg-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Status Sinkron:</span>
              <span className={`font-bold flex items-center gap-1 ${syncState.isConnected ? 'text-emerald-500' : 'text-amber-500'}`}>
                <CheckCircle2 className="w-3.5 h-3.5" /> {syncState.isConnected ? 'Tersambung & Aktif' : 'Standby'}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-slate-50 dark:bg-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Terakhir Diupdate:</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {syncState.lastSyncedAt || 'Belum ada sync'}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-slate-50 dark:bg-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Nama Dokumen:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[140px]">
                I.R.I.S. Habit Intel
              </span>
            </div>
          </div>
        </div>

        {/* Live Payload Preview */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Table className="w-5 h-5 text-indigo-500" />
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Pratinjau Data Baris Hari Ini
                </h3>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 font-bold">
                Live Row Data
              </span>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-2 px-3">Kolom</th>
                    <th className="py-2 px-3">Nilai Data</th>
                    <th className="py-2 px-3">Tipe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                  <tr>
                    <td className="py-2 px-3 font-semibold text-indigo-600 dark:text-indigo-400">Timestamp Log</td>
                    <td className="py-2 px-3">{new Date().toLocaleString('id-ID')}</td>
                    <td className="py-2 px-3 text-slate-400">DateTime</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold text-indigo-600 dark:text-indigo-400">Selesai / Total</td>
                    <td className="py-2 px-3">{stats.tasksCompleted} / {stats.totalTasks} Tasks</td>
                    <td className="py-2 px-3 text-slate-400">Integer</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold text-indigo-600 dark:text-indigo-400">Success Rate</td>
                    <td className="py-2 px-3 font-bold text-emerald-600 dark:text-emerald-400">{stats.completionRate}%</td>
                    <td className="py-2 px-3 text-slate-400">Percentage</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold text-indigo-600 dark:text-indigo-400">Habit Streak</td>
                    <td className="py-2 px-3 font-bold text-amber-500">🔥 {stats.habitStreak} Hari</td>
                    <td className="py-2 px-3 text-slate-400">Days</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold text-indigo-600 dark:text-indigo-400">Productivity Score</td>
                    <td className="py-2 px-3 font-bold text-purple-600 dark:text-purple-400">{stats.productivityScore} / 10</td>
                    <td className="py-2 px-3 text-slate-400">Float</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Apps Script Standalone Code Section */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Google Apps Script Snippet (Ready to Deploy)
            </h3>
          </div>
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold transition"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCode ? 'Tersalin!' : 'Salin Kode Script'}</span>
          </button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Gunakan script ini pada Extensions &gt; Apps Script di Google Sheets jika ingin menerima data via Web App endpoint.
        </p>
        <pre className="p-4 rounded-xl bg-slate-950 text-slate-200 text-xs font-mono overflow-x-auto border border-slate-800">
          {appsScriptCode}
        </pre>
      </div>
    </div>
  );
};
