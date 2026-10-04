import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { initDb, upsertUser, getAllUsers, addReminder, dueReminders, markReminderSent } from '../src/services/db.js';

const root = process.cwd();
const legacyPath = path.join(root, 'data', 'db.json');
const targetPath = path.join(root, 'data', 'bot.db');

if (!fs.existsSync(legacyPath)) {
  console.log('Legacy DB tidak ditemukan, schema SQLite tetap dibuat.');
  initDb(targetPath);
  process.exit(0);
}

const legacy = JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
const db = initDb(targetPath);
const migrate = db.transaction(() => {
  const users = legacy.users && typeof legacy.users === 'object' ? Object.values(legacy.users) : [];
  for (const user of users) {
    const id = Number(user.id);
    if (!Number.isSafeInteger(id)) continue;
    upsertUser(id, user.username || '', user.firstName || user.first_name || '');
    if (Array.isArray(user.history)) {
      const insert = db.prepare('INSERT INTO chat_history (user_id, role, content) VALUES (?, ?, ?)');
      for (const item of user.history.slice(-20)) {
        if (item?.role && typeof item.content === 'string') insert.run(id, item.role, item.content);
      }
    }
  }

  const reminders = Array.isArray(legacy.reminders) ? legacy.reminders : [];
  for (const item of reminders) {
    const chatId = Number(item.chatId);
    const dueAt = typeof item.dueAt === 'number' ? item.dueAt : Date.parse(item.dueAt);
    if (!Number.isSafeInteger(chatId) || !Number.isFinite(dueAt)) continue;
    const owner = Number(item.userId) || chatId;
    upsertUser(owner, '', '');
    const id = String(item.id || crypto.randomUUID());
    try { addReminder(id, owner, chatId, String(item.message || ''), dueAt); } catch { /* idempotent rerun */ }
  }

  db.prepare("INSERT INTO settings (key, value) VALUES ('legacy_message_count', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value")
    .run(String(Number(legacy.messageCount) || 0));
});

migrate();
console.log(`Migrasi selesai: ${targetPath}`);
