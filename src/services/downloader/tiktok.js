import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { logger } from '../../core/logger.js';

const TIMEOUT_MS = 120_000;

function run(args) {
  return new Promise((resolve, reject) => {
    const p = spawn('yt-dlp', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    const timer = setTimeout(() => { p.kill('SIGKILL'); reject(new Error('TikTok download timeout.')); }, TIMEOUT_MS);
    p.stdout.on('data', (d) => { stdout += d; });
    p.stderr.on('data', (d) => { stderr += d; });
    p.on('error', (e) => { clearTimeout(timer); reject(e); });
    p.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr.slice(-300) || `exit ${code}`));
    });
  });
}

async function tikwm(url) {
  // API fallback TikTok tanpa watermark
  const res = await fetch('https://tikwm.com/api/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ url }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`tikwm HTTP ${res.status}`);
  const json = await res.json();
  const data = json?.data;
  if (!data) throw new Error('Gagal mengambil data TikTok.');
  return data;
}

async function downloadByUrl(mediaUrl, outPath) {
  const r = await fetch(mediaUrl, { signal: AbortSignal.timeout(120_000) });
  if (!r.ok) throw new Error(`Gagal unduh media TikTok (HTTP ${r.status}).`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 1000) throw new Error('File TikTok kosong/invalid.');
  await fs.writeFile(outPath, buf);
  return { filePath: outPath, size: buf.length };
}

export const tiktok = {
  name: 'tiktok',
  match(url) {
    return /tiktok\.com|vt\.tiktok\.com|vm\.tiktok\.com/i.test(url);
  },

  async probe(url) {
    const d = await tikwm(url);
    return {
      title: d.title || 'TikTok',
      duration: d.duration || 0,
      thumbnail: d.cover || null,
      uploader: d.author?.unique_id || '',
      images: d.images || null, // slideshow
    };
  },

  async download({ url, dir, audioOnly = false }) {
    const d = await tikwm(url);
    // Slideshow: kirim list foto
    if (!audioOnly && Array.isArray(d.images) && d.images.length) {
      const files = [];
      for (let i = 0; i < Math.min(d.images.length, 20); i++) {
        const out = path.join(dir, `tiktok_${i + 1}.jpg`);
        try { await downloadByUrl(d.images[i], out); files.push(out); } catch { /* skip */ }
      }
      if (files.length) return { filePath: files[0], files, size: 0, isImages: true, title: d.title || 'TikTok' };
    }
    // Video (hd dulu, fallback play)
    const mediaUrl = d.hdplay || d.play || d.wmplay;
    if (!mediaUrl) throw new Error('TikTok ini tidak punya media yang bisa diunduh.');
    const out = path.join(dir, 'tiktok.mp4');
    try {
      return await downloadByUrl(mediaUrl, out);
    } catch (e) {
      logger.warn({ err: e.message }, 'tikwm unduh gagal, coba yt-dlp');
      return ytdlpDownload(url, dir, audioOnly);
    }
  },
};

async function ytdlpDownload(url, dir, audioOnly) {
  const args = ['-o', path.join(dir, 'tiktok.%(ext)s'), '--no-warnings', '--no-playlist'];
  if (audioOnly) args.push('-x', '--audio-format', 'mp3');
  await run(args.concat(url));
  const entries = await fs.readdir(dir);
  const media = entries.filter((f) => /\.(mp4|webm|mp3|m4a)$/i.test(f));
  if (!media.length) throw new Error('No TikTok file produced.');
  const full = path.join(dir, media[0]);
  return { filePath: full, size: (await fs.stat(full)).size };
}
