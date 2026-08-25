const db = require('../services/db');
const { adminOnly } = require('../middlewares/auth');

function register(bot) {
  bot.command('stats', adminOnly, (ctx) => {
    const stats = db.getStats();
    ctx.replyWithMarkdown(
      `📊 *Statistik Bot*\n\n` +
        `👥 User terdaftar: ${stats.userCount}\n` +
        `⏰ Reminder aktif: ${stats.reminderCount}\n` +
        `💬 Total pesan masuk: ${stats.messageCount}`
    );
  });
}

module.exports = { register };
