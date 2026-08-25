const path = require('path');

const MENU_IMG = path.join(__dirname, '..', '..', 'assets', 'menu.png');

function register(bot) {
  bot.start((ctx) => {
    const name = ctx.from.first_name || 'sobat';
    ctx.replyWithPhoto(
      { source: MENU_IMG },
      {
        caption:
          `Hai ${name}! 👋\nSaya bot serba bisa. Yang bisa saya lakukan:\n\n` +
          `/help - lihat semua perintah\n` +
          `/cuaca <kota> - cek cuaca\n` +
          `/reminder <menit> <pesan> - pasang pengingat\n` +
          `/musik - putar musik lokal\n` +
          `Atau langsung chat saja, saya balas dengan AI.`,
        reply_markup: {
          inline_keyboard: [
          [{ text: '📖 Bantuan', callback_data: 'menu_help' }],
          [{ text: '🔎 Search', callback_data: 'menu_search' }],
          [{ text: '🌤 Cek Cuaca', callback_data: 'menu_cuaca' }],
          [{ text: '🎵 Local Musik', callback_data: 'menu_musik' }],
          [{ text: '⬇️ Downloader', callback_data: 'menu_downloader' }],
          [{ text: '🧠 Skills', callback_data: 'menu_skills' }],
          ],
        },
      }
    );
  });

  bot.action('menu_help', (ctx) => {
    ctx.answerCbQuery();
    ctx.reply('Ketik /help untuk daftar lengkap perintah.');
  });

  bot.action('menu_cuaca', (ctx) => {
    ctx.answerCbQuery();
    ctx.reply('Ketik /cuaca <nama kota>, contoh: /cuaca Jakarta');
  });
}

module.exports = { register };
