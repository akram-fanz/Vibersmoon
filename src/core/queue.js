import PQueue from 'p-queue';
import { logger } from './logger.js';

export const queue = new PQueue({ concurrency: 3 });

queue.on('error', err => logger.error({ err }, 'Queue error'));
queue.on('idle', () => logger.debug('Queue idle'));
