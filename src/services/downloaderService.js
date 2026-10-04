import { InputFile } from 'grammy';
import { spawn } from 'child_process';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import config from '../core/config.js';
import logger from '../core/logger.js';

const YT_RE = /(?:youtube\.com|youtu\.be)/i;
const IG_RE = /instagram\.com/i;
const TT_RE = /tiktok\.com/i;

export function detectPlatform(url) {
  if (TT_RE.test(url)) return 'tiktok';
  if (YT_RE.test(url)) return 'youtube';
  if (IG_RE.test(url)) return 'instagram';
  return 'other';
}

export function extractUrl(text) {
  const m = String(text).match(/https?:\/\/[^\s]+/i);
  return m ? m[0] : null;
}

function findYtDlp() {
  return new Promise((resolve) => {
    const proc = spawn('which', ['yt-dlp']);
    let out = '';
    proc.stdout.on('data', (d) => { out += d; });
    proc.on('close', () => resolve(out.trim() || null));
    proc.on('error', () => resolve(null));
  });
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error('Proses download timeout (maks 10 menit).'));
    }, opts.timeoutMs || 600_000);

    proc.stdout.on('data', (d) => { stdout += d; });
    proc.stderr.on('data', (d) => { stderr += d; });
    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr.slice(-800) || `Exit code ${code}`));
    });
    proc.on('error', (err) => { clearTimeout(timer); reject(err); });
  });
}

async function probeFormat(url) {
  const bin = await findYtDlp();
  if (!bin) throw new Error('yt-dlp tidak ditemukan di server.');
  const { stdout } = await run(bin, ['-J', '--no-warnings', '--no-playlist', url], { timeoutMs: 120_000 });
  return JSON.parse(stdout);
}

export async function getFormats(url) {
  const info = await probeFormat(url);
  const formats = (info.formats || [])
    .filter((f) => f.vcodec !== 'none' && f.ext === 'mp4' && f.height)
    .sort((a, b) => b.height - a.height);
  const seen = new Set();
  const qualities = [];
  for (const f of formats) {
    if (!seen.has(f.height)) {
      seen.add(f.height);
      qualities.push({ height: f.height, formatId: f.format_id, label: `MP4 ${f.height}p` });
    }
  }
  return {
    title: info.title || 'video',
    duration: info.duration || 0,
    thumbnail: info.thumbnail || null,
    qualities: qualities.slice(0, 5),
    audioOnly: (info.formats || []).some((f) => f.vcodec === 'none' && f.acodec !== 'none')
  };
}

async function downloadMedia(url, args, dir, baseName) {
  const bin = await findYtDlp();
  if (!bin) throw new Error('yt-dlp tidak ditemukan di server.');
  const outTpl = path.join(dir, `${baseName}.%(ext)s`);
  await run(bin, [...args, '-o', outTpl, '--no-playlist', '--no-warnings', url]);
  const files = await fsp.readdir(dir);
  if (!files.length) throw new Error('File hasil download tidak ditemukan.');
  const file = files[0];
  const full = path.join(dir, file);
  const stat = await fsp.stat(full);
  return { file: full, size: stat.size };
}

export async function downloadVideo(url, formatId, dir) {
  const args = ['-f', formatId || 'bv*+ba/b', '--merge-output-format', 'mp4'];
  return downloadMedia(url, args, dir, 'video');
}

export async function downloadAudio(url, dir) {
  const args = ['-f', 'ba', '-x', '--audio-format', 'mp3', '--audio-quality', '5'];
  return downloadMedia(url, args, dir, 'audio');
}

export async function downloadTikTok(url, dir) {
  // TikTok: coba yt-dlp dulu, fallback ke API tikwm (tanpa watermark)
  try {
    return await downloadMedia(url, [], dir, 'tiktok');
  } catch (e) {
    logger.info({ err: e.message }, 'yt-dlp TikTok gagal, coba tikwm');
    const res = await fetch('https://tikwm.com/api/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ url }),
      signal: AbortSignal.timeout(30_000)
    });
    const json = await res.json();
    const data = json?.data;
    if (!data) throw new Error('Gagal mengambil data TikTok.');
    const mediaUrl = data.play || data.wmplay || data.hdplay;
    if (!mediaUrl) throw new Error('TikTok tidak punya video yang bisa diunduh.');
    const out = path.join(dir, 'tiktok.mp4');
    const r2 = await fetch(mediaUrl, { signal: AbortSignal.timeout(120_000) });
    if (!r2.ok) throw new Error('Gagal mengunduh file TikTok.');
    const buf = Buffer.from(await r2.arrayBuffer());
    await fsp.writeFile(out, buf);
    return { file: out, size: buf.length };
  }
}

// Fallback API lama (kalau env masih diisi)
export async function legacyApiDownload(url, platform) {
  const apiUrl = platform === 'instagram' ? config.igDlApiUrl : config.ytDlApiUrl;
  if (!apiUrl) return null;
  try {
    const res = await axios.get(apiUrl, { params: { url }, timeout: 60000 });
    const data = res.data;
    const mediaUrl = data?.url || data?.data?.url || data?.results?.[0]?.url || data?.medias?.[0]?.url;
    return mediaUrl || null;
  } catch {
    return null;
  }
}

export function sendMedia(ctx, filePath, caption) {
  const stat = fs.statSync(filePath);
  if (stat.size > 49 * 1024 * 1024) {
    return ctx.reply('❌ File terlalu besar (>50MB) untuk dikirim via Telegram Bot API.');
  }
  if (/\.(mp3|m4a|ogg|wav|opus)$/i.test(filePath)) {
    return ctx.replyWithAudio(new InputFile(filePath), { caption, title: path.basename(filePath) });
  }
  return ctx.replyWithVideo(new InputFile(filePath), { caption, supports_streaming: true });
}

// named exports di atas sudah lengkap
