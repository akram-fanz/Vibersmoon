const db = require('../services/db');

function register(bot) {
  bot.command('reset', (ctx) => {
    db.resetHistory(ctx.from.id);
    db.clearUserDoc(ctx.from.id);
    ctx.reply('🧹 Histori chat AI dan dokumen Anda sudah dihapus.');
  });
}

module.exports = { register };
