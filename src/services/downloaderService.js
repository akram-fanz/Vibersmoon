const axios = require('axios');
const config = require('../config');

const PLATFORM_HOSTS = {
  tiktok: /(tiktok\.com|vt\.tiktok\.com|tiktokcdn)/i,
  youtube: /(youtube\.com|youtu\.be|yt\.be)/i,
  instagram: /(instagram\.com|instagr\.am|ig\.com)/i,
};

function detectPlatform(url) {
  if (!url || typeof url !== 'string') return null;
  for (const [p, re] of Object.entries(PLATFORM_HOSTS)) {
    if (re.test(url)) return p;
  }
  return null;
}

function isDownloadUrl(text) {
  if (!text) return false;
  const url = extractUrl(text);
  return url ? detectPlatform(url) !== null : false;
}

function extractUrl(text) {
  const m = text.match(/https?:\/\/\S+/i);
  return m ? m[0].replace(/[)>]/g, '') : null;
}

async function getTikTokMedia(url) {
  const res = await axios.post(
    'https://www.tikwm.com/api/',
    new URLSearchParams({ url, count: '12' }).toString(),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 20000,
    }
  );
  const d = res.data && res.data.data;
  if (!d || (!d.play && !d.music)) {
    throw new Error('Tidak bisa mengambil media dari link TikTok tersebut.');
  }
  if (d.music && !d.play) {
    return { mediaUrl: d.music, type: 'audio', title: d.title || 'TikTok audio' };
  }
  return { mediaUrl: d.play, type: 'video', title: d.title || 'TikTok video' };
}

function findMediaUrl(obj) {
  if (!obj) return null;
  const str = JSON.stringify(obj);
  const extRe = /https?:\/\/[^"'\\\s]+\.(mp4|webm|m4a|mp3|ogg)(?:\?[^"'\\\s]*)?/i;
  const em = str.match(extRe);
  if (em) {
    const u = em[0];
    const type = /\.(mp3|m4a|ogg)/i.test(u) ? 'audio' : 'video';
    return { url: u, type };
  }
  const keys = ['downloadUrl', 'url', 'videoUrl', 'mp4', 'mediaUrl', 'result', 'hd'];
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.startsWith('http')) {
      const type = /\.(mp3|m4a|ogg)/i.test(v) ? 'audio' : 'video';
      return { url: v, type };
    }
  }
  return null;
}

async function getGenericMedia(platform, url) {
  const ep = platform === 'youtube' ? config.YT_DL_API_URL : config.IG_DL_API_URL;
  if (!ep) {
    throw new Error(
      `Endpoint download ${platform} belum diatur. Isi ${
        platform === 'youtube' ? 'YT_DL_API_URL' : 'IG_DL_API_URL'
      } di .env (atau pakai layanan ber-key).`
    );
  }
  let res;
  try {
    res = await axios.post(
      ep,
      { url },
      { timeout: 20000, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    throw new Error(`Gagal menghubungi layanan ${platform}: ${e.message}`);
  }
  const found = findMediaUrl(res.data);
  if (!found) throw new Error(`Layanan ${platform} tidak mengembalikan URL media.`);
  return { mediaUrl: found.url, type: found.type, title: 'Media' };
}

async function getMediaUrl(platform, url) {
  if (platform === 'tiktok') return getTikTokMedia(url);
  if (platform === 'youtube') return getGenericMedia('youtube', url);
  if (platform === 'instagram') return getGenericMedia('instagram', url);
  throw new Error('Platform tidak didukung.');
}

async function sendMedia(ctx, { mediaUrl, type, title }) {
  if (type === 'audio') return ctx.replyWithAudio(mediaUrl, { caption: title || '' });
  if (type === 'video') return ctx.replyWithVideo(mediaUrl, { caption: title || '' });
  return ctx.replyWithDocument(mediaUrl, { caption: title || '' });
}

module.exports = { detectPlatform, isDownloadUrl, extractUrl, getMediaUrl, sendMedia };
