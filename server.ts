import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

let geminiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
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

  app.use(express.json({ limit: "10mb" }));

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

      const systemInstruction = `Anda adalah "I.R.I.S. AI", asisten kecerdasan buatan cerdas untuk dashboard produktivitas dan habit tracker "I.R.I.S. Habit Intel".
Aplikasi ini terhubung langsung dengan Google Tasks (label: "I.R.I.S. Habit Tracker"), Google Sheets ("I.R.I.S. Habit Intel - Daily Logs & Metrics"), dan Google Calendar.

PERAN & KEMAMPUAN MULTIMODAL ANDA:
1. Membaca dan menganalisis gambar/foto yang diunggah pengguna (seperti jadwal pelajaran/kuliah, jadwal shift, jadwal ujian, foto catatan to-do list tulisan tangan, jadwal ibadah, silabus, atau kalender kegiatan).
2. Mengekstrak waktu (format 24-jam "HH:mm" seperti "07:00", "13:30", "19:30"), nama mata pelajaran/kegiatan, kategori yang cocok, prioritas ("low"|"medium"|"high"), dan durasi (menit).
3. Mengubah hasil pembacaan foto menjadi aksi 'BATCH_ADD_HABITS' atau 'ADD_HABIT' agar kegiatan dari foto tersebut otomatis terdaftar di Google Tasks dan dashboard.
4. Membantu pengguna membuat, memodifikasi, menghapus, atau menandai selesai tugas/kebiasaan harian.
5. Memberikan analisis produktivitas, saran jadwal yang optimal, motivasi, dan evaluasi harian.
6. Kategori yang valid untuk habit adalah:
   - "Ibadah"
   - "Sekolah/Belajar"
   - "Rutin Harian"
   - "Rehat/OSIS"
   - "Olahraga & Kesehatan"
7. Format waktu adalah "HH:mm" (24-jam, misalnya "04:50", "07:00", "19:30").
8. Prioritas: "low", "medium", atau "high".
9. Durasi default: 15-60 menit (dalam menit).

INFORMASI KONDISI SAAT INI:
- Daftar Habits Pengguna saat ini: ${JSON.stringify(currentHabits || [], null, 2)}
- Statistik Pengguna: ${JSON.stringify(stats || {}, null, 2)}
- Waktu lokal sekarang: ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}

INSTRUKSI FORMAT OUTPUT:
Anda WAJIB selalu mengembalikan output dalam format JSON yang valid dengan struktur berikut:
{
  "message": "Penjelasan ramah, sopan, dan terstruktur dalam Bahasa Indonesia kepada pengguna tentang apa yang telah dibaca dari foto atau apa yang telah dianalisis/dijadwalkan.",
  "actions": [
    // Array aksi yang perlu dijalankan aplikasi (jika pengguna meminta perubahan data):
    // 1. Menambah habit baru:
    // {
    //   "type": "ADD_HABIT",
    //   "habit": {
    //     "title": "Nama Habit",
    //     "category": "Sekolah/Belajar",
    //     "time": "19:30",
    //     "priority": "high",
    //     "durationMinutes": 45,
    //     "notes": "Catatan opsional"
    //   },
    //   "description": "Menambahkan habit 'Nama Habit' pada pukul 19:30"
    // }
    // 2. Mengubah habit yang ada:
    // {
    //   "type": "UPDATE_HABIT",
    //   "targetId": "id-habit-atau-target-title",
    //   "targetTitle": "Nama Habit Sebelumnya",
    //   "habit": { "time": "20:00", "priority": "high" },
    //   "description": "Mengubah jadwal 'Nama Habit' menjadi 20:00"
    // }
    // 3. Menandai selesai / belum selesai:
    // {
    //   "type": "TOGGLE_HABIT",
    //   "targetTitle": "Nama Habit",
    //   "completed": true,
    //   "description": "Menandai 'Nama Habit' sebagai selesai"
    // }
    // 4. Menghapus habit:
    // {
    //   "type": "DELETE_HABIT",
    //   "targetTitle": "Nama Habit",
    //   "description": "Menghapus habit 'Nama Habit'"
    // }
    // 5. Menambahkan banyak habit sekaligus (misal breakdown jadwal atau hasil ekstrak foto jadwal):
    // {
    //   "type": "BATCH_ADD_HABITS",
    //   "habits": [...],
    //   "description": "Menambahkan 4 kegiatan dari foto jadwal"
    // }
  ]
}

Jika pengguna hanya bertanya atau berdiskusi (tanpa minta menambah/mengubah tugas), isi "actions": [].
Pastikan bahasa selalu suportif, ringkas, dan jelas!`;

      // Format conversation contents
      const formattedContents: any[] = [];

      if (Array.isArray(history)) {
        for (const item of history.slice(-8)) {
          if (item.sender === "user") {
            const parts: any[] = [];
            if (item.image && item.image.data) {
              const b64 = item.image.data.includes("base64,") ? item.image.data.split("base64,")[1] : item.image.data;
              parts.push({
                inlineData: {
                  mimeType: item.image.mimeType || "image/jpeg",
                  data: b64,
                },
              });
            }
            parts.push({ text: item.text || "Gambar terlampir" });
            formattedContents.push({
              role: "user",
              parts,
            });
          } else if (item.sender === "assistant") {
            formattedContents.push({
              role: "model",
              parts: [{ text: item.text }],
            });
          }
        }
      }

      // Build current user message parts
      const currentUserParts: any[] = [];
      if (image && image.data) {
        const b64 = image.data.includes("base64,") ? image.data.split("base64,")[1] : image.data;
        currentUserParts.push({
          inlineData: {
            mimeType: image.mimeType || "image/jpeg",
            data: b64,
          },
        });
      }
      currentUserParts.push({
        text: message && message.trim() ? message : "Silakan analisis foto/dokumen ini, lalu buatkan dan jadwalkan kegiatan atau tugas yang relevan ke dalam Google Tasks dan habit tracker.",
      });

      formattedContents.push({
        role: "user",
        parts: currentUserParts,
      });

      // Helper function to call Gemini with retry & fallback models for high demand (503)
      const candidateModels = ["gemini-3.8-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
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
              description: "Balasan percakapan dalam Bahasa Indonesia",
            },
            actions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: {
                    type: Type.STRING,
                    description: "Jenis aksi: ADD_HABIT, UPDATE_HABIT, DELETE_HABIT, TOGGLE_HABIT, BATCH_ADD_HABITS",
                  },
                  habit: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      category: { type: Type.STRING },
                      time: { type: Type.STRING },
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
                        priority: { type: Type.STRING },
                        durationMinutes: { type: Type.NUMBER },
                        notes: { type: Type.STRING },
                        completed: { type: Type.BOOLEAN },
                      },
                    },
                  },
                  targetId: { type: Type.STRING },
                  targetTitle: { type: Type.STRING },
                  completed: { type: Type.BOOLEAN },
                  description: { type: Type.STRING },
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
            const isUnavailable =
              err?.status === 503 ||
              err?.status === 429 ||
              err?.message?.includes("503") ||
              err?.message?.includes("high demand") ||
              err?.message?.includes("UNAVAILABLE");
            
            console.warn(`Model ${modelName} attempt ${attempt} failed:`, err?.message || err);
            
            if (isUnavailable && attempt < 2) {
              // Wait 700ms before retrying the same or next model
              await new Promise((resolve) => setTimeout(resolve, 700 * attempt));
            } else if (!isUnavailable) {
              // Not a 503/transient error, try next candidate
              break;
            }
          }
        }
        if (response && response.text) {
          break;
        }
      }

      if (!response || !response.text) {
        throw lastError || new Error("Semua model Gemini sedang mengalami antrian tinggi. Silakan coba kembali sesaat lagi.");
      }

      const textResponse = response.text || "{}";
      let parsedData: any = {};
      try {
        parsedData = JSON.parse(textResponse);
      } catch (err) {
        console.warn("Could not parse JSON from Gemini response, fallback to text", err);
        parsedData = {
          message: textResponse,
          actions: [],
        };
      }

      return res.json({
        success: true,
        message: parsedData.message || textResponse,
        actions: Array.isArray(parsedData.actions) ? parsedData.actions : [],
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
    console.log(`I.R.I.S. Habit Intel Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Server start failed:", err);
  process.exit(1);
});
