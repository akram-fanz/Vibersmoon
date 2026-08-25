# Aturan Agent — Bot Telegram Serba Bisa

Dokumen ini adalah "kontrak kerja" untuk AI coding agent (Claude Code atau sejenisnya) yang membangun atau mengembangkan project ini. Taruh file ini sebagai `CLAUDE.md` / `AGENTS.md` di root repo supaya otomatis terbaca agent.

## 1. Sumber Kebenaran (Priority Order)
Kalau ada instruksi yang bentrok, urutan prioritasnya:
1. Instruksi langsung dari user di percakapan saat ini.
2. `01-PRD.md` — apa yang harus dibangun.
3. `02-DESIGN.md` — bagaimana cara membangunnya.
4. Dokumen ini — batasan cara kerja.

Kalau PRD dan DESIGN ternyata bentrok satu sama lain, **agent wajib berhenti dan tanya ke user**, bukan menebak.

## 2. Yang Boleh Dilakukan Agent Tanpa Tanya
- Menambah command baru di `src/commands/` mengikuti pola yang sudah ada.
- Memperbaiki bug pada fitur yang sudah ada.
- Menambah komentar, memperbaiki penamaan variabel, refactor kecil yang tidak mengubah perilaku.
- Menambah validasi input yang lebih ketat.
- Menulis/update dokumentasi (README, komentar kode).

## 3. Yang Wajib Konfirmasi ke User Dulu
- Mengubah struktur folder inti (`commands/`, `services/`, `middlewares/`).
- Mengganti dependency utama (mis. Telegraf ke library lain, atau ganti sistem penyimpanan data).
- Menambah fitur yang **tidak ada** di PRD.
- Mengubah cara autentikasi admin.
- Apa pun yang menyentuh penanganan secret/token.

## 4. Larangan Keras
- **Jangan pernah** hardcode token bot, API key, atau kredensial apa pun langsung di kode. Semua lewat `.env` / `config.js`.
- **Jangan** commit file `.env` atau `data/db.json` — pastikan selalu ada di `.gitignore`.
- **Jangan** membuat command baru yang mendengarkan `bot.on('text', ...)` tanpa cek `ctx.message.text.startsWith('/')` — akan bentrok dengan fallback AI yang sudah ada.
- **Jangan** menghapus penanganan error (try/catch) yang sudah ada demi "menyederhanakan kode".
- **Jangan** menambah dependency baru tanpa alasan jelas — cek dulu apakah kebutuhan bisa diselesaikan dengan yang sudah ada.

## 5. Konvensi Kode
- Bahasa pesan ke user: Bahasa Indonesia, nada ramah dan ringkas.
- Bahasa penamaan variabel/fungsi/komentar kode: Bahasa Inggris (standar industri), kecuali string yang tampil ke user.
- Satu file command = satu fitur. Kalau sebuah fitur butuh >150 baris, pecah logikanya ke `services/`.
- Semua command baru wajib diekspor lewat pola `{ register }` yang dipanggil dari `bot.js`, konsisten dengan command yang sudah ada.
- Command fallback (yang menangkap semua teks bebas, misal untuk AI) **selalu didaftarkan paling terakhir** di `bot.js`.

## 6. Definisi "Selesai" (Definition of Done)
Sebuah fitur dianggap selesai kalau:
- [ ] Sesuai dengan salah satu item di `01-PRD.md`.
- [ ] Ada penanganan error yang jelas (tidak membuat bot crash).
- [ ] Tidak menyimpan/mencatat data sensitif yang tidak perlu.
- [ ] Sudah dicek sintaksnya (`node --check`) dan, kalau memungkinkan, dites jalan minimal sekali.
- [ ] README/`/help` diupdate kalau menambah command baru yang user-facing.

## 7. Cara Agent Melapor ke User
Setiap selesai satu batch pekerjaan, agent merangkum:
1. Apa yang berubah (daftar file, bukan isi lengkap).
2. Apakah ada langkah manual yang perlu dilakukan user (mis. isi `.env`, install dependency baru).
3. Apakah ada asumsi yang diambil karena instruksi kurang detail.

## 8. Testing Minimum
- Setiap command baru dicek: sintaks valid, bisa di-require tanpa error, dan skenario input kosong/tidak valid ditangani dengan pesan yang jelas (bukan crash atau silent fail).
- Untuk perubahan pada `services/`, pastikan behavior tetap sama dari sisi `commands/` yang memanggilnya (jangan ubah signature fungsi tanpa update semua pemanggilnya).
