import path from 'path';
import { fileURLToPath } from 'node:url';
import { InputFile } from 'grammy';
import { config } from '../core/config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MENU_IMG = path.join(__dirname, '..', '..', 'assets', 'menu.png');

export function showHelp(ctx) {
  const isAdmin = config.adminIds.includes(ctx.from?.id);
  let text =
    '📖 *Daftar Perintah*\n\n' +
    '/start - sambutan & menu\n' +
    '/help - pesan ini\n' +
    '/cuaca <kota> - info cuaca real-time\n' +
    '/reminder <menit> <pesan> - pengingat sekali pakai\n' +
    '/musik - kirim musik lokal\n' +
    '/dl <url> - unduh video TikTok/YouTube/Instagram\n' +
    '/search lagu|video|gambar <kata kunci>\n' +
    '/skills - lihat & pakai skill AI\n' +
    '💬 Chat bebas - dijawab AI\n' +
    '📄 Kirim dokumen teks - AI baca & jawab\n' +
    '🖼 Kirim foto (+caption) - AI analisis gambar\n';
  if (isAdmin) {
    text += '\n*Khusus Admin:*\n/broadcast <pesan>\n/stats\n/admin - panel admin';
  }
  ctx.replyWithPhoto(
    new InputFile(MENU_IMG),
    { caption: text, parse_mode: 'Markdown' }
  ).catch(() => ctx.reply(text, { parse_mode: 'Markdown' }));
}

export function register(bot) {
  bot.command('help', (ctx) => showHelp(ctx));
}
