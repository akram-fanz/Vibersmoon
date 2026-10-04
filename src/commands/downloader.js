import { InputFile } from 'grammy';
import { isBanned, useDownloadQuota, getQuota, logJob } from '../services/db.js';
import { logger } from '../core/logger.js';
import { createJobDir, cleanupJob } from '../core/tempStore.js';
import { queue } from '../core/queue.js';
import { providerRouter } from '../services/downloader/providers.js';
import { formatBytes } from '../utils/format.js';
import { config } from '../core/config.js';

const TG_CAP = 49 * 1024 * 1024; // safety margin di bawah 50MB

async function sendMedia(ctx, result, title = '') {
  if (result.isImages) {
    for (const f of result.files.slice(0, 20)) {
      await ctx.replyWithPhoto(new InputFile(f));
    }
    return;
  }
  const input = new InputFile(result.filePath, result.filename);
  const caption = `${title ? `${title}\n` : ''}${formatBytes(result.size)}`;
  if (result.size <= TG_CAP) {
    try {
      if (/\.mp3$|\.m4a$|\.ogg$/i.test(result.filename)) {
        await ctx.replyWithAudio(input, { caption, title: result.title || result.filename });
      } else {
        await ctx.replyWithVideo(input, { caption, supports_streaming: true });
      }
      return;
    } catch (e) {
      logger.warn({ err: e.message }, 'Send as video gagal, coba dokumen');
    }
  }
  // Fallback: kompres via ffmpeg bila >50MB, atau kirim sebagai dokumen.
  await ctx.replyWithDocument(input, { caption });
}

// Kompres video >50MB: re-encode 480p. (dianggap best-effort)
async function compressToMp4(inputPath, outPath) {
  const { spawn } = await import('node:child_process');
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', ['-y', '-i', inputPath, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '30', '-vf', 'scale=-2:480', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', outPath]);
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve(outPath) : reject(new Error(`ffmpeg exit ${code}`))));
  });
}

async function doDownload(ctx, url, opts = {}) {
  const userId = ctx.from.id;
  if (isBanned(userId)) { await ctx.reply('⛔ Akun kamu diblokir.'); return; }
  const q = getQuota(userId);
  if (q.used >= config.downloadQuota) {
    await ctx.reply(`⚠️ Kuota download harian habis (${config.downloadQuota}/hari). Coba lagi besok.`);
    return;
  }
  const status = await ctx.reply('⏳ Mengunduh…');
  queue.add(async () => {
    const { dir } = await createJobDir();
    const start = Date.now();
    try {
      const provider = providerRouter.match(url);
      if (!provider) throw Object.assign(new Error('URL tidak didukung.'), { code: 'USER_ERROR' });
      const probe = await provider.probe(url);
      try {
        await ctx.api.editMessageText(ctx.chat.id, status.message_id, `⏳ Mengunduh: ${probe.title || 'media'}…`);
      } catch { /* abaikan */ }
      let result = await provider.download({ url, dir, ...opts, onProgress: (p) => {
        ctx.api.editMessageText(ctx.chat.id, status.message_id, `⏳ ${p.percent}%`).catch(() => {});
      } });
      // >50MB & berupa video: coba kompres
      if (!result.isImages && result.size > TG_CAP && /\.mp4$|\.mkv$|\.webm$/i.test(result.filename)) {
        try {
          const out = `${result.filePath}.small.mp4`;
          await compressToMp4(result.filePath, out);
          const { stat } = await import('node:fs/promises');
          const size = (await stat(out)).size;
          if (size <= TG_CAP) {
            await import('node:fs/promises').then(m => m.unlink(result.filePath).catch(() => {}));
            result = { ...result, filePath: out, size, filename: result.filename.replace(/\.\w+$/, '') + '.mp4' };
          }
        } catch (e) {
          logger.warn({ err: e.message }, 'Kompres gagal, kirim sebagai dokumen');
        }
      }
      useDownloadQuota(userId);
      logJob({ userId, type: 'download', detail: { provider: provider.name, size: result.size }, status: 'success', durationMs: Date.now() - start });
      try { await ctx.deleteMessage(status.message_id); } catch { /* abaikan */ }
      await sendMedia(ctx, result, probe.title);
    } catch (err) {
      logJob({ userId, type: 'download', detail: { error: String(err.message).slice(0, 300) }, status: 'failed', durationMs: Date.now() - start });
      try { await ctx.deleteMessage(status.message_id); } catch { /* abaikan */ }
      await ctx.reply(`❌ Gagal: ${err.message}`);
      logger.error({ err: err.message, url }, 'Download failed');
    } finally {
      await cleanupJob(dir);
    }
  });
}

