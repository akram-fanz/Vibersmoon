import { InputFile } from 'grammy';
import axios from 'axios';
import { search } from '../services/searchService.js';
import { escapeHtml } from '../utils/format.js';

const TYPE_LABEL = { song: '🎵 lagu', video: '▶️ video', image: '🖼 gambar' };
const ALIAS = {
  lagu: 'song', musik: 'song', song: 'song', music: 'song',
  video: 'video', yt: 'video',
  gambar: 'image', foto: 'image', image: 'image',
};

// userId -> jenis pencarian yang menunggu query teks
const pendingType = new Map();
// userId -> query yang menunggu pemilihan jenis
const pendingQuery = new Map();
// userId -> hasil lagu terakhir (untuk tombol preview)
const lastSongs = new Map();

export function parseArgs(text) {
  const arg = text.replace(/^\/search(@\S+)?/, '').trim();
  if (!arg) return { type: '', query: '' };
  const first = arg.split(/\s+/)[0].toLowerCase();
  if (ALIAS[first]) {
    return { type: ALIAS[first], query: arg.slice(first.length).trim() };
  }
  return { type: '', query: arg };
}

function searchKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🎵 Lagu', callback_data: 'srch_lagu' }],
        [{ text: '▶️ Video', callback_data: 'srch_video' }],
        [{ text: '🖼 Gambar', callback_data: 'srch_gambar' }],
        [{ text: '🔙 Kembali', callback_data: 'menu_help' }],
      ],
    },
  };
}

function chooserKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🎵 Lagu', callback_data: 'srch_lagu' },
          { text: '▶️ Video', callback_data: 'srch_video' },
          { text: '🖼 Gambar', callback_data: 'srch_gambar' },
        ],
      ],
    },
  };
}

