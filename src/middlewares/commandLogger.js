import { logger } from '../core/logger.js';

export function commandLogger() {
  return async (ctx, next) => {
    const start = Date.now();
    try { await next(); } catch { /* sudah ditangani errorHandler */ }
    const cmd = ctx.message?.text?.split(/\s+/)[0] || ctx.updateType || 'unknown';
    logger.debug({ userId: ctx.from?.id, cmd, ms: Date.now() - start }, 'command');
  };
}
