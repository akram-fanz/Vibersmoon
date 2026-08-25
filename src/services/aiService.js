const axios = require('axios');
const {
  AI_BASE_URL,
  AI_API_KEY,
  AI_MODEL,
  AI_VISION_MODEL,
  AI_ENABLED,
  VISION_ENABLED,
} = require('../config');
const db = require('./db');

async function chat(userId, message, doc = null, systemPrompt = null) {
  if (!AI_ENABLED) {
    const err = new Error('Fitur AI belum aktif. Isi AI_BASE_URL dan AI_API_KEY di .env.');
    err.code = 'AI_DISABLED';
    throw err;
  }

  const baseSystem =
    systemPrompt ||
    'Kamu adalah asisten ramah yang menjawab dalam Bahasa Indonesia. Untuk pertanyaan seputar coding, selalu tulis kode di dalam blok kode berbatas (fenced code block) lengkap dengan nama bahasanya, misalnya ```js untuk JavaScript atau ```python untuk Python. Jangan letakkan kode di dalam teks biasa. Jaga agar penjelasan singkat dan kode mudah di-copy.';

  const history = db.getHistory(userId);
  const messages = [
    { role: 'system', content: baseSystem },
  ];

  if (doc && doc.content) {
    messages.push({
      role: 'system',
      content: `Berikut adalah isi dokumen "${doc.name}" yang diunggah pengguna. Jadikan ini sebagai konteks utama saat menjawab pertanyaan pengguna:\n\n${doc.content}`,
    });
  }

  messages.push(
    ...history,
    { role: 'user', content: message },
  );

  let res;
  try {
    res = await axios.post(
      `${AI_BASE_URL.replace(/\/$/, '')}/chat/completions`,
      { model: AI_MODEL, messages, temperature: 0.7 },
      {
        headers: { Authorization: `Bearer ${AI_API_KEY}`, 'Content-Type': 'application/json' },
        timeout: 9000,
      }
    );
  } catch (e) {
    const err = new Error('Gagal menghubungi layanan AI. Periksa koneksi atau API key Anda.');
    err.code = 'AI_ERROR';
    throw err;
  }

  const reply = res.data?.choices?.[0]?.message?.content;
  if (!reply) {
    const err = new Error('Layanan AI tidak mengembalikan jawaban.');
    err.code = 'AI_EMPTY';
    throw err;
  }

  db.appendHistory(userId, 'user', message);
  db.appendHistory(userId, 'assistant', reply);
  return reply;
}

async function analyzeImage(userId, imageDataUrl, question) {
  if (!VISION_ENABLED) {
    const err = new Error(
      'Fitur analisis gambar belum aktif. Isi AI_VISION_MODEL di .env (mis. gpt-4o-mini).'
    );
    err.code = 'VISION_DISABLED';
    throw err;
  }

  const text = question || 'Deskripsikan gambar ini secara ringkas dalam Bahasa Indonesia.';

  const messages = [
    {
      role: 'system',
      content:
        'Kamu adalah asisten ramah yang menganalisis gambar dan menjawab dalam Bahasa Indonesia. Jawaban singkat, jelas, dan relevan dengan pertanyaan pengguna.',
    },
    {
      role: 'user',
      content: [
        { type: 'text', text },
        { type: 'image_url', image_url: { url: imageDataUrl } },
      ],
    },
  ];

  let res;
  try {
    res = await axios.post(
      `${AI_BASE_URL.replace(/\/$/, '')}/chat/completions`,
      { model: AI_VISION_MODEL, messages, temperature: 0.5 },
      {
        headers: { Authorization: `Bearer ${AI_API_KEY}`, 'Content-Type': 'application/json' },
        timeout: 30000,
        maxContentLength: 20 * 1024 * 1024,
      }
    );
  } catch (e) {
    const err = new Error('Gagal menghubungi layanan AI vision. Periksa koneksi atau API key Anda.');
    err.code = 'AI_ERROR';
    throw err;
  }

  const reply = res.data?.choices?.[0]?.message?.content;
  if (!reply) {
    const err = new Error('Layanan AI tidak mengembalikan jawaban.');
    err.code = 'AI_EMPTY';
    throw err;
  }

  db.appendHistory(userId, 'user', `[Gambar dikirim] ${text}`);
  db.appendHistory(userId, 'assistant', reply);
  return reply;
}

module.exports = { chat, analyzeImage };
