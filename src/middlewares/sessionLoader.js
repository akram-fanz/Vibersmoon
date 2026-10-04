import { config } from '../core/config.js';

export function sessionLoader() {
  return async (ctx, next) => {
    const uid = ctx.from?.id;
    if (uid && config.adminIds.includes(uid)) {
      // Load user doc jika ada
      try {
        const { db } = await import('../services/db.js');
        const doc = db.getUserDoc(uid);
        if (doc?.content) ctx.session = ctx.session || {};
      } catch { /* abaikan */ }
    }
    return next();
  };
}
