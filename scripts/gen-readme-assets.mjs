// Generate README banner images (SVG -> PNG via sharp)
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'assets');
fs.mkdirSync(outDir, { recursive: true });

const bannerSvg = `
<svg width="1280" height="640" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f0c29"/>
      <stop offset="45%" stop-color="#302b63"/>
      <stop offset="100%" stop-color="#24243e"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f7b733"/>
      <stop offset="100%" stop-color="#fc4a1a"/>
    </linearGradient>
    <radialGradient id="moon" cx="35%" cy="35%" r="80%">
      <stop offset="0%" stop-color="#fdfbfb"/>
      <stop offset="100%" stop-color="#c9c9d6"/>
    </radialGradient>
    <filter id="glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="18" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>

  <rect width="1280" height="640" fill="url(#bg)"/>

  <!-- stars -->
  ${Array.from({ length: 90 }, (_, i) => {
    const x = (i * 137.5) % 1280;
    const y = (i * 89.3) % 640;
    const r = ((i * 7) % 3) * 0.5 + 0.7;
    const o = 0.25 + ((i * 13) % 60) / 100;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="#ffffff" opacity="${o.toFixed(2)}"/>`;
  }).join('')}

  <!-- moon crescent -->
  <g filter="url(#glow)" transform="translate(1050,120)">
    <circle cx="0" cy="0" r="70" fill="url(#moon)"/>
    <circle cx="28" cy="-14" r="60" fill="#0f0c29" opacity="0.92"/>
  </g>

  <!-- bot emoji on light chip -->
  <circle cx="640" cy="158" r="86" fill="#ffffff" opacity="0.95"/>
  <circle cx="640" cy="158" r="86" fill="none" stroke="url(#accent)" stroke-width="5"/>
  <text x="640" y="212" font-size="110" text-anchor="middle">🤖</text>

  <!-- title -->
  <text x="640" y="330" font-family="DejaVu Sans" font-weight="bold" font-size="92"
        fill="#ffffff" text-anchor="middle" letter-spacing="4">VIBERSMOON</text>

  <!-- accent underline -->
  <rect x="440" y="360" width="400" height="8" rx="4" fill="url(#accent)"/>

  <!-- tagline -->
  <text x="640" y="425" font-family="DejaVu Sans" font-size="34" fill="#c3c8ff" text-anchor="middle">Bot Telegram Serba Bisa — AI · Downloader · Games · Tools</text>

  <!-- tech chips -->
  <g font-family="DejaVu Sans" font-size="24" text-anchor="middle">
    <rect x="330" y="480" width="180" height="52" rx="26" fill="#ffffff14" stroke="#7b6cff" stroke-width="1.5"/>
    <text x="420" y="514" fill="#c9c4ff">grammY</text>
    <rect x="530" y="480" width="180" height="52" rx="26" fill="#ffffff14" stroke="#3ddc84" stroke-width="1.5"/>
    <text x="620" y="514" fill="#a9f0c6">SQLite</text>
    <rect x="730" y="480" width="220" height="52" rx="26" fill="#ffffff14" stroke="#f7b733" stroke-width="1.5"/>
    <text x="840" y="514" fill="#ffe0a3">yt-dlp + ffmpeg</text>
  </g>

  <text x="640" y="600" font-family="DejaVu Sans" font-size="20" fill="#8a8fb5" text-anchor="middle">v2.0 · Node.js ≥ 20 · Multi-purpose Telegram Bot</text>
</svg>`;

const footerSvg = `
<svg width="1280" height="120" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="fbg" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0f0c29"/>
      <stop offset="50%" stop-color="#302b63"/>
      <stop offset="100%" stop-color="#0f0c29"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="120" rx="16" fill="url(#fbg)"/>
  <text x="640" y="58" font-family="DejaVu Sans" font-size="26" fill="#ffffff" text-anchor="middle" font-weight="bold">🌙 Vibersmoon — asisten pribadimu di Telegram</text>
  <text x="640" y="94" font-family="DejaVu Sans" font-size="20" fill="#9aa0d0" text-anchor="middle">Dibuat dengan ❤️ · star repo ini kalau bermanfaat!</text>
</svg>`;

await sharp(Buffer.from(bannerSvg)).png().toFile(path.join(outDir, 'banner.png'));
await sharp(Buffer.from(footerSvg)).png().toFile(path.join(outDir, 'footer.png'));

for (const f of ['banner.png', 'footer.png']) {
  const p = path.join(outDir, f);
  console.log(f, fs.statSync(p).size, 'bytes');
}
