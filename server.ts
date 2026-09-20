import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

let geminiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing");
    }
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return geminiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json({ limit: "15mb" }));

  // API Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "I.R.I.S. Habit Intel Server" });
  });

  // Gemini AI Chat & Task Management Endpoint
  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const { message, history, currentHabits, stats, image } = req.body;

      if ((!message || typeof message !== "string") && (!image || !image.data)) {
        return res.status(400).json({ error: "Pesan atau foto tidak boleh kosong" });
      }

      const ai = getGeminiClient();

      const systemInstruction = `Anda adalah "I.R.I.S. AI", asisten kecerdasan buatan cerdas untuk dashboard produktivitas "I.R.I.S. Habit Intel".
Aplikasi ini terhubung langsung dengan:
1. Google Tasks (Daftar "Tugas Saya" - sebagai input centang tugas)
2. Google Sheets ("I.R.I.S. Habit Intel - Database & Log Harian" - sebagai database permanen)
3. Dashboard Web App ini (sebagai output tampilan visual & grafik)

TUGAS & KEMAMPUAN UTAMA ANDA:
1. MENGANALISIS FOTO JADWAL / TO-DO LIST:
   - Jika pengguna mengirim foto jadwal pelajaran sekolah/kuliah, agenda kerja, jadwal shift, jadwal ibadah, atau to-do list tulisan tangan:
   - Anda WAJIB membaca teks, jam kegiatan (format 24 jam "HH:mm"), dan nama kegiatan dari foto tersebut.
   - Anda WAJIB membuat aksi 'BATCH_ADD_HABITS' atau 'ADD_HABIT' di dalam array 'actions' agar setiap butir jadwal di foto tersebut otomatis tersimpan ke Google Tasks dan Google Sheets!
2. MENJALANKAN PERINTAH TEKS PENGGUNA:
   - "Tambahkan habit / tugas ...": Buat aksi ADD_HABIT.
   - "Tandai tugas ... sudah selesai" atau "centang ...": Buat aksi TOGGLE_HABIT dengan completed: true.
   - "Tandai ... belum selesai" atau "uncentang ...": Buat aksi TOGGLE_HABIT dengan completed: false.
   - "Ubah jam ... menjadi ...": Buat aksi UPDATE_HABIT.
   - "Hapus tugas ...": Buat aksi DELETE_HABIT.
   - "Buatkan jadwal / habit mikro ...": Buat aksi BATCH_ADD_HABITS dengan beberapa rekomendasi habit.
3. JADWAL HARI KERJA VS AKHIR PEKAN (PENTING):
   - Kegiatan hari Senin sampai Jumat (sekolah, kantor, kuliah, les) -> scheduleType: 'weekday'
   - Kegiatan hari Sabtu dan Minggu (rehat, liburan, olahraga akhir pekan) -> scheduleType: 'weekend'
   - Kegiatan setiap hari (ibadah sholat, tidur, minum air, makan) -> scheduleType: 'all'
4. KATEGORI VALID:
   - "Ibadah"
   - "Sekolah/Belajar"
   - "Rutin Harian"
   - "Rehat/OSIS"
   - "Olahraga & Kesehatan"

DAFTAR TUGAS SAAT INI DI APLIKASI:
${JSON.stringify(currentHabits || [], null, 2)}

STATISTIK:
${JSON.stringify(stats || {}, null, 2)}

ATURAN STRUKTUR JSON:
Anda WAJIB selalu mengembalikan respon JSON valid:
{
  "message": "Penjelasan ramah, sopan, dan jelas dalam Bahasa Indonesia tentang apa yang dibaca dari foto atau aksi apa yang telah dijalankan.",
  "actions": [
    // Array aksi yang harus dijalankan. JANGAN KOSONGKAN jika user minta tambah tugas, ubah status, atau kirim foto jadwal!
  ]
}`;

      // Build conversation contents cleanly
      const formattedContents: any[] = [];

      // History (only text to prevent payload bloat)
      if (Array.isArray(history)) {
        for (const item of history.slice(-6)) {
          if (item.sender === "user") {
            formattedContents.push({
              role: "user",
              parts: [{ text: item.text || (item.image ? "[Foto jadwal dilampirkan]" : "") }],
            });
          } else if (item.sender === "assistant") {
            formattedContents.push({
              role: "model",
              parts: [{ text: item.text }],
            });
          }
        }
      }

      // Current user parts (multimodal image + prompt)
      const currentUserParts: any[] = [];

      if (image && image.data) {
        let b64 = image.data;
        if (b64.includes("base64,")) {
          b64 = b64.split("base64,")[1];
        }
        currentUserParts.push({
          inlineData: {
            mimeType: image.mimeType || "image/jpeg",
            data: b64,
          },
        });
      }

      const promptText = message && message.trim()
        ? message
        : "Tolong baca dan ekstrak seluruh jadwal atau to-do list yang tertera di foto ini, lalu masukkan semuanya ke actions (BATCH_ADD_HABITS) agar tersimpan ke Google Tasks dan Google Sheets.";

      currentUserParts.push({ text: promptText });

      formattedContents.push({
        role: "user",
        parts: currentUserParts,
      });

      // Candidate models: start with gemini-3.1-flash-lite for ultra-fast response & high reliability
      const candidateModels = ["gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"];
      let response: any = null;
      let lastError: any = null;

      const generationConfig = {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            message: {
              type: Type.STRING,
              description: "Pesan balasan ramah dalam Bahasa Indonesia",
            },
            actions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: {
                    type: Type.STRING,
                    description: "ADD_HABIT, BATCH_ADD_HABITS, TOGGLE_HABIT, UPDATE_HABIT, DELETE_HABIT",
                  },
                  description: { type: Type.STRING },
                  targetTitle: { type: Type.STRING },
                  targetId: { type: Type.STRING },
                  completed: { type: Type.BOOLEAN },
                  habit: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      category: { type: Type.STRING },
                      time: { type: Type.STRING },
                      scheduleType: { type: Type.STRING },
                      priority: { type: Type.STRING },
                      durationMinutes: { type: Type.NUMBER },
                      notes: { type: Type.STRING },
                      completed: { type: Type.BOOLEAN },
                    },
                  },
                  habits: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        title: { type: Type.STRING },
                        category: { type: Type.STRING },
                        time: { type: Type.STRING },
                        scheduleType: { type: Type.STRING },
                        priority: { type: Type.STRING },
                        durationMinutes: { type: Type.NUMBER },
                        notes: { type: Type.STRING },
                        completed: { type: Type.BOOLEAN },
                      },
                    },
                  },
                },
                required: ["type", "description"],
              },
            },
          },
          required: ["message"],
        },
      };

      for (const modelName of candidateModels) {
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            response = await ai.models.generateContent({
              model: modelName,
              contents: formattedContents,
              config: generationConfig,
            });
            if (response && response.text) {
              break;
            }
          } catch (err: any) {
            lastError = err;
            console.warn(`Model ${modelName} attempt ${attempt} error:`, err?.status || err?.message);
            if (attempt < 2) {
              await new Promise((resolve) => setTimeout(resolve, 600));
            }
          }
        }
        if (response && response.text) {
          break;
        }
      }

      if (!response || !response.text) {
        throw lastError || new Error("Tidak dapat menghubungi layanan Gemini AI. Silakan coba kembali.");
      }

      const textResponse = response.text.trim();
      let parsedData: any = {};
      try {
        parsedData = JSON.parse(textResponse);
      } catch (err) {
        console.warn("Fallback JSON parse error", err);
        parsedData = { message: textResponse, actions: [] };
      }

      // Normalize actions for safety
      const rawActions = Array.isArray(parsedData.actions) ? parsedData.actions : [];
      const normalizedActions: any[] = [];

      for (const act of rawActions) {
        if (!act) continue;
        const actType = (act.type || "").toUpperCase();

        // 1. Batch habits
        if (actType === "BATCH_ADD_HABITS" || (Array.isArray(act.habits) && act.habits.length > 0)) {
          const validHabits = (act.habits || []).filter((h: any) => h && h.title);
          if (validHabits.length > 0) {
            normalizedActions.push({
              type: "BATCH_ADD_HABITS",
              description: act.description || `Menambahkan ${validHabits.length} kegiatan dari jadwal`,
              habits: validHabits,
            });
          }
        }
        // 2. Single habit add
        else if (
          actType === "ADD_HABIT" ||
          actType === "ADD_TASK" ||
          actType === "CREATE_TASK" ||
          actType === "SCHEDULE_EVENT" ||
          act.habit?.title ||
          act.targetTitle
        ) {
          const habitTitle = act.habit?.title || act.targetTitle || act.description?.replace(/^(Menambahkan|Tambah|Jadwalkan)\s+/i, "");
          if (habitTitle) {
            normalizedActions.push({
              type: "ADD_HABIT",
              description: act.description || `Menambahkan tugas ${habitTitle}`,
              habit: {
                title: habitTitle,
                category: act.habit?.category || "Rutin Harian",
                time: act.habit?.time || "08:00",
                scheduleType: act.habit?.scheduleType || "all",
                priority: act.habit?.priority || "medium",
                durationMinutes: act.habit?.durationMinutes || 30,
                notes: act.habit?.notes || "Dibuat otomatis oleh I.R.I.S. Gemini AI",
                completed: false,
              },
            });
          }
        }
        // 3. Toggle/Complete
        else if (
          actType === "TOGGLE_HABIT" ||
          actType === "COMPLETE_HABIT" ||
          actType === "MARK_DONE" ||
          actType === "MARK_COMPLETED"
        ) {
          normalizedActions.push({
            type: "TOGGLE_HABIT",
            targetTitle: act.targetTitle || act.habit?.title || "",
            targetId: act.targetId,
            completed: act.completed !== false,
            description: act.description || `Menandai tugas sebagai selesai`,
          });
        }
        // 4. Update
        else if (actType === "UPDATE_HABIT" || actType === "EDIT_HABIT") {
          normalizedActions.push({
            type: "UPDATE_HABIT",
            targetTitle: act.targetTitle || act.habit?.title || "",
            targetId: act.targetId,
            habit: act.habit || {},
            description: act.description || `Memperbarui detail tugas`,
          });
        }
        // 5. Delete
        else if (actType === "DELETE_HABIT" || actType === "REMOVE_HABIT") {
          normalizedActions.push({
            type: "DELETE_HABIT",
            targetTitle: act.targetTitle || "",
            targetId: act.targetId,
            description: act.description || `Menghapus tugas`,
          });
        }
      }

      return res.json({
        success: true,
        message: parsedData.message || "Permintaan Anda telah diproses.",
        actions: normalizedActions,
      });
    } catch (error: any) {
      console.error("Gemini Chat API Error:", error);
      return res.status(500).json({
        error: error?.message || "Terjadi kesalahan saat menghubungi Gemini AI",
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
