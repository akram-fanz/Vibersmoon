import { db, setBanned } from '../services/db.js';
import { config } from '../core/config.js';
import { isAdmin } from '../middlewares/auth.js';

export function register(bot) {
  bot.command('admin', async (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply('⛔ Perintah ini hanya untuk admin.');
    ctx.reply('🔧 Panel admin:\n/dban <id> - blokir\n/unban <id> - buka blokir\n/broadcast <teks> - kirim semua');
  });

  bot.command('dban', async (ctx) => {
    if (!isAdmin(ctx)) return;
    const id = Number((ctx.message.text || '').split(' ').slice(1).join(' ').trim());
    if (!Number.isFinite(id)) return ctx.reply('Gunakan: /dban <user_id>');
    setBanned(id, true);
    ctx.reply(`⛔ User ${id} diblokir.`);
  });

  bot.command('unban', async (ctx) => {
    if (!isAdmin(ctx)) return;
    const id = Number((ctx.message.text || '').split(' ').slice(1).join(' ').trim());
    if (!Number.isFinite(id)) return ctx.reply('Gunakan: /unban <user_id>');
    setBanned(id, false);
    ctx.reply(`✅ User ${id} dibuka blokirnya.`);
  });
}
