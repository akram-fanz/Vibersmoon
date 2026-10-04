import axios from 'axios';

const INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://api.piped.private.coffee',
];

export async function search(query, type = 'videos') {
  const filter = type === 'music_songs' || type === 'music' ? 'music_songs' : 'videos';
  for (const base of INSTANCES) {
    try {
      const res = await axios.get(`${base}/search`, {
        params: { q: query, filter },
        timeout: 8000,
      });
      const items = (res.data?.items || [])
        .filter((it) => (it.url || it.id) && (it.title || it.name))
        .slice(0, 8)
        .map((it) => ({
          title: it.title || it.name,
          url: it.url?.startsWith('http') ? it.url : `https://youtube.com${it.url || '/watch?v=' + it.id}`,
          duration: it.duration > 0 ? it.duration : null,
          uploader: it.uploaderName || it.uploader_name || '',
        }));
      if (items.length) return items;
    } catch { /* instance berikutnya */ }
  }
  throw new Error('Gagal mencari. Layanan pencarian sedang bermasalah, coba lagi.');
}

export default { search };
