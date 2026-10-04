import { sanitizeUrl } from './url.js';

export function isValidUrl(input) {
  return sanitizeUrl(input) !== null;
}

export function isCommand(text, cmd) {
  if (!text) return false;
  const first = text.split(' ')[0].trim().toLowerCase();
  return first === '/' + cmd.toLowerCase();
}

export function extractArgs(text, cmd) {
  const re = new RegExp(`^\/\s*${cmd}\s*(.*)$`, 'i');
  const m = (text || '').match(re);
  return m ? m[1].trim() : '';
}

export function clamp(n, min, max) {
  const v = Number(n);
  if (Number.isNaN(v)) return min;
  return Math.max(min, Math.min(max, v));
}

export function pickKeys(obj, keys) {
  const out = {};
  for (const k of keys) {
    if (k in obj) out[k] = obj[k];
  }
  return out;
}

export function safeJSON(str, fallback = null) {
  try { return JSON.parse(str); } catch { return fallback; }
}
