const ALLOWED_SCHEMES = ['http:', 'https:'];
const BLOCKED_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);
const PRIVATE_RANGES = [
  /^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./,
  /^127\./, /^169\.254\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
  /^0\.0\.0\.0$/,
];

export function sanitizeUrl(input) {
  if (!input || typeof input !== 'string') return null;
  let url = input.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
  try {
    const u = new URL(url);
    if (!ALLOWED_SCHEMES.includes(u.protocol)) return null;
    if (BLOCKED_HOSTS.has(u.hostname)) return null;
    for (const re of PRIVATE_RANGES) {
      if (re.test(u.hostname)) return null;
    }
    return u.toString();
  } catch {
    return null;
  }
}

export function isPublicUrl(url) {
  return sanitizeUrl(url) !== null;
}
