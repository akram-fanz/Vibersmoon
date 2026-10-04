import axios from 'axios';
import config from '../core/config.js';
import * as db from '../services/db.js';
import logger from '../core/logger.js';

const aiEnabled = () => Boolean(config.ai.apiKey && config.ai.baseUrl);

export async function chat(userId, message, doc = null, systemPrompt = null) {
  if (!aiEnabled()) {
    const err = new Error('Fitur AI belum aktif. Isi AI_API_KEY dan AI_BASE_URL di .env.');
    err.code = 'AI_DISABLED';
    throw err;
  }

  const baseSystem =
    systemPrompt ||
    'Kamu adalah asisten ramah yang menjawab dalam Bahasa Indonesia. Untuk pertanyaan seputar coding, selalu tulis kode di dalam fenced code block lengkap dengan nama bahasanya. Jaga agar penjelasan singkat dan kode mudah di-copy.';

  const history = db.getHistory(userId);
  const messages = [{ role: 'system', content: baseSystem }];

  if (doc && doc.content) {
    messages.push({
      role: 'system',
      content: `Berikut adalah isi dokumen "${doc.name}" yang diunggah pengguna. Jadikan ini sebagai konteks utama saat menjawab:\n\n${doc.content}`
    });
  }

  messages.push(...history, { role: 'user', content: message });

  let res;
  try {
    res = await axios.post(
      `${config.ai.baseUrl.replace(/\/$/, '')}/chat/completions`,
      { model: config.ai.model, messages, temperature: 0.7 },
      { headers: { Authorization: `Bearer ${config.ai.apiKey}`, 'Content-Type': 'application/json' }, timeout: 60000 }
    );
  } catch (e) {
    logger.warn({ err: e.message }, 'AI chat gagal');
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

export async function analyzeImage(userId, imageDataUrl, question) {
  if (!aiEnabled()) {
    const err = new Error('Fitur analisis gambar belum aktif. Isi AI_API_KEY di .env.');
    err.code = 'VISION_DISABLED';
    throw err;
  }

  const text = question || 'Deskripsikan gambar ini secara ringkas dalam Bahasa Indonesia.';
  const messages = [
    { role: 'system', content: 'Kamu adalah asisten ramah yang menganalisis gambar dan menjawab dalam Bahasa Indonesia. Jawaban singkat, jelas, dan relevan.' },
    { role: 'user', content: [{ type: 'text', text }, { type: 'image_url', image_url: { url: imageDataUrl } }] }
  ];

  let res;
  try {
    res = await axios.post(
      `${config.ai.baseUrl.replace(/\/$/, '')}/chat/completions`,
      { model: config.ai.visionModel, messages, temperature: 0.5 },
      { headers: { Authorization: `Bearer ${config.ai.apiKey}`, 'Content-Type': 'application/json' }, timeout: 60000 }
    );
  } catch (e) {
    logger.warn({ err: e.message }, 'AI vision gagal');
    const err = new Error('Gagal menghubungi layanan AI vision.');
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

export async function summarize(text) {
  if (!aiEnabled()) {
    const err = new Error('Fitur ringkasan butuh AI. Isi AI_API_KEY di .env.');
    err.code = 'AI_DISABLED';
    throw err;
  }
  const res = await axios.post(
    `${config.ai.baseUrl.replace(/\/$/, '')}/chat/completions`,
    {
      model: config.ai.model,
      messages: [
        { role: 'system', content: 'Ringkas artikel berikut dalam Bahasa Indonesia menjadi 3-5 poin padat.' },
        { role: 'user', content: String(text).slice(0, 12000) }
      ],
      temperature: 0.3
    },
    { headers: { Authorization: `Bearer ${config.ai.apiKey}` }, timeout: 60000 }
  );
  const reply = res.data?.choices?.[0]?.message?.content;
  if (!reply) throw new Error('Gagal membuat ringkasan.');
  return reply;
}

export { aiEnabled as isEnabled };
