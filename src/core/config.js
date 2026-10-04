import 'dotenv/config';

const required = ['BOT_TOKEN'];
const missing = required.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error(`FATAL: Missing env vars: ${missing.join(', ')}`);
  process.exit(1);
}

function parseNum(val, fallback) {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  botToken: process.env.BOT_TOKEN,
  adminIds: (process.env.ADMIN_IDS || '').split(',').map(Number).filter(Boolean),
  rateLimitMax: parseNum(process.env.RATE_LIMIT_MAX, 10),
  rateLimitWindowMs: parseNum(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
  downloadQuota: parseNum(process.env.DOWNLOAD_QUOTA, 20),
  tmpDir: new URL('../tmp/', import.meta.url).pathname,
  dataDir: new URL('../../data/', import.meta.url).pathname,
  dbPath: new URL('../../data/bot.db', import.meta.url).pathname,
  schemaPath: new URL('./schema.sql', import.meta.url).pathname,
  ai: {
    baseUrl: process.env.AI_BASE_URL || process.env.AI_PROVIDER_URL || '',
    apiKey: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL || 'gpt-4o-mini',
    visionModel: process.env.AI_VISION_MODEL || 'gpt-4o-mini',
  },
  weatherApiKey: process.env.WEATHER_API_KEY || '',
  ytDlpPath: process.env.YT_DLP_PATH || 'yt-dlp',
};

export default config;
