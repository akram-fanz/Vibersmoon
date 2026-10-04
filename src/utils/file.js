import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { config } from '../core/config.js';

export function safeTempName(ext = '') {
  return crypto.randomUUID() + (ext ? '.' + ext.replace(/^\./, '') : '');
}

export async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

export async function removeFile(fp) {
  try { await fs.unlink(fp); } catch {}
}

export async function safeReadFile(fp, maxBytes = 5 * 1024 * 1024) {
  const stat = await fs.stat(fp).catch(() => null);
  if (!stat || stat.size > maxBytes) throw new Error('File too large');
  return fs.readFile(fp);
}

export function tempPath(subdir = '', filename) {
  return path.join(config.tmpDir, subdir, filename || safeTempName());
}
