import { db } from '../services/db.js';
import { logger } from '../core/logger.js';
import { config } from '../core/config.js';
import { formatMenu } from '../utils/keyboard.js';

export function registerStart(bot) {
  bot.command('start', async (ctx) => {
    db.touchUser(ctx.from);
    const text = `Halo ${ctx.from?.first_name || 'Bot'}! 👋

Vibersmoon bot aktif. Pilih menu di bawah:

${formatMenu()}`;
    await ctx.reply(text);
    db.logJob({ userId: ctx.from.id, type: 'command', detail: { cmd: '/start' }, status: 'success' });
    logger.info({ userId: ctx.from.id }, '/start');
  });

  bot.command('ping', async (ctx) => {
    const t = Date.now();
    const msg = await ctx.reply('Pong...');
    await ctx.api.editMessageText(ctx.chat.id, msg.message_id, `Pong: ${Date.now() - t}ms`);
  });
}
