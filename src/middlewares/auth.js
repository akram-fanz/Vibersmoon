import { config } from '../core/config.js';

export function isAdmin(ctx) {
  const id = ctx.from?.id;
  return Boolean(id && config.adminIds.includes(id));
}

export async function adminOnly(ctx, next) {
  if (!isAdmin(ctx)) {
    return ctx.reply('⛔ Perintah ini hanya untuk admin.');
  }
  return next();
}
