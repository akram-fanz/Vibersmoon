import Database from 'better-sqlite3';
import fs from 'fs';
import config from '../core/config.js';
import { logger } from '../core/logger.js';

const SCHEMA_VERSION = '3';
fs.mkdirSync(config.dataDir, { recursive: true });
fs.mkdirSync(config.tmpDir, { recursive: true });

export const db = new Database(config.dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const currentVersion = db.prepare('SELECT value FROM settings WHERE key = ?').get('schema_version')?.value;
if (currentVersion !== SCHEMA_VERSION) {
  db.exec(fs.readFileSync(config.schemaPath, 'utf8'));
  db.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime(\'now\')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at')
    .run('schema_version', SCHEMA_VERSION);
  logger.info({ version: SCHEMA_VERSION }, 'Database schema initialized/upgraded');
}

// ---------- users ----------
export function touchUser(user) {
  const today = new Date().toISOString().slice(0, 10);
  const existing = db.prepare('SELECT id, daily_reset_date FROM users WHERE id = ?').get(user.id);
  if (!existing) {
    db.prepare(`INSERT INTO users (id, username, first_name, role, last_seen, daily_reset_date)
      VALUES (?, ?, ?, ?, datetime('now'), ?)`)
      .run(user.id, user.username || null, user.first_name || null, config.adminIds.includes(user.id) ? 'admin' : 'user', today);
    db.prepare('INSERT OR IGNORE INTO user_economy (user_id, updated_at) VALUES (?, datetime(\'now\'))').run(user.id);
    return;
  }
  db.prepare(`UPDATE users SET last_seen = datetime('now'), username = ?, first_name = ?,
    daily_downloads = CASE WHEN daily_reset_date != ? THEN 0 ELSE daily_downloads END,
    daily_reset_date = CASE WHEN daily_reset_date != ? THEN ? ELSE daily_reset_date END
    WHERE id = ?`)
    .run(user.username || null, user.first_name || null, today, today, today, user.id);
}

export function isBanned(userId) {
  return !!db.prepare('SELECT banned FROM users WHERE id = ?').get(userId)?.banned;
}

export function isAdmin(userId) {
  if (config.adminIds.includes(userId)) return true;
  return db.prepare('SELECT role FROM users WHERE id = ?').get(userId)?.role === 'admin';
}

export function setRole(userId, role) {
  db.prepare('INSERT INTO users (id, role) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET role = excluded.role').run(userId, role);
}

export function setBanned(userId, banned) {
  db.prepare('INSERT INTO users (id, banned) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET banned = excluded.banned').run(userId, banned ? 1 : 0);
}

export function listUsers(limit = 5000) {
  return db.prepare('SELECT id FROM users WHERE banned = 0 LIMIT ?').all(limit).map(r => r.id);
}

// ---------- quota ----------
export function getQuota(userId) {
  const row = db.prepare('SELECT daily_downloads FROM users WHERE id = ?').get(userId);
  return { used: row?.daily_downloads ?? 0, limit: config.downloadQuota };
}

export function useDownloadQuota(userId) {
  const q = getQuota(userId);
  if (q.used >= q.limit) return { ok: false, ...q };
  db.prepare('UPDATE users SET daily_downloads = daily_downloads + 1 WHERE id = ?').run(userId);
  return { ok: true, used: q.used + 1, limit: q.limit };
}

// ---------- settings / chats ----------
export function getSetting(key, fallback = null) {
  return db.prepare('SELECT value FROM settings WHERE key = ?').get(key)?.value ?? fallback;
}

export function setSetting(key, value) {
  db.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime(\'now\')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at')
    .run(key, String(value));
}

export function registerKnownChat(chatId) {
  const cur = JSON.parse(getSetting('known_chats', '[]'));
  if (!cur.includes(chatId)) {
    cur.push(chatId);
    setSetting('known_chats', JSON.stringify(cur.slice(-1000)));
  }
}

export function getKnownChats() {
  return JSON.parse(getSetting('known_chats', '[]'));
}

// ---------- job log ----------
export function logJob({ userId = null, type, detail = null, status, durationMs = null }) {
  db.prepare('INSERT INTO job_log (user_id, type, detail, status, duration_ms) VALUES (?, ?, ?, ?, ?)')
    .run(userId, type, detail ? JSON.stringify(detail).slice(0, 4000) : null, status, durationMs);
}

// ---------- AI chat history ----------
export function getHistory(userId, limit = 20) {
  const rows = db.prepare('SELECT role, content FROM chat_history WHERE user_id = ? ORDER BY id DESC LIMIT ?').all(userId, limit);
  return rows.reverse();
}

export function appendHistory(userId, role, content) {
  db.prepare('INSERT INTO chat_history (user_id, role, content) VALUES (?, ?, ?)').run(userId, role, String(content).slice(0, 30000));
  const count = db.prepare('SELECT COUNT(*) c FROM chat_history WHERE user_id = ?').get(userId).c;
  if (count > 100) db.prepare('DELETE FROM chat_history WHERE user_id = ? AND id NOT IN (SELECT id FROM chat_history WHERE user_id = ? ORDER BY id DESC LIMIT 50)').run(userId, userId);
}

export function resetHistory(userId) {
  db.prepare('DELETE FROM chat_history WHERE user_id = ?').run(userId);
}

// ---------- reminders ----------
export function addReminder(id, userId, chatId, message, dueAt) {
  const due = typeof dueAt === 'string' ? Date.parse(dueAt) : dueAt;
  db.prepare('INSERT INTO reminders (id, user_id, chat_id, message, due_at) VALUES (?, ?, ?, ?, ?)').run(id, userId, chatId, message, due);
  return { id, user_id: userId, chat_id: chatId, message, due_at: due, sent: 0 };
}

export function dueReminders(maxDue = Date.now()) {
  return db.prepare('SELECT * FROM reminders WHERE sent = 0 AND due_at <= ?').all(maxDue);
}

export function markReminderSent(id) {
  db.prepare('UPDATE reminders SET sent = 1 WHERE id = ?').run(id);
}

export function listReminders(userId) {
  return db.prepare('SELECT * FROM reminders WHERE user_id = ? AND sent = 0 ORDER BY due_at ASC').all(userId);
}

export function cancelReminder(id, userId) {
  const r = db.prepare('DELETE FROM reminders WHERE id = ? AND user_id = ? AND sent = 0').run(id, userId);
  return r.changes > 0;
}

// ---------- notes ----------
export function addNote(userId, title, content) {
  const r = db.prepare('INSERT INTO notes (user_id, title, content) VALUES (?, ?, ?)').run(userId, title, content);
  return r.lastInsertRowid;
}

export function listNotes(userId) {
  return db.prepare('SELECT * FROM notes WHERE user_id = ? ORDER BY id DESC LIMIT 50').all(userId);
}

export function getNote(id, userId) {
  return db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?').get(id, userId);
}

export function deleteNote(id, userId) {
  return db.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?').run(id, userId).changes > 0;
}

// ---------- economy ----------
export function getEconomy(userId) {
  let row = db.prepare('SELECT * FROM user_economy WHERE user_id = ?').get(userId);
  if (!row) {
    db.prepare('INSERT INTO user_economy (user_id, updated_at) VALUES (?, datetime(\'now\'))').run(userId);
    row = db.prepare('SELECT * FROM user_economy WHERE user_id = ?').get(userId);
  }
  return row;
}

export function addPoints(userId, delta) {
  getEconomy(userId);
  db.prepare('UPDATE user_economy SET points = MAX(0, points + ?), updated_at = datetime(\'now\') WHERE user_id = ?').run(delta, userId);
  const row = db.prepare('SELECT points FROM user_economy WHERE user_id = ?').get(userId);
  const level = Math.floor(row.points / 500) + 1;
  db.prepare('UPDATE user_economy SET level = ? WHERE user_id = ?').run(level, userId);
  return { points: row.points, level };
}

export function spendPoints(userId, cost) {
  const row = db.prepare('SELECT points FROM user_economy WHERE user_id = ?').get(userId);
  if (!row || row.points < cost) return { ok: false, points: row?.points ?? 0 };
  db.prepare('UPDATE user_economy SET points = points - ?, updated_at = datetime(\'now\') WHERE user_id = ?').run(cost, userId);
  return { ok: true, points: row.points - cost };
}

export function claimDaily(userId) {
  const today = new Date().toISOString().slice(0, 10);
  const row = getEconomy(userId);
  if (row.last_daily === today) return { ok: false, reason: 'already', streak: row.streak };
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const streak = row.last_daily === yesterday ? row.streak + 1 : 1;
  const bonus = 50 + Math.min(streak, 30) * 10;
  db.prepare('UPDATE user_economy SET streak = ?, last_daily = ?, points = points + ?, updated_at = datetime(\'now\') WHERE user_id = ?')
    .run(streak, today, bonus, userId);
  return { ok: true, bonus, streak };
}

export function recordScore(userId, game, score, chatId = null) {
  db.prepare('INSERT INTO game_scores (user_id, game, score, chat_id) VALUES (?, ?, ?, ?)').run(userId, game, score, chatId);
  return addPoints(userId, score);
}

export function getLeaderboard({ game = null, chatId = null, limit = 10 } = {}) {
  const where = [];
  const params = [];
  if (game) { where.push('gs.game = ?'); params.push(game); }
  if (chatId) { where.push('gs.chat_id = ?'); params.push(chatId); }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  return db.prepare(`
    SELECT gs.user_id, COALESCE(u.username, u.first_name, gs.user_id) AS name, MAX(gs.score) AS best_score
    FROM game_scores gs LEFT JOIN users u ON u.id = gs.user_id
    ${clause}
    GROUP BY gs.user_id ORDER BY best_score DESC LIMIT ?`).all(...params, limit);
}

export function getTopPoints(limit = 10) {
  return db.prepare(`
    SELECT ue.user_id, COALESCE(u.username, u.first_name, ue.user_id) AS name, ue.points, ue.level, ue.streak
    FROM user_economy ue LEFT JOIN users u ON u.id = ue.user_id
    ORDER BY ue.points DESC LIMIT ?`).all(limit);
}

// ---------- groups ----------
export function getGroupSettings(chatId) {
  let row = db.prepare('SELECT * FROM group_settings WHERE chat_id = ?').get(chatId);
  if (!row) {
    db.prepare('INSERT INTO group_settings (chat_id, updated_at) VALUES (?, datetime(\'now\'))').run(chatId);
    row = db.prepare('SELECT * FROM group_settings WHERE chat_id = ?').get(chatId);
  }
  return row;
}

export function updateGroupSettings(chatId, patch) {
  getGroupSettings(chatId);
  const keys = Object.keys(patch);
  if (!keys.length) return;
  db.prepare(`UPDATE group_settings SET ${keys.map(k => `${k} = ?`).join(', ')}, updated_at = datetime('now') WHERE chat_id = ?`)
    .run(...keys.map(k => patch[k]), chatId);
}

// ---------- user docs (AI context) ----------
export function setUserDoc(userId, name, content) {
  db.prepare('INSERT INTO user_docs (user_id, name, content, updated_at) VALUES (?, ?, ?, datetime(\'now\')) ON CONFLICT(user_id) DO UPDATE SET name = excluded.name, content = excluded.content, updated_at = datetime(\'now\')').run(userId, name, String(content).slice(0, 300000));
}

export function getUserDoc(userId) {
  return db.prepare('SELECT name, content FROM user_docs WHERE user_id = ?').get(userId) || null;
}

export function clearUserDoc(userId) {
  db.prepare('DELETE FROM user_docs WHERE user_id = ?').run(userId);
}

// ---------- stats ----------
export function getStats() {
  const q = (sql) => db.prepare(sql).get();
  return {
    users: q('SELECT COUNT(*) c FROM users').c,
    banned: q('SELECT COUNT(*) c FROM users WHERE banned = 1').c,
    jobs24h: q(`SELECT COUNT(*) c FROM job_log WHERE created_at > datetime('now', '-1 day')`).c,
    jobsFailed24h: q(`SELECT COUNT(*) c FROM job_log WHERE status = 'failed' AND created_at > datetime('now', '-1 day')`).c,
    downloads24h: q(`SELECT COUNT(*) c FROM job_log WHERE type = 'download' AND status = 'success' AND created_at > datetime('now', '-1 day')`).c,
    gamesPlayed24h: q(`SELECT COUNT(*) c FROM game_scores WHERE played_at > datetime('now', '-1 day')`).c,
    remindersPending: q('SELECT COUNT(*) c FROM reminders WHERE sent = 0').c,
    notes: q('SELECT COUNT(*) c FROM notes').c,
  };
}

export function initDb() {
  return db;
}
