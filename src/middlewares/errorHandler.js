import { BotError } from '../core/errors.js';
import { config } from '../core/config.js';

export function errorHandler() {
  return async (ctx, next) => {
    try {
      await next();
    } catch (err) {
      if (err instanceof BotError) {
        ctx.reply(`❌ ${err.message}`).catch(() => {});
        return;
      }
      const id = Math.random().toString(36).slice(2, 8);
      try {
        await ctx.reply(`❌ Internal error (${id}). Coba lagi nanti.`);
      } catch { /* abaikan */ }
      try {
        await import('../core/logger.js').then(m => m.logger.error({ err: err.message, stack: err.stack, id }, 'Unhandled handler error'));
      } catch { /* abaikan */ }
    }
  };
}
