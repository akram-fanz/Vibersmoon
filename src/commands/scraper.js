import { InputFile } from 'grammy';
import { BotError } from '../core/errors.js';
import { logger } from '../core/logger.js';
import { createJobDir, cleanupJob } from '../core/tempStore.js';
import { providerRouter } from '../services/downloader/providers.js';

export function registerScraper(bot) {
  bot.command('scraper', async (ctx) => {
    const arg = (ctx.message.text || '').replace(/^\/scraper\s*/, '').trim();
    if (!arg) {
      return ctx.reply(
        '🖥 *Scraper*\n\n' +
        '/scraper screenshot <url> — tangkap halaman web\n' +
        '/scraper meta <url> — meta tags & OpenGraph\n' +
        '/scraper text <url> — ekstrak teks utama\n\nContoh: /scraper meta https://example.com',
        { parse_mode: 'Markdown' }
      );
    }
    const [mode, url] = arg.split(/\s+/);
    if (!url) return ctx.reply('❌ URL tidak ditemukan.\nGunakan: /scraper <mode> <url>');
    if (!url.match(/^https?:\/\//)) return ctx.reply('❌ URL harus http/https.');
    const status = await ctx.reply('⏳ Memproses…');
    try {
      if (mode === 'screenshot') {
        const result = await runScreenshot(url);
        await ctx.deleteMessage(status.message_id).catch(() => {});
        await ctx.replyWithPhoto(new InputFile(result.filePath), { caption: `📸 Screenshot: ${url}` });
      } else if (mode === 'meta') {
        const meta = await runMeta(url);
        await ctx.deleteMessage(status.message_id).catch(() => {});
        await ctx.reply(`📋 <b>Meta: ${url}</b>\n${meta}`, { parse_mode: 'HTML' });
      } else if (mode === 'text') {
        const text = await runTextExtract(url);
        await ctx.deleteMessage(status.message_id).catch(() => {});
        for (const chunk of splitText(text, 3500)) await ctx.reply(chunk);
      } else {
        await ctx.deleteMessage(status.message_id).catch(() => {});
        await ctx.reply('❌ Mode tidak dikenal. Pilih: screenshot / meta / text');
      }
    } catch (e) {
      try { await ctx.deleteMessage(status.message_id).catch(() => {}); } catch { /* abaikan */ }
      await ctx.reply(`❌ Gagal: ${e.message}`);
      logger.error({ err: e.message, url, mode }, 'Scraper error');
    }
  });
}

async function runScreenshot(url) {
  const puppeteer = await import('puppeteer').catch(() => null);
  if (!puppeteer) throw new BotError('Scraper screenshot butuh puppeteer.');
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    const buf = await page.screenshot({ fullPage: true, type: 'png' });
    const { dir } = await createJobDir();
    const path = `${dir}/screenshot.png`;
    const fs = await import('node:fs/promises');
    await fs.writeFile(path, buf);
    return { filePath: path };
  } finally {
    await browser.close();
  }
}

async function runMeta(url) {
  const { default: axios } = await import('axios');
  const { load } = await import('cheerio');
  const { data } = await axios.get(url, { timeout: 15000, headers: { 'User-Agent': 'Vibersmoon/2.0' } });
  const $ = load(data);
  const lines = [];
  const og = {};
  $('meta').each((_, el) => {
    const prop = $(el).attr('property') || $(el).attr('name') || '';
    const content = $(el).attr('content') || '';
    if (prop.startsWith('og:')) og[prop] = content;
    if (prop === 'title') lines.push(`<b>Title:</b> ${escapeHtml(content)}`);
  });
  if (og['og:title']) lines.push(`<b>OG Title:</b> ${escapeHtml(og['og:title'])}`);
  if (og['og:description']) lines.push(`<b>Deskripsi:</b> ${escapeHtml(og['og:description'])}`);
  if (og['og:image']) lines.push(`🖼 <b>Gambar:</b> ${escapeHtml(og['og:image'])}`);
  if ($('title').text()) lines.push(`<b>Title tag:</b> ${escapeHtml($('title').text())}`);
  return lines.join('\n') || 'Tidak ada meta ditemukan.';
}

async function runTextExtract(url) {
  const { default: axios } = await import('axios');
  const { load } = await import('cheerio');
  const { data } = await axios.get(url, { timeout: 15000, headers: { 'User-Agent': 'Vibersmoon/2.0' } });
  const $ = load(data);
  $('script, style, noscript, iframe, nav, footer, header').remove();
  let text = $('body').text() || '';
  text = text.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+/g, ' ').trim();
  return text.slice(0, 10000) || 'Tidak ada teks ditemukan.';
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function splitText(text, chunk = 3500) {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunk) chunks.push(text.slice(i, i + chunk));
  return chunks;
}
