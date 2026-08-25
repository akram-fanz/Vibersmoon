# PRD — Bot Telegram Serba Bisa

## 1. Latar Belakang & Tujuan
Membangun bot Telegram berbasis Node.js yang bisa dipakai sehari-hari untuk chat AI, cek info cepat (cuaca), dan pengingat pribadi — dengan struktur kode yang mudah ditambah fitur baru oleh AI coding agent di kemudian hari.

**Tujuan utama:**
- User bisa ngobrol bebas dengan AI langsung dari Telegram.
- User bisa cek cuaca dan pasang reminder tanpa app tambahan.
- Admin bisa broadcast pengumuman ke semua user terdaftar.
- Codebase cukup rapi supaya AI agent lain bisa menambah fitur tanpa merombak struktur.

## 2. Target Pengguna
- **User umum**: siapa saja yang chat bot ini di Telegram, tidak perlu daftar akun terpisah.
- **Admin**: pemilik bot, punya akses ke `/broadcast` dan `/stats`.

## 3. Ruang Lingkup (Scope)

### Harus ada (Must Have)
| # | Fitur | Deskripsi |
|---|---|---|
| 1 | `/start` | Sambutan + menu tombol interaktif |
| 2 | `/help` | Daftar semua command |
| 3 | Chat AI | Balas otomatis lewat AI untuk pesan teks bebas |
| 4 | `/cuaca <kota>` | Info cuaca real-time |
| 5 | `/reminder <menit> <pesan>` | Pengingat sekali pakai, tetap jalan walau bot restart |
| 6 | `/broadcast` (admin) | Kirim pesan ke semua user terdaftar |
| 7 | Logging dasar | Catat user aktif & jumlah pesan masuk |
| 8 | Kirim foto → Vision AI | Analisis gambar via model vision; caption = pertanyaan, tanpa caption = deskripsi ringkas. Opsional: aktif hanya jika `AI_VISION_MODEL` diisi |
| 9 | `/search` | Cari lagu (iTunes: metadata + preview 30 dtk + link), video (YouTube: judul/durasi/views/link), gambar (DuckDuckGo: thumbnail + link sumber). Tanpa API key; layanan gambar unofficial bisa dibatasi provider |

### Sebaiknya ada (Should Have)
- `/reset` untuk hapus histori chat AI per user.
- `/stats` untuk admin lihat jumlah user & reminder aktif.
- Respons otomatis untuk stiker (placeholder, siap dikembangkan).

### Boleh menyusul (Could Have)
- Multi-bahasa.
- Tanya-jawab lanjutan multi-turn atas gambar yang sama.
- Integrasi kalender/to-do list.

### Di luar scope (Out of Scope) — versi ini
- Pembayaran / transaksi.
- Grup/channel management.
- Dashboard web terpisah.

## 4. User Stories
1. *Sebagai user*, saya ingin ketik pertanyaan bebas dan langsung dapat jawaban AI, supaya tidak perlu buka app lain.
2. *Sebagai user*, saya ingin cek cuaca kota tertentu dengan satu command, supaya cepat dan praktis.
3. *Sebagai user*, saya ingin dipasangkan pengingat dan tetap diingatkan walau bot sempat restart.
4. *Sebagai admin*, saya ingin mengirim pengumuman ke semua user sekaligus.
5. *Sebagai admin*, saya ingin tahu berapa banyak user aktif dan reminder yang sedang berjalan.

## 5. Kebutuhan Non-Fungsional
- **Bahasa respons**: Bahasa Indonesia sebagai default.
- **Reliabilitas**: reminder & data user tidak boleh hilang saat bot restart normal.
- **Keamanan**: token bot dan API key tidak boleh ter-hardcode atau ter-commit ke repo.
- **Rate limit**: broadcast harus punya jeda antar pengiriman agar tidak kena limit API Telegram.
- **Skalabilitas awal**: cukup untuk ratusan–ribuan user aktif; database boleh sederhana (file JSON), dengan interface yang gampang diganti ke database sungguhan nanti.
- **Observability**: setiap pesan masuk dan error harus tercatat di log.

## 6. Metrik Keberhasilan
- Bot merespons < 3 detik untuk command non-AI, < 10 detik untuk chat AI.
- Reminder terkirim tepat waktu (toleransi ±1 menit).
- Broadcast berhasil terkirim ke ≥95% user terdaftar (sisanya wajar gagal karena user block bot).
- Tidak ada crash yang membuat bot berhenti total (harus auto-recover atau minimal tidak nge-hang).

## 7. Asumsi & Ketergantungan
- User sudah punya akun Telegram.
- Fitur AI butuh API key eksternal (OpenAI atau kompatibel) — kalau kosong, fitur nonaktif dengan pesan jelas, bot tidak boleh crash.
- Fitur Vision AI butuh model vision tambahan (`AI_VISION_MODEL`) di endpoint yang sama — opsional, gagal dengan pesan jelas kalau kosong.
- Fitur cuaca butuh API key OpenWeatherMap — sama, opsional dan gagal dengan pesan jelas kalau kosong.
