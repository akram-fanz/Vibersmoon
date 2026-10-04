import { Bot } from 'grammy';
import { config } from './core/config.js';
import { logger } from './core/logger.js';
import { cleanupStale } from './core/tempStore.js';
import { sessionLoader } from './middlewares/sessionLoader.js';
import { rateLimiterMiddleware, initRateLimiter } from './middlewares/rateLimiter.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { commandLogger } from './middlewares/commandLogger.js';

import { registerStart } from './commands/start.js';
import { register as registerHelp } from './commands/help.js';
import { registerDownloader } from './commands/downloader.js';
import { register as registerSearch } from './commands/search.js';
import { registerScraper } from './commands/scraper.js';
import { register as registerGames } from './commands/games.js';
import { register as registerNotes } from './commands/notes.js';
import { register as registerAdmin } from './commands/admin.js';
import { register as registerSkills } from './commands/skills.js';
import { register as registerMusic } from './commands/music.js';
import { register as registerReminder } from './commands/reminder.js';
import { register as registerWeather } from './commands/weather.js';
import { register as registerMedia } from './commands/media.js';
import { registerAi } from './commands/ai.js';

export function createBot() {
  const bot = new Bot(config.botToken);

  // Global middlewares
  bot.use(errorHandler());
  bot.use(rateLimiterMiddleware());
  bot.use(sessionLoader());
  bot.use(commandLogger());

  // Feature handlers (order matters)
  registerStart(bot);
  registerHelp(bot);
  registerDownloader(bot);
  registerSearch(bot);
  registerScraper(bot);
  registerGames(bot);
  registerNotes(bot);
  registerAdmin(bot);
  registerSkills(bot);
  registerMusic(bot);
  registerReminder(bot);
  registerWeather(bot);
  registerMedia(bot);
  // AI fallback MUST be registered last (it catches free text/documents)
  registerAi(bot);

  if (!globalThis._cleanupInterval) {
    globalThis._cleanupInterval = setInterval(() => cleanupStale(), 30 * 60_000);
    globalThis._cleanupInterval.unref?.();
  }
  return bot;
}

export async function start() {
  initRateLimiter();
  const bot = createBot();
  let me;
  try {
    me = await bot.api.getMe();
  } catch (e) {
    logger.error({ err: e.message }, 'Gagal connect ke Telegram');
    throw e;
  }
  const { loadAll } = await import('./services/reminderService.js');
  const loaded = loadAll(bot);
  logger.info({ bot: me.username, reminders: loaded }, 'Bot started');
  process.once('SIGINT', () => { logger.info('SIGINT'); bot.stop(); process.exit(0); });
  process.once('SIGTERM', () => { logger.info('SIGTERM'); bot.stop(); process.exit(0); });
  await bot.start();
}
