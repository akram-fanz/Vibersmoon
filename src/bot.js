const { Telegraf } = require('telegraf');
const config = require('./config');
const { logger } = require('./middlewares/logger');

const startCmd = require('./commands/start');
const helpCmd = require('./commands/help');
const weatherCmd = require('./commands/weather');
const reminderCmd = require('./commands/reminder');
const broadcastCmd = require('./commands/broadcast');
const resetCmd = require('./commands/reset');
const statsCmd = require('./commands/stats');
const mediaCmd = require('./commands/media');
const musicCmd = require('./commands/music');
const downloaderCmd = require('./commands/downloader');
const skillsCmd = require('./commands/skills');
const searchCmd = require('./commands/search');
const aiCmd = require('./commands/ai');

function createBot() {
  const bot = new Telegraf(config.BOT_TOKEN);

  // Jaring pengaman terakhir: log error & balas pesan generik.
  bot.catch((err, ctx) => {
    console.error('Bot error:', err);
    if (ctx) ctx.reply('⚠️ Terjadi gangguan. Coba beberapa saat lagi.').catch(() => {});
  });

  // Middleware global
  bot.use(logger());

  // Command spesifik didaftarkan lebih dulu
  startCmd.register(bot);
  helpCmd.register(bot);
  weatherCmd.register(bot);
  reminderCmd.register(bot);
  broadcastCmd.register(bot);
  resetCmd.register(bot);
  statsCmd.register(bot);
  mediaCmd.register(bot);
  musicCmd.register(bot);
  downloaderCmd.register(bot);
  skillsCmd.register(bot);
  searchCmd.register(bot);

  // Fallback AI HARUS paling terakhir
  aiCmd.register(bot);

  return bot;
}

module.exports = { createBot };
