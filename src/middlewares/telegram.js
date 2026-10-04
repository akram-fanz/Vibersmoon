import { Bot } from 'grammy';
import { config } from '../core/config.js';
import { logger } from '../core/logger.js';
import { sessionLoader } from './sessionLoader.js';
import { errorHandler } from './errorHandler.js';
import { rateLimiterMiddleware, quotaMiddleware, initRateLimiter } from './rateLimiter.js';
import { commandLogger } from './commandLogger.js';

export function createMiddleware(bot) {
  bot.api.config.use({ retryLimit: 3, skipUnavailable: true });
  bot.use(sessionLoader());
  bot.use(errorHandler());
  bot.use(rateLimiterMiddleware());
  bot.use(quotaMiddleware());
  bot.use(commandLogger());
  initRateLimiter();
  logger.info('Middleware initialized');
}

export async function startPolling(bot) {
  logger.info({ botUsername: bot.botInfo?.username }, 'Starting long polling');
  await bot.start();
}

export async function startWebhook(bot, port = 8080) {
  bot.start({ webhook: { port } });
  logger.info({ port }, 'Webhook mode');
}
