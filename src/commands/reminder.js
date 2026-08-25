const db = require('../services/db');
const reminderService = require('../services/reminderService');

function register(bot) {
  bot.command('reminder', async (ctx) => {
    const parts = ctx.message.text.split(' ').slice(1);
    if (parts.length < 2) {
      return ctx.reply('Gunakan: /reminder <menit> <pesan>\nContoh: /reminder 10 minum air');
    }
    const minutes = Number(parts[0]);
    if (!Number.isFinite(minutes) || minutes <= 0) {
      return ctx.reply('Menit harus angka lebih dari 0.');
    }
    const message = parts.slice(1).join(' ');
    const dueAt = new Date(Date.now() + minutes * 60000).toISOString();
    const reminder = db.addReminder({ chatId: ctx.chat.id, message, dueAt });
    reminderService.schedule(bot, reminder);
    ctx.reply(`✅ Pengingat disetel ${minutes} menit lagi:\n${message}`);
  });
}

module.exports = { register };
