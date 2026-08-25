const axios = require('axios');
const aiService = require('../services/aiService');
const db = require('../services/db');
const { toTelegramHtml, splitHtml, escapeHtml, langToExt, parseParts, MAX_INLINE_CODE } = require('../utils/format');

const MAX_DOC_CHARS = 30000;
const TEXT_EXT = /\.(txt|md|markdown|json|csv|js|ts|jsx|tsx|py|java|c|cpp|h|hpp|cs|php|rb|go|rs|sql|html|css|xml|yaml|yml|log|env|sh|bat|ps1|toml|ini)$/i;

async function handleDocument(ctx) {
  const doc = ctx.message.document;
  const name = doc.file_name || 'dokumen';
  const caption = ctx.message.caption || '';

  const isText = TEXT_EXT.test(name) || !doc.mime_type || /^text\//.test(doc.mime_type);
  if (!isText) {
    return ctx.reply(`⚠️ Maaf, hanya dokumen teks yang bisa dibaca (txt, md, json, csv, kode, dll). File "${name}" (${doc.mime_type || 'unknown'}) belum didukung.`);
  }

  try {
    const link = await ctx.telegram.getFileLink(doc.file_id);
    const res = await axios.get(link, {
      responseType: 'text',
      timeout: 20000,
      maxContentLength: 8 * 1024 * 1024,
    });
    let content = res.data || '';
    if (content.length > MAX_DOC_CHARS) {
      content = content.slice(0, MAX_DOC_CHARS) + '\n...[konten dipotong karena terlalu panjang]';
    }

    db.setUserDoc(ctx.from.id, name, content);

    if (caption) {
      const reply = await aiService.chat(ctx.from.id, caption, { name, content });
      await sendReply(ctx, reply);
      return;
    }

    await ctx.reply(
      `✅ Dokumen *${name}* (${content.length} karakter) diterima. Sekarang kirim pertanyaan Anda tentang dokumen ini, maka AI akan menjawab berdasarkan isinya.`
    );
  } catch (e) {
    ctx.reply(`❌ Gagal membaca dokumen: ${e.message}`);
  }
}

function register(bot) {
  // Terima dokumen teks lalu jadikan konteks AI.
  bot.on('document', handleDocument);

  // Fallback AI: menangkap semua pesan teks bebas.
  // Didaftarkan PALING TERAKHIR di bot.js agar tidak menelan command spesifik.
  bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    if (text.startsWith('/')) return; // aman: serahkan ke handler command
    try {
      const doc = db.getUserDoc(ctx.from.id);
      const reply = await aiService.chat(ctx.from.id, text, doc);
      await sendReply(ctx, reply);
    } catch (e) {
      ctx.reply(`❌ ${e.message}`);
    }
  });
}

async function sendReply(ctx, reply) {
  const parts = parseParts(reply);
  let html = '';

  const flush = async () => {
    if (!html.trim()) return;
    for (const chunk of splitHtml(html)) {
      await ctx.reply(chunk, { parse_mode: 'HTML' });
    }
    html = '';
  };

  for (const p of parts) {
    if (p.type === 'text') {
      html += escapeHtml(p.content);
      continue;
    }
    // p.type === 'code'
    if (p.content.length > MAX_INLINE_CODE) {
      await flush(); // kirim dulu teks/code pendek yang terkumpul
      const ext = langToExt(p.lang);
      await ctx.replyWithDocument(
        { source: Buffer.from(p.content), filename: `kode.${ext}` },
        { caption: `📄 Kode ${p.lang || 'teks'} terlalu panjang, dikirim sebagai file.` }
      );
    } else {
      html += `<pre><code>${escapeHtml(p.content)}</code></pre>`;
    }
  }
  await flush();
}

module.exports = { register, sendReply };
