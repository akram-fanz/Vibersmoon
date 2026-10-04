import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { config } from './config.js';
import { logger } from './logger.js';

export async function createJobDir() {
  const id = crypto.randomUUID();
  const dir = path.join(config.tmpDir, `job-${id}`);
  await fs.mkdir(dir, { recursive: true });
  return { id, dir };
}

export async function cleanupJob(dir) {
  try { await fs.rm(dir, { recursive: true, force: true }); }
  catch (e) { logger.warn({ err: e, dir }, 'Cleanup failed'); }
}

export async function cleanupStale(maxAgeMs = 3600_000) {
  try {
    const entries = await fs.readdir(config.tmpDir, { withFileTypes: true });
    const now = Date.now();
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const full = path.join(config.tmpDir, e.name);
      const stat = await fs.stat(full);
      if (now - stat.mtimeMs > maxAgeMs) {
        await fs.rm(full, { recursive: true, force: true });
        logger.info({ dir: full }, 'Cleaned stale temp dir');
      }
    }
  } catch (e) { logger.warn({ err: e }, 'Stale cleanup error'); }
}
