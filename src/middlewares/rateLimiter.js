import { config } from '../core/config.js';
import logger from '../core/logger.js';

export function rateLimiterMiddleware() {
  const hits = new Map(); // userId -> [{ ts }]
  setInterval(() => {
    const cutoff = Date.now() - 10 * 60_000;
    for (const [id, arr] of hits) {
      const kept = arr.filter((t) => t > cutoff);
      if (kept.length) hits.set(id, kept); else hits.delete(id);
    }
  }, 5 * 60_000).unref?.();

  return async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId) return next();
    const now = Date.now();
    const windowMs = config.rateLimitWindowMs || 60_000;
    const max = config.rateLimitMax || 10;
    const arr = (hits.get(userId) || []).filter((t) => t > now - windowMs);
    if (arr.length >= max) {
      const retryAfter = Math.ceil((arr[0] + windowMs - now) / 1000) || 30;
      logger.warn({ userId, retryAfter }, 'Rate limited');
      return ctx.reply(`⏳ Pelan dong, coba lagi ${retryAfter}s lagi.`);
    }
    arr.push(now);
    hits.set(userId, arr);
    return next();
  };
}

export function initRateLimiter() {
  // no-op: state disiapkan saat middleware dibuat
}
