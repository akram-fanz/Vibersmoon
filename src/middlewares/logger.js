const db = require('../services/db');

function logger() {
  return (ctx, next) => {
    try {
      db.incrementMessageCount();
      if (ctx.from) {
        db.upsertUser({
          id: ctx.from.id,
          username: ctx.from.username || '',
          firstName: ctx.from.first_name || '',
        });
      }
    } catch (e) {
      console.error('logger error:', e.message);
    }
    return next();
  };
}

module.exports = { logger };
