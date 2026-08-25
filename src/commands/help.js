const path = require('path');
const { ADMIN_IDS } = require('../config');

const MENU_IMG = path.join(__dirname, '..', '..', 'assets', 'menu.png');

function showHelp(ctx) {
  const isAdmin = ADMIN_IDS.includes(ctx.from?.id);
  let text =
    `📖 *Daftar Perintah*\n\n` +
    `/start - sambutan & menu\n` +
    `/help - pesan ini\n` +
    `/cuaca <kota> - info cuaca real-time\n` +
    `/reminder <menit> <pesan> - pengingat sekali pakai\n` +
    `/musik - kirim musik lokal dari folder bot\n` +
    `/dl <url> - unduh video TikTok / YouTube / Instagram\n` +
    `/search lagu|video|gambar <kata kunci> - cari musik, video & gambar\n` +
    `/skills - lihat & pakai skill AI (mis. /plan)\n` +
    `/reset - hapus histori chat AI & dokumen\n` +
    `💬 Chat bebas - langsung dijawab AI\n` +
    `📄 Kirim dokumen teks - AI membacanya & menjawab pertanyaan Anda\n` +
    `🖼 Kirim foto (+ caption pertanyaan) - AI menganalisis gambarnya\n\n` +
    `Kirim stiker juga akan saya respons (placeholder).`;
  if (isAdmin) {
    text +=
      `\n\n*Khusus Admin:*\n` +
      `/broadcast <pesan> - kirim ke semua user terdaftar\n` +
      `/stats - lihat jumlah user & reminder aktif`;
  }

  ctx.replyWithPhoto(
    { source: MENU_IMG },
    {
      caption: text,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎵 Local Musik', callback_data: 'menu_musik' }],
          [{ text: '🔎 Search', callback_data: 'menu_search' }],
          [{ text: '🌤 Cek Cuaca', callback_data: 'menu_cuaca' }],
          [{ text: '⬇️ Downloader', callback_data: 'menu_downloader' }],
          [{ text: '🧠 Skills', callback_data: 'menu_skills' }],
        ],
      },
    }
  );
}

function register(bot) {
  bot.help((ctx) => showHelp(ctx));
  bot.command('help', (ctx) => showHelp(ctx));
}

module.exports = { register, showHelp };
