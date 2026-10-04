import { db } from '../services/db.js';
import { config } from '../core/config.js';

export function register(bot) {
  bot.command('stats', async (ctx) => {
    if (!config.adminIds.includes(ctx.from?.id)) return ctx.reply('⛔ Perintah ini hanya untuk admin.');
    const s = db.getStats();
    ctx.replyWithMarkdown(
      '📊 *Statistik Bot*\n\n' +
        `👥 User terdaftar: ${s.users}\n` +
        `⏰ Reminder aktif: ${s.remindersPending}\n` +
        `💬 Total pesan masuk: ${s.messageCount}`
    );
  });
}
