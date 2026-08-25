<div align="center">

# 🤖 Bot Telegram Serba Bisa

**Asisten pribadi di Telegram — chat AI, cuaca, pengingat, musik, downloader & pencarian serba ada.**

[![Node](https://img.shields.io/badge/node-%E2%89%A518-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Telegraf](https://img.shields.io/badge/Telegraf-4.x-26A5E4?logo=telegram&logoColor=white)](https://telegraf.js.org)
[![Tests](https://img.shields.io/badge/tests-74%20passing-3DDC84)](scripts/test-all.js)
[![License](https://img.shields.io/badge/license-MIT-blue)](#-lisensi)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)](#-kontribusi)

</div>

---

## 📑 Daftar Isi

- [Fitur](#-fitur)
- [Tampilan Terminal](#-tampilan-terminal)
- [Instalasi](#-instalasi)
- [Konfigurasi](#️-konfigurasi-env)
- [Cara Pakai](#-cara-pakai)
- [Struktur Project](#-struktur-project)
- [Testing](#-testing)
- [Deploy VPS](#-deploy-vps)
- [Keamanan](#-keamanan)
- [Roadmap](#-roadmap)

## ✨ Fitur

| | Perintah | Deskripsi |
|---|---|---|
| 💬 | *chat bebas* | Ngobrol langsung dengan AI, lengkap dengan histori per user & dukungan dokumen |
| 🖼️ | *kirim foto* | **Vision AI** menganalisis gambar — caption = pertanyaanmu, tanpa caption = deskripsi otomatis |
| 🎵 | `/search lagu <judul>` | Cari lagu via iTunes → **1 contoh audio langsung bisa diputar di chat** + link lengkap |
| ▶️ | `/search video <judul>` | Cari video YouTube → judul, durasi, views, channel + tombol tonton |
| 🖼 | `/search gambar <kata>` | Cari gambar via DuckDuckGo → galeri thumbnail + link sumber |
| ⬇️ | `/dl <url>` | Unduh video TikTok / YouTube / Instagram (link biasa pun terdeteksi otomatis) |
| 🌤 | `/cuaca <kota>` | Cuaca real-time: suhu, kelembapan, angin |
| ⏰ | `/reminder <menit> <pesan>` | Pengingat sekali pakai — **tetap jalan walau bot restart** |
| 🧠 | `/skills` | Skill AI siap pakai, mis. `/plan <topik>` buat rencana langkah-demi-langkah |
| 🎶 | `/musik` | Putar musik lokal dari folder `music/` |
| 📄 | *kirim dokumen teks* | AI membaca txt/md/kode lalu menjawab pertanyaanmu berdasarkan isinya |
| 🔐 | `/broadcast`, `/stats` | Khusus admin: siaran massal & statistik bot |

> Semua fitur eksternal bersifat **opsional & anti-crash**: API key kosong? Bot tetap hidup dan memberi pesan yang jelas.

## 🖥 Tampilan Terminal

```text
███████╗███████╗██████╗ ██████╗  █████╗      ██████╗ ██╗███████╗ █████╗
██╔════╝██╔════╝██╔══██╗██╔══██╗██╔══██╗    ██╔══██╗██║██╔════╝██╔══██╗
███████╗█████╗  ██████╔╝██████╔╝███████║    ██████╔╝██║███████╗███████║
╚════██║██╔══╝  ██╔══██╗██╔══██╗██╔══██║    ██╔══██╗██║╚════██║██╔══██║
███████║███████╗██║  ██║██║  ██║██║  ██║    ██║  ██║██║███████║██║  ██║
╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝    ╚═╝  ╚═╝╚═╝╚══════╝╚═╝  ╚═╝

  ╭──────────────────────────────────────────╮
  │  🤖 Bot: @botkamu                        │
  │  📡 Mode: Long polling                   │
  │  👥 Admin: 1                             │
  │                                          │
  │  💬 Chat AI: ✅ Aktif                    │
  │  🧠 Vision AI: ✅ Aktif                  │
  │  🌤 Cuaca: ✅ Aktif                      │
  │  📥 Downloader: ⚠️ Nonaktif              │
  │  🎵 Musik: 1 file                        │
  │  ⏰ Reminder: 0 dimuat                   │
  ╰──────────────────────────────────────────╯
```

## 🚀 Instalasi

```bash
# 1. Clone repo
git clone https://github.com/<username>/bot-telegram-serba-bisa.git
cd bot-telegram-serba-bisa

# 2. Install dependency
npm install

# 3. Siapkan konfigurasi
cp .env.example .env   # Windows: copy .env.example .env
```

Lalu isi `.env` (lihat tabel di bawah), dan taruh file `.mp3` apa saja di folder `music/` jika mau fitur `/musik`.

## ⚙️ Konfigurasi (.env)

| Variabel | Wajib | Keterangan |
|---|---|---|
| `BOT_TOKEN` | ✅ | Token bot dari [@BotFather](https://t.me/BotFather) |
| `ADMIN_IDS` | ✅ | ID Telegram admin (pisah koma). Cek ID lewat [@userinfobot](https://t.me/userinfobot) |
| `AI_BASE_URL` | ❌ | Endpoint kompatibel OpenAI, mis. `https://api.openai.com/v1` atau Groq `https://api.groq.com/openai/v1` |
| `AI_API_KEY` | ❌ | API key layanan AI |
| `AI_MODEL` | ❌ | Model teks, default `gpt-3.5-turbo` |
| `AI_VISION_MODEL` | ❌ | Model vision untuk analisis foto, mis. `gpt-4o-mini`. Kosong = nonaktif |
| `WEATHER_API_KEY` | ❌ | API key gratis dari [OpenWeatherMap](https://openweathermap.org/api) |
| `YT_DL_API_URL` | ❌ | Endpoint downloader YouTube |
| `IG_DL_API_URL` | ❌ | Endpoint downloader Instagram |

Pencarian lagu/video/gambar (`/search`) **tidak butuh API key sama sekali** 🎉

## 🕹 Cara Pakai

```text
/start                      → menu utama dengan tombol interaktif
/help                       → daftar semua perintah

halo bot, apa itu nodejs?   → langsung dijawab AI
/cuaca Jakarta              → cuaca Jakarta sekarang
/reminder 30 minum air      → diingatkan 30 menit lagi

/search lagu despacito      → dapat file audio contoh + link
/search video tutorial node → daftar video YouTube
/search gambar kucing oren  → galeri gambar + sumbernya
/search kucing              → bot minta pilih jenisnya dulu

/dl https://vt.tiktok.com/x → unduh video TikTok
kirim foto + caption        → "apa isi gambar ini?" → dijawab AI vision
kirim file catatan.txt      → AI jadi konteks, tinggal bertanya
```

## 📂 Struktur Project

```text
src/
├── index.js            # entry point + banner CLI + graceful shutdown
├── banner.js           # tampilan startup terminal
├── bot.js              # rakit instance bot & urutan registrasi command
├── config.js           # baca & validasi environment variable
├── commands/           # 1 file = 1 fitur (presentasi saja)
├── middlewares/        # logger (catat user/pesan), auth (guard admin)
├── services/           # semua panggilan eksternal & akses data (tanpa ctx)
└── utils/              # formatter HTML/teks untuk balasan panjang
data/db.json            # penyimpanan sederhana (user, reminder, histori)
music/                  # taruh file mp3 untuk /musik
scripts/test-all.js     # test suite seluruh fitur
```

**Prinsip arsitektur:** `commands/` hanya menangani parsing & tampilan; semua logika bisnis ada di `services/` yang bebas dari objek Telegram — gampang dites dan gampang ditambah fitur baru.

## 🧪 Testing

Seluruh fitur dites otomatis lewat update Telegram sintetis (mock API):

```bash
npm test
```

```text
==============================
TOTAL: 74 lulus, 0 gagal
```

## 🌐 Deploy VPS

Mode default sudah long polling — tanpa domain & SSL:

```bash
npx pm2 start src/index.js --name bot-telegram
npx pm2 save && npx pm2 startup   # auto-restart saat reboot
```

## 🔒 Keamanan

- Token & API key **hanya** lewat `.env` — tidak pernah di-commit (sudah diblokir `.gitignore`)
- Gambar dikirim ke AI sebagai base64, bukan URL Telegram (mencegah token bocor ke pihak ketiga)
- Perintah admin dicek lewat middleware, bukan if manual

## 🗺 Roadmap

- [ ] Tanya-jawab lanjutan atas gambar yang sama
- [ ] Multi-bahasa respons
- [ ] To-do list / kalender
- [ ] Pindah storage JSON → database sungguhan

## 🤝 Kontribusi

Fork → branch baru (`feat/fiturkeren`) → commit → Pull Request. Untuk menambah command baru, cukup buat 1 file di `commands/`, 1 service jika perlu, lalu daftarkan di `bot.js`.

## 📜 Lisensi

MIT — bebas dipakai dan dimodifikasi.
