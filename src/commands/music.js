import { InputFile } from 'grammy';
import fs from 'fs';
import path from 'path';

const MUSIC_DIR = path.join(process.cwd(), 'music');

function findMusic() {
  if (!fs.existsSync(MUSIC_DIR)) return [];
  return fs.readdirSync(MUSIC_DIR).filter((f) => /\.(mp3|ogg|m4a|wav)$/i.test(f)).map((f) => path.join(MUSIC_DIR, f));
}

async function sendLocalMusic(ctx) {
  const files = findMusic();
  if (!files.length) {
    return ctx.reply('⚠️ Belum ada file musik di folder `music/`.');
  }
  for (const file of files) {
    try {
      await ctx.replyWithAudio(new InputFile(file));
    } catch (e) {
      ctx.reply(`❌ Gagal mengirim ${path.basename(file)}: ${e.message}`);
    }
  }
}

export function register(bot) {
  bot.command('musik', (ctx) => sendLocalMusic(ctx));
  bot.callbackQuery('menu_musik', (ctx) => { ctx.answerCallbackQuery(); sendLocalMusic(ctx); });
}

export { sendLocalMusic };
