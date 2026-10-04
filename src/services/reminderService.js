import * as db from './db.js';
import logger from '../core/logger.js';

const timers = new Map();

export function schedule(bot, reminder) {
  const delay = reminder.due_at - Date.now();
  if (delay <= 0) return fire(bot, reminder);
  const t = setTimeout(() => fire(bot, reminder), Math.min(delay, 2 ** 31 - 1));
  timers.set(reminder.id, t);
}

async function fire(bot, reminder) {
  timers.delete(reminder.id);
  try {
    await bot.api.sendMessage(reminder.chat_id, `⏰ *Pengingat!*\n\n${reminder.message}`, { parse_mode: 'Markdown' });
  } catch (err) {
    logger.warn({ err: err?.message }, 'Gagal kirim reminder');
  } finally {
    db.markReminderSent(reminder.id);
  }
}

export function loadAll(bot) {
  const pending = db.dueReminders(Date.now() + 7 * 86400000); // muat yang <= 7 hari
  for (const r of pending) schedule(bot, r);
  const sweep = setInterval(() => {
    for (const r of db.dueReminders()) schedule(bot, r);
  }, 60_000);
  sweep.unref?.();
  return pending.length;
}

export function cancel(id) {
  const t = timers.get(id);
  if (t) { clearTimeout(t); timers.delete(id); return true; }
  return false;
}

const reminderService = { schedule, loadAll, cancel };
export default reminderService;
