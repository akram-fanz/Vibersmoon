import { db } from '../services/db.js';
import { config } from '../core/config.js';

export function register(bot) {
  bot.command('broadcast', async (ctx) => {
    if (!config.adminIds.includes(ctx.from?.id)) return ctx.reply('⛔ Perintah ini hanya untuk admin.');
    const text = ctx.message.text.split(' ').slice(1).join(' ').trim();
    if (!text) return ctx.reply('Gunakan: /broadcast <pesan>');
    const users = db.listUsers();
    let success = 0, failed = 0;
    for (const id of users) {
      try {
        await ctx.api.sendMessage(id, `📢 *Pengumuman:*\n${text}`, { parse_mode: 'Markdown' });
        success++;
      } catch { failed++; }
      await new Promise((r) => setTimeout(r, 100));
    }
    ctx.reply(`📡 Broadcast selesai.\n✅ Berhasil: ${success}\n❌ Gagal: ${failed}`);
  });
}
