# Dokumen Desain Teknis — Bot Telegram Serba Bisa

Turunan langsung dari `01-PRD.md`. Kalau ada requirement baru yang belum tercakup di sini, PRD diupdate dulu sebelum desain diubah.

## 1. Tech Stack
| Layer | Pilihan | Alasan |
|---|---|---|
| Runtime | Node.js (LTS terbaru) | Ekosistem matang, async-friendly untuk I/O bot |
| Framework bot | Telegraf.js | API Telegram Bot paling populer & terdokumentasi untuk Node |
| HTTP client | axios | Standar, dipakai untuk panggil API AI & cuaca |
| Penjadwalan | `setTimeout` + persist ke file | Cukup untuk reminder skala kecil, tanpa dependency berat |
| Penyimpanan data | File JSON (`data/db.json`) | Nol setup, cukup untuk MVP; interface dibuat agar mudah diganti DB nyata |
| Konfigurasi | dotenv (`.env`) | Pisahkan secret dari kode |

## 2. Arsitektur Modul

```
src/
├── index.js          # entry point, start bot, graceful shutdown
├── bot.js            # rakit instance bot + urutan pendaftaran command
├── config.js         # baca & validasi environment variable
├── commands/          # 1 file = 1 fitur command (start, help, ai, weather, reminder, broadcast)
├── middlewares/        # logger.js (catat pesan masuk), auth.js (cek admin)
└── services/           # db.js, aiService.js, weatherService.js — semua panggilan eksternal/data
```

**Prinsip:**
- `commands/*` hanya boleh berisi logika presentasi (parsing input user, format balasan). Logika bisnis/panggilan eksternal wajib lewat `services/*`.
- `services/*` tidak boleh tahu apa-apa soal Telegram (tidak menerima objek `ctx`), supaya bisa dites atau dipakai ulang di luar bot.
- Command yang mendengarkan **semua pesan teks bebas** (fallback ke AI) wajib didaftarkan **paling terakhir** di `bot.js`, agar command spesifik lain tidak "tertelan" oleh fallback ini.

## 3. Alur Data Utama

**Chat AI:**
`user ketik teks → middlewares/logger (catat) → commands/ai.js → services/aiService.js (panggil API AI, simpan histori ringkas per chat) → balas ke user`

**Reminder:**
`/reminder <menit> <pesan> → simpan ke db.json (chatId, dueAt) → jadwalkan setTimeout → saat bot restart, semua reminder pending dimuat ulang & dijadwalkan lagi → saat waktunya tiba, kirim pesan & hapus dari db`

**Broadcast:**
`/broadcast <pesan> (admin only, dicek middlewares/auth.js) → ambil semua ID user dari db.json → kirim satu-satu dengan jeda kecil → laporkan jumlah sukses/gagal`

## 4. Model Data (`db.json`)
```json
{
  "users": { "<userId>": { "id": 0, "username": "", "firstName": "", "lastSeen": "" } },
  "reminders": [ { "id": "uuid", "chatId": 0, "message": "", "dueAt": "ISO date" } ],
  "messageCount": 0
}
```
Kalau nanti pindah ke database sungguhan, hanya `services/db.js` yang berubah — fungsi (`upsertUser`, `addReminder`, dst.) dipertahankan sama supaya tidak menyentuh `commands/*`.

## 5. Integrasi Eksternal
- **AI**: endpoint kompatibel format OpenAI (`/chat/completions`), base URL dan model dikonfigurasi lewat `.env` supaya bisa ganti provider tanpa ubah kode.
- **Cuaca**: OpenWeatherMap REST API, key lewat `.env`.
- Kedua integrasi ini **opsional**: kalau key kosong, service melempar error yang jelas dan command menampilkannya sebagai pesan ramah ke user — bot tidak boleh crash karena key kosong.

## 6. Penanganan Error
- Setiap command dibungkus try/catch di levelnya sendiri; error tidak boleh menembus ke luar dan mematikan proses bot.
- `bot.catch()` global di `bot.js` sebagai jaring pengaman terakhir — log error lengkap ke console, balas user dengan pesan generik.
- Error dari service eksternal (AI/cuaca) harus punya pesan yang menjelaskan penyebab (mis. "key belum diisi") supaya gampang di-debug.

## 7. Keamanan
- Token & API key hanya lewat `.env`, tidak pernah di-hardcode atau ter-commit (`.gitignore` mencakup `.env` dan `data/db.json`).
- `/broadcast` dan `/stats` wajib dicek lewat `middlewares/auth.js`, bukan dicek manual di tiap command.
- Tidak menyimpan data sensitif user selain yang diperlukan (id, username, first name, last seen).

## 8. Deployment
- Mode default: long polling (`bot.launch()`), cocok dijalankan di VPS mana pun tanpa domain publik.
- Disarankan pakai process manager (pm2) agar bot auto-restart kalau crash.
- Webhook mode adalah opsi lanjutan, tidak wajib untuk versi awal.
