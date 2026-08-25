const fs = require('fs');
const path = require('path');

const MUSIC_DIR = path.join(__dirname, '..', '..', 'music');

function findMusic() {
  if (!fs.existsSync(MUSIC_DIR)) return [];
  return fs
    .readdirSync(MUSIC_DIR)
    .filter((f) => /\.(mp3|ogg|m4a|wav)$/i.test(f))
    .map((f) => path.join(MUSIC_DIR, f));
}

async function sendLocalMusic(ctx) {
  const files = findMusic();
  if (files.length === 0) {
    return ctx.reply('⚠️ Belum ada file musik di folder `music/`. Taruh file `.mp3` lalu coba lagi.');
  }
  for (const file of files) {
    try {
      await ctx.replyWithAudio({ source: file });
    } catch (e) {
      ctx.reply(`❌ Gagal mengirim ${path.basename(file)}: ${e.message}`);
    }
  }
}

function register(bot) {
  bot.command('musik', (ctx) => sendLocalMusic(ctx));
  bot.action('menu_musik', (ctx) => {
    ctx.answerCbQuery();
    sendLocalMusic(ctx);
  });
}

module.exports = { register, sendLocalMusic };
