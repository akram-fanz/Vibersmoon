const db = require('./db');

const timers = new Map();

async function deliver(bot, reminder) {
  try {
    await bot.telegram.sendMessage(reminder.chatId, `⏰ *Pengingat:*\n${reminder.message}`, { parse_mode: 'Markdown' });
  } catch (e) {
    console.error('Gagal mengirim reminder', reminder.id, e.message);
  } finally {
    db.removeReminder(reminder.id);
    timers.delete(reminder.id);
  }
}

function schedule(bot, reminder) {
  const delay = new Date(reminder.dueAt).getTime() - Date.now();
  if (delay <= 0) {
    deliver(bot, reminder);
    return;
  }
  const t = setTimeout(() => deliver(bot, reminder), delay);
  timers.set(reminder.id, t);
}

function loadAll(bot) {
  const pending = db.getPendingReminders();
  for (const r of pending) schedule(bot, r);
  return pending.length;
}

module.exports = { schedule, loadAll };
