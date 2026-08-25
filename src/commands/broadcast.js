const db = require('../services/db');
const { adminOnly } = require('../middlewares/auth');

function register(bot) {
  bot.command('broadcast', adminOnly, async (ctx) => {
    const text = ctx.message.text.split(' ').slice(1).join(' ').trim();
    if (!text) {
      return ctx.reply('Gunakan: /broadcast <pesan>');
    }
    const users = db.getAllUsers();
    let success = 0;
    let failed = 0;
    for (const u of users) {
      try {
        await ctx.telegram.sendMessage(u.id, `📢 *Pengumuman:*\n${text}`, { parse_mode: 'Markdown' });
        success++;
      } catch (e) {
        failed++;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    ctx.reply(`📡 Broadcast selesai.\n✅ Berhasil: ${success}\n❌ Gagal: ${failed}`);
  });
}

module.exports = { register };