function fmtDur(sec) {
  if (!sec) return '';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function fmtNum(n) {
  return Number(n).toLocaleString('id-ID');
}

async function runSearch(ctx, type, query) {
  if (!query) {
    pendingType.set(ctx.from.id, type);
    return ctx.reply(`Ketik kata kunci untuk mencari ${TYPE_LABEL[type]}:`);
  }
  const wait = await ctx.reply(`🔎 Mencari ${TYPE_LABEL[type]}: "${query}"…`);
  try {
    let items;
    if (type === 'song') items = await search(query, 'music_songs');
    else if (type === 'video') items = await search(query, 'videos');
    else items = await searchImages(query);
    ctx.deleteMessage(wait.message_id).catch(() => {});
    if (!items.length) {
      return ctx.reply(`❌ Tidak ada hasil untuk "${escapeHtml(query)}". Coba kata kunci lain.`);
    }
    if (type === 'song') await sendSongs(ctx, items);
    else if (type === 'video') await sendVideos(ctx, items);
    else await sendImages(ctx, items);
  } catch (e) {
    ctx.deleteMessage(wait.message_id).catch(() => {});
    ctx.reply(`❌ ${e.message}`);
  }
}

// Gambar via DuckDuckGo image API (tanpa key).
async function searchImages(query) {
  const res = await axios.get('https://duckduckgo.com/', { params: { q: query }, timeout: 10000 });
  const vqd = (/vqd=["']?([\w-]+)/.exec(res.data) || [])[1];
  if (!vqd) throw new Error('Gagal mengambil sesi pencarian gambar.');
  const r = await axios.get('https://duckduckgo.com/i.js', {
    params: { l: 'id-id', o: 'json', q: query, vqd },
    headers: { Referer: 'https://duckduckgo.com/' },
    timeout: 10000,
  });
  return (r.data?.results || []).slice(0, 8).map((it) => ({
    title: it.title || 'gambar',
    image: it.image,
    thumbnail: it.thumbnail,
    width: it.width,
    height: it.height,
    source: it.url,
  }));
}

// Unduh preview lalu kirim sebagai file audio utuh agar bisa langsung diputar.
async function sendPlayableSong(ctx, s) {
  const caption = `🎵 Contoh lagu: ${s.title} — ${s.uploader || '-'}`;
  try {
    const res = await axios.get(s.previewUrl, {
      responseType: 'arraybuffer', timeout: 20000, maxContentLength: 15 * 1024 * 1024,
    });
    const ext = ((/\.(\w{2,5})(?:\?|$)/.exec(s.previewUrl) || [])[1] || 'mp3').toLowerCase();
    const safeName = s.title.replace(/[^\w\s-]/g, '').trim().slice(0, 60) || 'lagu';
    await ctx.replyWithAudio(
      new InputFile(Buffer.from(res.data), `${safeName}.${ext}`),
      { title: s.title, performer: s.uploader, caption }
    );
  } catch {
    await ctx.replyWithAudio(s.previewUrl, { title: s.title, performer: s.uploader, caption });
  }
}

async function sendSongs(ctx, items) {
  // Preview via 30s sample kalau tersedia (iTunes), else pakai hasil apa adanya.
  const previewable = items.find((s) => s.previewUrl);
  if (previewable) {
    try { await sendPlayableSong(ctx, previewable); } catch { /* lanjut */ }
  }
  const lines = items
    .map((s, i) =>
      `<b>${i + 1}. ${escapeHtml(s.title)}</b>\n📺 ${escapeHtml(s.uploader || '-')}` +
      `${s.duration ? ` • ⏱ ${fmtDur(s.duration)}` : ''}`)
    .join('\n\n');
  const keyboard = items.map((s, i) => {
    const row = [{ text: `▶️ ${i + 1}`, url: s.url }];
    return row;
  });
  await ctx.reply(`<b>🎵 Hasil Lagu</b>\n\n${lines}`, {
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: keyboard },
  });
}

async function sendVideos(ctx, items) {
  const lines = items
    .map((v, i) =>
      `<b>${i + 1}. ${escapeHtml(v.title)}</b>\n📺 ${escapeHtml(v.uploader || '-')}` +
      `${v.duration ? ` • ⏱ ${fmtDur(v.duration)}` : ''}`)
    .join('\n\n');
  const keyboard = items.map((v) => [{ text: '▶️ Tonton', url: v.url }]);
  await ctx.reply(`<b>▶️ Hasil Video</b>\n\n${lines}`, {
    parse_mode: 'HTML',
    reply_markup: keyboard.length ? { inline_keyboard: keyboard } : undefined,
  });
}

async function sendImages(ctx, items) {
  const photos = items
    .filter((it) => it.thumbnail || it.image)
    .slice(0, 5)
    .map((it, idx) => ({
      type: 'photo',
      media: it.thumbnail || it.image,
      caption: `<b>${idx + 1}. ${escapeHtml(it.title.slice(0, 80))}</b>${it.width ? `\n📐 ${it.width}×${it.height}px` : ''}`,
    }));
  if (photos.length) {
    try { await ctx.replyWithMediaGroup(photos, { parse_mode: 'HTML' }); } catch { /* hotlink-blocked */ }
  }
  const lines = items
    .map((it, i) =>
      `<b>${i + 1}. ${escapeHtml(it.title)}</b>` +
      `${it.width ? ` (${it.width}×${it.height}px)` : ''}\n` +
      `${it.image ? `🖼 ${it.image}\n` : ''}` +
      `${it.source ? `🔗 ${it.source}` : ''}`)
    .join('\n\n');
  const keyboard = items
    .map((it) => (it.source || it.image ? [{ text: '🔗 Sumber', url: it.source || it.image }] : []))
    .filter((r) => r.length);
  await ctx.reply(`<b>🖼 Hasil Gambar</b>\n\n${lines}`, {
    parse_mode: 'HTML',
    reply_markup: keyboard.length ? { inline_keyboard: keyboard } : undefined,
  });
}

async function handleCommand(ctx) {
  const { type, query } = parseArgs(ctx.message.text);
  if (type) return runSearch(ctx, type, query);
  if (query) {
    pendingQuery.set(ctx.from.id, query);
    return ctx.reply(`🔎 Kata kunci: "<b>${escapeHtml(query)}</b>"\nCari sebagai:`, {
      parse_mode: 'HTML',
      ...chooserKeyboard(),
    });
  }
  return ctx.reply('🔎 Pilih jenis pencarian:', searchKeyboard());
}

export function register(bot) {
  bot.command('search', handleCommand);

  bot.callbackQuery('menu_search', (ctx) => {
    ctx.answerCallbackQuery();
    ctx.reply('🔎 Pilih jenis pencarian:', searchKeyboard());
  });

  const pickType = (type) => (ctx) => {
    ctx.answerCallbackQuery();
    const q = pendingQuery.get(ctx.from.id);
    if (q) {
      pendingQuery.delete(ctx.from.id);
      return runSearch(ctx, type, q);
    }
    pendingType.set(ctx.from.id, type);
    ctx.reply(`Ketik kata kunci untuk mencari ${TYPE_LABEL[type]}:`);
  };
  bot.callbackQuery('srch_lagu', pickType('song'));
  bot.callbackQuery('srch_video', pickType('video'));
  bot.callbackQuery('srch_gambar', pickType('image'));

  // Preview audio lagu dari hasil terakhir.
  bot.callbackQuery(/^srchprev_(\d+)$/, async (ctx) => {
    ctx.answerCallbackQuery();
    const items = lastSongs.get(ctx.from.id) || [];
    const s = items[Number(ctx.match[1])];
    if (!s || !s.previewUrl) {
      return ctx.reply('⚠️ Preview tidak tersedia atau hasil sudah kedaluwarsa. Cari ulang.');
    }
    try {
      await ctx.replyWithAudio(s.previewUrl, {
        title: s.title,
        performer: s.uploader,
        caption: `▶️ ${s.title} — ${s.uploader || '-'}`,
      });
    } catch {
      ctx.reply('❌ Gagal mengirim preview. Coba lagi.');
    }
  });

  // Query lewat mode pending: pesan teks berikutnya setelah pilih jenis.
  bot.on('message:text', async (ctx, next) => {
    const text = ctx.message.text;
    if (text.startsWith('/')) return next();
    const type = pendingType.get(ctx.from.id);
    if (!type) return next();
    pendingType.delete(ctx.from.id);
    await runSearch(ctx, type, text.trim());
  });
}
