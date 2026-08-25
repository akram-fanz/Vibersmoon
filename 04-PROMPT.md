# Prompt Kickoff untuk AI Agent

Salin dan tempel prompt di bawah ini sebagai pesan pertama ke AI coding agent (Claude Code, dsb.) setelah tiga dokumen lain (`01-PRD.md`, `02-DESIGN.md`, `03-AGENT_RULES.md`) berada di root repo.

---

```
Kamu akan membangun "Bot Telegram Serba Bisa" — bot Node.js berbasis Telegraf
dengan fitur chat AI, cuaca, reminder, dan broadcast admin.

Sebelum menulis kode apa pun, baca tiga file berikut secara berurutan:
1. 01-PRD.md          — apa yang harus dibangun dan kenapa
2. 02-DESIGN.md        — arsitektur teknis, struktur folder, alur data
3. 03-AGENT_RULES.md   — batasan cara kerja kamu di project ini

Tugasmu:
1. Setup struktur project sesuai 02-DESIGN.md (folder src/commands,
   src/services, src/middlewares, dst).
2. Implementasikan semua fitur "Must Have" di 01-PRD.md, satu per satu,
   command demi command. Setelah tiap command selesai, jalankan
   `node --check` pada filenya sebelum lanjut ke command berikutnya.
3. Ikuti semua aturan di 03-AGENT_RULES.md, termasuk larangan hardcode
   secret dan urutan pendaftaran command fallback AI.
4. Buat file `.env.example` yang mencakup semua environment variable
   yang dipakai (BOT_TOKEN, ADMIN_IDS, dan key untuk fitur AI/cuaca —
   tandai jelas mana yang wajib dan mana yang opsional).
5. Buat README.md singkat: cara install, cara isi .env, cara menjalankan.
6. Di akhir, laporkan ke saya: daftar file yang dibuat, environment
   variable apa saja yang perlu saya isi manual, dan asumsi apa pun
   yang kamu ambil karena PRD/DESIGN kurang detail di suatu bagian.

Kalau menemukan requirement di PRD yang ambigu atau kurang jelas,
tanya saya dulu sebelum menebak — terutama untuk hal yang disebutkan
di bagian "Wajib Konfirmasi ke User Dulu" pada 03-AGENT_RULES.md.

Mulai dari langkah 1.
```

---

## Cara Pakai Alur Ini
1. **Isi/sesuaikan** `01-PRD.md` — ini kontrak fitur, paling sering diedit manusia.
2. **Isi/sesuaikan** `02-DESIGN.md` — kalau PRD berubah signifikan, cek ulang apakah desain masih relevan.
3. **`03-AGENT_RULES.md`** biasanya jarang berubah — ini pagar pembatas, bukan spesifikasi fitur.
4. **Jalankan prompt kickoff** di atas ke AI agent.
5. **Review hasil** agent (lihat "Definisi Selesai" di `03-AGENT_RULES.md` sebagai checklist).
6. Kalau perlu revisi, beri instruksi spesifik ke agent — tidak perlu ulangi seluruh prompt kickoff, cukup rujuk bagian PRD/DESIGN yang relevan.

Pola empat dokumen ini bisa dipakai ulang untuk project lain: ganti isi PRD & DESIGN sesuai kebutuhan, aturan agent biasanya cukup disesuaikan sedikit saja.
