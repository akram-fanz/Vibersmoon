import { randomUUID } from 'node:crypto';
import { db } from '../services/db.js';
import { schedule } from '../services/reminderService.js';

export function register(bot) {
  bot.command('reminder', async (ctx) => {
    const parts = ctx.message.text.split(' ').slice(1);
    if (parts.length < 2) return ctx.reply('Gunakan: /reminder <menit> <pesan>\nContoh: /reminder 10 minum air');
    const minutes = Number(parts[0]);
    if (!Number.isFinite(minutes) || minutes <= 0) return ctx.reply('Menit harus angka lebih dari 0.');
    const message = parts.slice(1).join(' ');
    const dueAt = new Date(Date.now() + minutes * 60000).toISOString();
    const reminder = db.addReminder(randomUUID(), ctx.from.id, ctx.chat.id, message, dueAt);
    schedule(bot, reminder);
    ctx.reply(`✅ Pengingat disetel ${minutes} menit lagi:\n${message}`);
  });
}
