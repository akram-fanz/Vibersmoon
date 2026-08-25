const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const BOT_TOKEN = process.env.BOT_TOKEN || '';
const ADMIN_IDS = (process.env.ADMIN_IDS || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean)
  .map((id) => Number(id));

const AI_BASE_URL = process.env.AI_BASE_URL || '';
const AI_API_KEY = process.env.AI_API_KEY || '';
const AI_MODEL = process.env.AI_MODEL || 'gpt-3.5-turbo';
const AI_VISION_MODEL = process.env.AI_VISION_MODEL || '';
const WEATHER_API_KEY = process.env.WEATHER_API_KEY || '';
const YT_DL_API_URL = process.env.YT_DL_API_URL || '';
const IG_DL_API_URL = process.env.IG_DL_API_URL || '';

const AI_ENABLED = Boolean(AI_BASE_URL && AI_API_KEY);
const VISION_ENABLED = Boolean(AI_ENABLED && AI_VISION_MODEL);
const WEATHER_ENABLED = Boolean(WEATHER_API_KEY);

function validate() {
  const errors = [];
  if (!BOT_TOKEN) errors.push('BOT_TOKEN wajib diisi di .env');
  if (ADMIN_IDS.length === 0 || ADMIN_IDS.some((id) => Number.isNaN(id))) {
    errors.push('ADMIN_IDS wajib diisi dengan minimal 1 ID Telegram numerik');
  }
  return errors;
}

module.exports = {
  BOT_TOKEN,
  ADMIN_IDS,
  AI_BASE_URL,
  AI_API_KEY,
  AI_MODEL,
  WEATHER_API_KEY,
  YT_DL_API_URL,
  IG_DL_API_URL,
  AI_VISION_MODEL,
  AI_ENABLED,
  VISION_ENABLED,
  WEATHER_ENABLED,
  validate,
};
