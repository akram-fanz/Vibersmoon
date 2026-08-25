const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');
const EMPTY = { users: {}, reminders: [], messageCount: 0 };
const MAX_HISTORY = 20;

function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify(EMPTY, null, 2));
}

function read() {
  ensure();
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch (e) {
    console.error('db korup, reset ke kosong:', e.message);
    return JSON.parse(JSON.stringify(EMPTY));
  }
}

function write(data) {
  ensure();
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function upsertUser({ id, username, firstName }) {
  const data = read();
  const now = new Date().toISOString();
  if (!data.users[id]) {
    data.users[id] = { id, username: username || '', firstName: firstName || '', lastSeen: now, history: [] };
  } else {
    data.users[id].username = username || data.users[id].username;
    data.users[id].firstName = firstName || data.users[id].firstName;
    data.users[id].lastSeen = now;
  }
  write(data);
}

function getUser(id) {
  return read().users[id];
}

function getAllUsers() {
  return Object.values(read().users);
}

function incrementMessageCount() {
  const data = read();
  data.messageCount = (data.messageCount || 0) + 1;
  write(data);
}

function addReminder({ chatId, message, dueAt }) {
  const data = read();
  const reminder = { id: crypto.randomUUID(), chatId, message, dueAt };
  data.reminders.push(reminder);
  write(data);
  return reminder;
}

function getPendingReminders() {
  return read().reminders;
}

function removeReminder(id) {
  const data = read();
  data.reminders = data.reminders.filter((r) => r.id !== id);
  write(data);
}

function getStats() {
  const data = read();
  return {
    userCount: Object.keys(data.users).length,
    reminderCount: data.reminders.length,
    messageCount: data.messageCount || 0,
  };
}

function getHistory(userId) {
  return read().users[userId]?.history || [];
}

function appendHistory(userId, role, content) {
  const data = read();
  const u = data.users[userId];
  if (!u) return;
  if (!u.history) u.history = [];
  u.history.push({ role, content });
  if (u.history.length > MAX_HISTORY) u.history = u.history.slice(-MAX_HISTORY);
  write(data);
}

function resetHistory(userId) {
  const data = read();
  if (data.users[userId]) data.users[userId].history = [];
  write(data);
}

function setUserDoc(userId, name, content) {
  const data = read();
  if (!data.users[userId]) {
    data.users[userId] = { id: userId, username: '', firstName: '', lastSeen: new Date().toISOString(), history: [] };
  }
  data.users[userId].doc = { name, content, at: new Date().toISOString() };
  write(data);
}

function getUserDoc(userId) {
  return read().users[userId]?.doc || null;
}

function clearUserDoc(userId) {
  const data = read();
  const u = data.users[userId];
  if (u) u.doc = null;
  write(data);
}

module.exports = {
  upsertUser,
  getUser,
  getAllUsers,
  incrementMessageCount,
  addReminder,
  getPendingReminders,
  removeReminder,
  getStats,
  getHistory,
  appendHistory,
  resetHistory,
  setUserDoc,
  getUserDoc,
  clearUserDoc,
};
