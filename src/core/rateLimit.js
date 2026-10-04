import { config } from './config.js';

export class RateLimiter {
  constructor(db) {
    this.db = db;
    this.addStmt = db.prepare('INSERT INTO rate_window (user_id, ts) VALUES (?, ?)');
    this.countStmt = db.prepare('SELECT COUNT(*) AS c FROM rate_window WHERE user_id = ? AND ts > ?');
    this.trimStmt = db.prepare('DELETE FROM rate_window WHERE user_id = ? AND ts <= ?');
  }

  // Returns { allowed, remaining, retryAfterSec }
  check(userId) {
    const now = Date.now();
    const windowStart = now - config.rateLimitWindowMs;
    this.trimStmt.run(userId, windowStart);
    const { c } = this.countStmt.get(userId, windowStart);
    if (c >= config.rateLimitMax) {
      const oldest = this.db
        .prepare('SELECT ts FROM rate_window WHERE user_id = ? ORDER BY ts ASC LIMIT 1')
        .get(userId);
      const retryAfterSec = oldest ? Math.ceil((oldest.ts + config.rateLimitWindowMs - now) / 1000) : 60;
      return { allowed: false, remaining: 0, retryAfterSec };
    }
    this.addStmt.run(userId, now);
    return { allowed: true, remaining: config.rateLimitMax - c - 1, retryAfterSec: 0 };
  }
}
