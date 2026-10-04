import { logger as log } from '../core/logger.js';

export function logger() {
  return async (ctx, next) => {
    const start = Date.now();
    await next();
    log.debug({ userId: ctx.from?.id, ms: Date.now() - start }, 'update handled');
  };
}
