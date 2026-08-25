const { ADMIN_IDS } = require('../config');

function isAdmin(ctx) {
  return ADMIN_IDS.includes(ctx.from?.id);
}

function adminOnly(ctx, next) {
  if (!isAdmin(ctx)) {
    return ctx.reply('⛔ Perintah ini hanya untuk admin.');
  }
  return next();
}

module.exports = { isAdmin, adminOnly };
