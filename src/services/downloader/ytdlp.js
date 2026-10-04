import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { logger } from '../../core/logger.js';
import { config } from '../../core/config.js';

const YT_DLP = config.ytDlpPath;
const TIMEOUT_MS = 10 * 60_000;

function run(args, { onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(YT_DLP, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    let lastProgress = 0;
    const timer = setTimeout(() => { p.kill('SIGKILL'); reject(new Error('yt-dlp timeout (maks 10 menit).')); }, TIMEOUT_MS);
    p.stdout.on('data', (d) => {
      stdout += d;
      if (onProgress && Date.now() - lastProgress > 3000) {
        lastProgress = Date.now();
        const m = String(d).match(/\[download\]\s+(\d+\.?\d*)%/);
        if (m) onProgress({ percent: parseFloat(m[1]) });
      }
    });
    p.stderr.on('data', (d) => { stderr += d; });
    p.on('error', (e) => { clearTimeout(timer); reject(e); });
    p.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`yt-dlp exit ${code}: ${(stderr || stdout).slice(-400)}`));
    });
  });
}

async function runJson(args) {
  const { stdout } = await run(args);
  return JSON.parse(stdout);
}

async function findOutput(dir) {
  const entries = await fs.readdir(dir);
  const media = entries.filter((f) => /\.(mp4|mkv|webm|mp3|m4a|ogg|opus)$/i.test(f));
  if (!media.length) throw new Error('File hasil download tidak ditemukan.');
  // pilih yang terbesar (video+audio merged)
  let best = media[0], bestSize = 0;
  for (const f of media) {
    const s = (await fs.stat(path.join(dir, f))).size;
    if (s > bestSize) { best = f; bestSize = s; }
  }
  return path.join(dir, best);
}

export const ytdlp = {
  name: 'yt-dlp',
  match(url) {
    return /youtube\.com|youtu\.be|instagram\.com|facebook\.com|fb\.watch|twitter\.com|x\.com|reddit\.com|soundcloud\.com|pinterest\.|vimeo\.|dailymotion\.|twitch\.|vk\.com|ok\.ru/i.test(url);
  },

  async probe(url) {
    const info = await runJson(['-J', '--no-playlist', '--no-warnings', url]);
    return {
      title: info.title || 'video',
      duration: info.duration || 0,
      thumbnail: info.thumbnail || null,
      uploader: info.uploader || info.channel || '',
    };
  },

  async download({ url, dir, quality = null, audioOnly = false, onProgress }) {
    const args = ['-o', path.join(dir, '%(title).80s.%(ext)s'), '--no-playlist', '--no-warnings', '--no-part', '--restrict-filenames'];
    if (audioOnly) {
      args.push('-x', '--audio-format', 'mp3', '--audio-quality', '5');
    } else if (quality) {
      args.push('-f', `bestvideo[height<=${quality}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=${quality}]+bestaudio/best[height<=${quality}]/best`, '--merge-output-format', 'mp4');
    } else {
      args.push('-f', 'bv*+ba/b', '--merge-output-format', 'mp4');
    }
    if (onProgress) args.push('--newline');
    args.push(url);
    await run(args, { onProgress });
    const file = await findOutput(dir);
    const size = (await fs.stat(file)).size;
    return { filePath: file, size, filename: path.basename(file) };
  },

  async search(query, { limit = 5 } = {}) {
    const info = await runJson(['--no-warnings', '--flat-playlist', '-J', `ytsearch${limit}:${query}`]);
    return (info.entries || []).map((e) => ({
      title: e.title || e.id,
      url: e.url || (e.id ? `https://www.youtube.com/watch?v=${e.id}` : null),
      duration: e.duration ? Math.round(e.duration) : null,
      uploader: e.uploader || e.channel || '',
    })).filter((e) => e.url);
  },
};
