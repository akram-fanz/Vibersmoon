CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT,
  first_name TEXT,
  role TEXT DEFAULT 'user',
  banned INTEGER DEFAULT 0,
  daily_downloads INTEGER DEFAULT 0,
  daily_reset_date TEXT,
  last_seen TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_economy (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  points INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  streak INTEGER DEFAULT 0,
  last_daily TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS game_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  game TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  chat_id INTEGER,
  played_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS job_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  type TEXT NOT NULL,
  detail TEXT,
  status TEXT NOT NULL,
  duration_ms INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  chat_id INTEGER NOT NULL,
  message TEXT NOT NULL,
  due_at INTEGER NOT NULL,
  sent INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS group_settings (
  chat_id INTEGER PRIMARY KEY,
  welcome_message TEXT,
  anti_link INTEGER DEFAULT 0,
  anti_spam INTEGER DEFAULT 0,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS chat_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rate_window (
  user_id INTEGER NOT NULL,
  ts INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_game_scores_user ON game_scores(user_id, game);
CREATE INDEX IF NOT EXISTS idx_job_log_user ON job_log(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders(due_at, sent);
CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_history_user ON chat_history(user_id, id);
CREATE INDEX IF NOT EXISTS idx_rate_window ON rate_window(user_id, ts);

CREATE TABLE IF NOT EXISTS user_docs (
  user_id INTEGER PRIMARY KEY,
  name TEXT,
  content TEXT,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_user_docs ON user_docs(user_id);
