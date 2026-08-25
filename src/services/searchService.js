const axios = require('axios');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function searchSongs(query, limit = 5) {
  let res;
  try {
    res = await axios.get('https://itunes.apple.com/search', {
      params: { term: query, media: 'music', limit, country: 'ID' },
      timeout: 15000,
    });
  } catch (e) {
    const err = new Error('Gagal menghubungi layanan pencarian lagu. Coba beberapa saat lagi.');
    err.code = 'SEARCH_ERROR';
    throw err;
  }
  return (res.data.results || []).map((r) => ({
    kind: 'song',
    title: r.trackName || '-',
    artist: r.artistName || '-',
    album: r.collectionName || '',
    genre: r.primaryGenreName || '',
    year: r.releaseDate ? String(r.releaseDate).slice(0, 4) : '',
    durationSec: Math.round((r.trackTimeMillis || 0) / 1000),
    artwork: r.artworkUrl100 || '',
    previewUrl: r.previewUrl || '',
    link: r.trackViewUrl || '',
  }));
}

async function searchVideos(query, limit = 5) {
  // Lazy require: memudahkan stub saat test & tidak menambah beban startup.
  const yts = require('yt-search');
  let r;
  try {
    r = await yts({ query, pages: 1 });
  } catch (e) {
    const err = new Error('Gagal menghubungi layanan pencarian video. Coba beberapa saat lagi.');
    err.code = 'SEARCH_ERROR';
    throw err;
  }
  return (r.videos || []).slice(0, limit).map((v) => ({
    kind: 'video',
    title: v.title || '-',
    channel: (v.author && v.author.name) || '',
    duration: v.timestamp || '',
    views: typeof v.views === 'number' ? v.views : 0,
    ago: v.ago || '',
    link: v.url || '',
    thumbnail: v.image || '',
  }));
}

async function searchImages(query, limit = 5) {
  let home;
  try {
    home = await axios.get('https://duckduckgo.com/', {
      params: { q: query },
      headers: { 'User-Agent': UA },
      timeout: 15000,
    });
  } catch (e) {
    const err = new Error('Gagal menghubungi layanan pencarian gambar. Coba beberapa saat lagi.');
    err.code = 'SEARCH_ERROR';
    throw err;
  }

  const html = String(home.data || '');
  const m = html.match(/vqd=['"]([\w-]{6,})['"]/) || html.match(/vqd=([\w-]{6,})/);
  if (!m) {
    const err = new Error('Layanan pencarian gambar sedang dibatasi. Coba lagi nanti.');
    err.code = 'IMG_BLOCKED';
    throw err;
  }

  let res;
  try {
    res = await axios.get('https://duckduckgo.com/i.js', {
      params: { l: 'id-id', o: 'json', q: query, vqd: m[1], f: ',,,', p: '1' },
      headers: { 'User-Agent': UA, Referer: 'https://duckduckgo.com/', Accept: 'application/json' },
      timeout: 15000,
    });
  } catch (e) {
    const err = new Error('Gagal mengambil hasil gambar. Coba beberapa saat lagi.');
    err.code = 'SEARCH_ERROR';
    throw err;
  }

  return (res.data.results || []).slice(0, limit).map((r) => ({
    kind: 'image',
    title: r.title || '(tanpa judul)',
    width: r.width || 0,
    height: r.height || 0,
    image: r.image || '',
    thumbnail: r.thumbnail || '',
    source: r.url || '',
  }));
}

module.exports = { searchSongs, searchVideos, searchImages };