export function registerDownloader(bot) {
  bot.command(['dl', 'download'], async (ctx) => {
    const url = (ctx.message.text || '').replace(/^\/\w+\s*/, '').trim();
    if (!url) { await ctx.reply('Kirim URL, contoh: /dl https://youtube.com/watch?v=...'); return; }
    await doDownload(ctx, url);
  });

  // Auto-detect URL di chat pribadi
  bot.on('message:text', async (ctx, next) => {
    const url = (ctx.message.text.match(/https?:\/\/[^\s]+/) || [])[0];
    if (!url || !providerRouter.match(url)) return next();
    if (ctx.chat?.type !== 'private') return next(); // grup: biar gak spam
    await doDownload(ctx, url);
  });

  // Pilihan kualitas via inline keyboard
  bot.command('q', async (ctx) => {
    const url = (ctx.message.text || '').replace(/^\/q\s*/, '').trim();
    if (!url) { await ctx.reply('Gunakan: /q <URL>'); return; }
    const provider = providerRouter.match(url);
    if (!provider) { await ctx.reply('URL tidak didukung.'); return; }
    const probe = await provider.probe(url).catch(() => null);
    const title = probe?.title || 'media';
    await ctx.reply(`🎬 ${title}\nPilih kualitas:`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'MP4 360p', callback_data: `dlq:360:${encodeURIComponent(url)}` }],
          [{ text: 'MP4 720p', callback_data: `dlq:720:${encodeURIComponent(url)}` }],
          [{ text: 'MP4 1080p', callback_data: `dlq:1080:${encodeURIComponent(url)}` }],
          [{ text: '🎵 MP3', callback_data: `dlq:mp3:${encodeURIComponent(url)}` }],
        ],
      },
    });
  });

  bot.callbackQuery(/^dlq:(\w+):(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const quality = ctx.match[1];
    const url = decodeURIComponent(ctx.match[2]);
    const opts = quality === 'mp3' ? { audioOnly: true } : { quality: Number(quality) };
    await doDownload(ctx, url, opts);
  });

  bot.command('yt', async (ctx) => {
    const q = (ctx.message.text || '').replace(/^\/yt\s*/, '').trim();
    if (!q) { await ctx.reply('Gunakan: /yt <kata kunci>'); return; }
    const status = await ctx.reply('⏳ Mencari YouTube…');
    queue.add(async () => {
      const { dir } = await createJobDir();
      try {
        const ytp = providerRouter.getProvider('yt-dlp');
        const results = await ytp.search(q);
        try { await ctx.deleteMessage(status.message_id); } catch { /* abaikan */ }
        if (!results.length) { await ctx.reply('Tidak ditemukan.'); return; }
        const lines = results.slice(0, 5).map((r, i) => {
          const d = r.duration ? `${Math.floor(r.duration / 60)}:${String(r.duration % 60).padStart(2, '0')}` : '-';
          return `${i + 1}. ${r.title} (${d})\n${r.url}`;
        }).join('\n\n');
        await ctx.reply(`Hasil pencarian:\n${lines}\n\nKirim /dl <URL> untuk mengunduh.`);
      } catch (err) {
        try { await ctx.deleteMessage(status.message_id); } catch { /* abaikan */ }
        await ctx.reply('Pencarian gagal.');
      } finally {
        await cleanupJob(dir);
      }
    });
  });

  bot.command('play', async (ctx) => {
    const q = (ctx.message.text || '').replace(/^\/play\s*/, '').trim();
    if (!q) { await ctx.reply('Gunakan: /play <judul>'); return; }
    const status = await ctx.reply('⏳ Mencari audio…');
    queue.add(async () => {
      const { dir } = await createJobDir();
      const start = Date.now();
      try {
        const ytp = providerRouter.getProvider('yt-dlp');
        const results = await ytp.search(q, { limit: 3 });
        if (!results.length) { await ctx.reply('Tidak ditemukan.'); return; }
        const r = results[0];
        await ctx.api.editMessageText(ctx.chat.id, status.message_id, `⏳ Mengunduh audio: ${r.title}…`);
        const result = await ytp.download({ url: r.url, dir, audioOnly: true });
        useDownloadQuota(ctx.from.id);
        logJob({ userId: ctx.from.id, type: 'download', detail: { query: q, audio: true }, status: 'success', durationMs: Date.now() - start });
        try { await ctx.deleteMessage(status.message_id); } catch { /* abaikan */ }
        await ctx.replyWithAudio(new InputFile(result.filePath, result.filename), { title: r.title, caption: '🎵 Via /play' });
      } catch (err) {
        try { await ctx.deleteMessage(status.message_id); } catch { /* abaikan */ }
        await ctx.reply(`Gagal: ${err.message}`);
      } finally {
        await cleanupJob(dir);
      }
    });
  });
}
