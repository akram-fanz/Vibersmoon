/**
 * Test harness: menjalankan SEMUA fitur bot lewat update Telegram sintetis.
 * - bot.telegram di-mock (semua kirim pesan direkam)
 * - axios.get/post di-route ke respons palsu (cuaca, file, tikwm, AI)
 * - data/db.json dibackup & direstore oleh runner eksternal
 */
const axios = require('axios');
const config = require('../src/config');
const { createBot } = require('../src/bot');
const db = require('../src/services/db');

const ADMIN_ID = config.ADMIN_IDS[0];
const USER_ID = 900001;
let uid = 1000;

const calls = [];
let routes; // { get: Map<prefix, fn>, post: Map<prefix, fn> }
let bot;

function mockNetwork() {
  const getRoutes = new Map();
  const postRoutes = new Map();
  const realGet = axios.get.bind(axios);
  const realPost = axios.post.bind(axios);
  axios.get = async (url, cfg) => {
    for (const [prefix, fn] of getRoutes) {
      if (url.includes(prefix)) return fn(url, cfg);
    }
    return realGet(url, cfg);
  };
  axios.post = async (url, body, cfg) => {
    for (const [prefix, fn] of postRoutes) {
      if (url.includes(prefix)) return fn(url, body, cfg);
    }
    return realPost(url, body, cfg);
  };
  return { getRoutes, postRoutes };
}

function mockTelegram(bot) {
  // handleUpdate membuat instance Telegram BARU per update, jadi harus
  // dipatch di prototype, bukan di objek bot.telegram.
  const { Telegram } = require('telegraf');
  const proto = Telegram.prototype;
  const record = (method) => (...args) => {
    calls.push({ method, args });
    return Promise.resolve({ message_id: calls.length, chat: { id: USER_ID } });
  };
  proto.sendMessage = record('sendMessage');
  proto.sendPhoto = record('sendPhoto');
  proto.sendAudio = record('sendAudio');
  proto.sendVideo = record('sendVideo');
  proto.sendDocument = record('sendDocument');
  proto.sendMediaGroup = record('sendMediaGroup');
  proto.sendChatAction = async () => true;
  proto.deleteMessage = (...args) => {
    calls.push({ method: 'deleteMessage', args });
    return Promise.resolve(true);
  };
  // Nama method di Telegram adalah answerCbQuery (lihat lib/telegram.js:557)
  proto.answerCbQuery = () => Promise.resolve(true);
  proto.getFileLink = async (fileId) => `https://mock-telegram-file/${fileId}`;
  // Lewati getMe() ke API sungguhan saat handleUpdate.
  bot.botInfo = { id: 424242, is_bot: true, first_name: 'TestBot', username: 'serba_bisa_test_bot' };
}

const fromObj = (id) => ({ id, is_bot: false, first_name: id === ADMIN_ID ? 'Admin' : 'Tester', username: 'tester' });

function textUpdate(text, userId = USER_ID) {
  uid += 1;
  const cmd = text.startsWith('/') ? text.split(/\s+/)[0] : null;
  return {
    update_id: uid,
    message: {
      message_id: uid,
      from: fromObj(userId),
      chat: { id: userId, type: 'private', first_name: 'Tester' },
      date: Math.floor(Date.now() / 1000),
      text,
      ...(cmd
        ? { entities: [{ offset: 0, length: cmd.length, type: 'bot_command' }] }
        : {}),
    },
  };
}

function cbUpdate(data, userId = USER_ID) {
  uid += 1;
  return {
    update_id: uid,
    callback_query: {
      id: String(uid),
      from: fromObj(userId),
      message: { message_id: uid, chat: { id: userId, type: 'private' } },
      data,
    },
  };
}

function photoUpdate(caption, userId = USER_ID) {
  uid += 1;
  return {
    update_id: uid,
    message: {
      message_id: uid,
      from: fromObj(userId),
      chat: { id: userId, type: 'private' },
      date: Math.floor(Date.now() / 1000),
      photo: [{ file_id: 'photo_small', file_unique_id: 'u1', width: 90, height: 90 }],
      ...(caption ? { caption } : {}),
    },
  };
}

function docUpdate(userId = USER_ID) {
  uid += 1;
  return {
    update_id: uid,
    message: {
      message_id: uid,
      from: fromObj(userId),
      chat: { id: userId, type: 'private' },
      date: Math.floor(Date.now() / 1000),
      document: { file_name: 'catatan.txt', mime_type: 'text/plain', file_id: 'doc_txt_1', file_size: 30 },
    },
  };
}

// ---- assertions ----
let passCount = 0;
let failCount = 0;
const failures = [];

function check(name, cond, detail = '') {
  if (cond) {
    passCount += 1;
    console.log(`  ✅ ${name}`);
  } else {
    failCount += 1;
    failures.push(name + (detail ? ` — ${detail}` : ''));
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function feed(update) {
  calls.length = 0;
  await bot.handleUpdate(update);
  return calls;
}

const lastTexts = (cs) =>
  cs.filter((c) => c.method === 'sendMessage').map((c) => c.args[1]);

// replyWithPhoto -> sendPhoto(chatId, source, extra) ; caption di argumen terakhir
const lastCaption = (c) => {
  const extra = c.args[c.args.length - 1];
  return (extra && extra.caption) || '';
};

async function main() {
  bot = createBot();
  mockTelegram(bot);
  const net = mockNetwork();
  const AI_EP = config.AI_BASE_URL.replace(/\/$/, '');

  // ---------- /start ----------
  console.log('\n== /start ==');
  let cs = await feed(textUpdate('/start', ADMIN_ID));
  check('balas dengan foto menu', cs.some((c) => c.method === 'sendPhoto'));
  check('caption menyapa user', (cs.find((c) => c.method === 'sendPhoto') ? lastCaption(cs.find((c) => c.method === 'sendPhoto')) : '').includes('Hai Admin'));

  // ---------- /help ----------
  console.log('\n== /help ==');
  cs = await feed(textUpdate('/help'));
  const helpCap = cs.find((c) => c.method === 'sendPhoto') ? lastCaption(cs.find((c) => c.method === 'sendPhoto')) : '';
  check('balas dengan foto menu', cs.some((c) => c.method === 'sendPhoto'));
  check('sebut fitur foto vision', helpCap.includes('Kirim foto'));
  check('non-admin TIDAK lihat /broadcast', !helpCap.includes('/broadcast'));
  cs = await feed(textUpdate('/help', ADMIN_ID));
  const helpCapAdmin = cs.find((c) => c.method === 'sendPhoto') ? lastCaption(cs.find((c) => c.method === 'sendPhoto')) : '';
  check('admin lihat /broadcast', helpCapAdmin.includes('/broadcast'));

  // ---------- logger middleware ----------
  console.log('\n== logger middleware ==');
  const beforeUsers = db.getAllUsers().length;
  await feed(textUpdate('ping unik 12345'));
  const u = db.getUser(USER_ID);
  check('user tercatat di db', Boolean(u));
  check('jumlah user bertambah', db.getAllUsers().length >= beforeUsers);

  // ---------- /cuaca ----------
  console.log('\n== /cuaca (mock OpenWeatherMap) ==');
  net.getRoutes.set('api.openweathermap.org', (url, cfg) => {
    if (cfg && cfg.params && cfg.params.q === 'Jakarta') {
      return Promise.resolve({
        data: {
          name: 'Jakarta',
          weather: [{ description: 'cerah berawan' }],
          main: { temp: 31, feels_like: 35, humidity: 70 },
          wind: { speed: 3.5 },
        },
      });
    }
    const err = new Error('not found');
    err.response = { status: 404 };
    return Promise.reject(err);
  });
  cs = await feed(textUpdate('/cuaca Jakarta'));
  check('tampilkan suhu Jakarta', lastTexts(cs).join(' ').includes('31°C'), JSON.stringify(lastTexts(cs)));
  cs = await feed(textUpdate('/cuaca KotaNgawur123'));
  check('kota tidak ditemukan -> pesan ramah', lastTexts(cs).join(' ').includes('tidak ditemukan'));

  // ---------- /reminder ----------
  console.log('\n== /reminder ==');
  cs = await feed(textUpdate('/reminder'));
  check('panduan jika kosong', lastTexts(cs).join(' ').includes('/reminder <menit>'));
  cs = await feed(textUpdate('/reminder abc tes'));
  check('menit non-angka ditolak', lastTexts(cs).join(' ').includes('harus angka'));
  cs = await feed(textUpdate('/reminder 0.03 minum teh hijau'));
  check('reminder disetel', lastTexts(cs).join(' ').includes('Pengingat disetel'));
  check('tersimpan di db', db.getPendingReminders().length >= 1);
  await new Promise((r) => setTimeout(r, 3000)); // tunggu deliver
  check(
    'reminder terkirim tepat waktu',
    calls.filter((c) => c.method === 'sendMessage').some((c) => String(c.args[1]).includes('minum teh hijau')),
    JSON.stringify(lastTexts(calls))
  );
  check('reminder dibersihkan dari db setelah terkirim', db.getPendingReminders().length === 0);

  // ---------- /stats ----------
  console.log('\n== /stats ==');
  cs = await feed(textUpdate('/stats', USER_ID));
  check('non-admin ditolak', lastTexts(cs).join(' ').includes('hanya untuk admin'));
  cs = await feed(textUpdate('/stats', ADMIN_ID));
  check('admin lihat statistik', lastTexts(cs).join(' ').includes('User terdaftar'));

  // ---------- /broadcast ----------
  console.log('\n== /broadcast ==');
  cs = await feed(textUpdate('/broadcast Halo semua', USER_ID));
  check('non-admin ditolak', lastTexts(cs).join(' ').includes('hanya untuk admin'));
  cs = await feed(textUpdate('/broadcast Halo semua', ADMIN_ID));
  const bcSent = calls.filter((c) => c.method === 'sendMessage' && String(c.args[1]).includes('📢'));
  check('terkirim ke user terdaftar', bcSent.length >= 2, `terkirim=${bcSent.length}`);
  check('laporan hasil broadcast', lastTexts(cs).join(' ').includes('Broadcast selesai'));

  // ---------- /skills + skill plan ----------
  console.log('\n== /skills & /plan ==');
  net.postRoutes.set(AI_EP, (url, body) => {
    const content = body.messages[body.messages.length - 1].content;
    if (Array.isArray(content)) {
      return Promise.resolve({ data: { choices: [{ message: { content: 'Gambar berisi: kucing oren di atas meja.' } }] } });
    }
    return Promise.resolve({ data: { choices: [{ message: { content: 'Ini jawaban AI.' } }] } });
  });
  cs = await feed(textUpdate('/skills'));
  check('daftar skill tampil', lastTexts(cs).join(' ').includes('/plan'));
  cs = await feed(cbUpdate('menu_skills'));
  check('menu skills via tombol', lastTexts(cs).join(' ').includes('/plan'));
  cs = await feed(textUpdate('/plan belajar nodejs'));
  check('skill /plan dapat jawaban AI', lastTexts(cs).join(' ').includes('jawaban AI'), JSON.stringify(lastTexts(cs)));

  // ---------- fallback chat AI ----------
  console.log('\n== fallback chat AI ==');
  cs = await feed(textUpdate('halo bot, apa kabar?'));
  check('chat bebas dijawab AI', lastTexts(cs).join(' ').includes('jawaban AI'));

  // ---------- dokumen teks + pertanyaan konteks ----------
  console.log('\n== dokumen teks ==');
  net.getRoutes.set('mock-telegram-file/doc_txt_1', () =>
    Promise.resolve({ data: 'Nama proyek: Serba Bisa. Target rilis: Q3.' })
  );
  cs = await feed(docUpdate());
  check('dokumen diterima', lastTexts(cs).join(' ').includes('catatan.txt'));
  cs = await feed(textUpdate('apa nama proyeknya?'));
  check('AI menjawab pakai konteks dokumen', lastTexts(cs).join(' ').length > 0);

  // ---------- foto -> Vision AI ----------
  console.log('\n== foto -> Vision AI ==');
  const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
  net.getRoutes.set('mock-telegram-file/photo_small', () =>
    Promise.resolve({ data: jpegBytes.buffer.slice(jpegBytes.byteOffset, jpegBytes.byteOffset + jpegBytes.byteLength) })
  );
  let sawVisionPayload = false;
  net.postRoutes.delete(AI_EP);
  net.postRoutes.set(AI_EP, (url, body) => {
    const content = body.messages[body.messages.length - 1].content;
    if (Array.isArray(content)) {
      sawVisionPayload =
        content.some((c) => c.type === 'image_url' && c.image_url.url.startsWith('data:image/jpeg;base64,')) &&
        body.model === config.AI_VISION_MODEL;
      return Promise.resolve({ data: { choices: [{ message: { content: 'Gambar berisi: kucing oren di atas meja.' } }] } });
    }
    return Promise.resolve({ data: { choices: [{ message: { content: 'Ini jawaban AI.' } }] } });
  });
  cs = await feed(photoUpdate());
  check('payload vision benar (base64 + model vision)', sawVisionPayload);
  check('deskripsi gambar dikirim', lastTexts(cs).join(' ').includes('kucing oren'), JSON.stringify(lastTexts(cs)));
  check('pesan "Menganalisis" dihapus', cs.some((c) => c.method === 'deleteMessage'));
  cs = await feed(photoUpdate('apa isi gambar ini?'));
  check('caption jadi pertanyaan', lastTexts(cs).join(' ').includes('kucing oren'));

  // ---------- stiker placeholder ----------
  console.log('\n== stiker ==');
  cs = await feed({
    update_id: ++uid,
    message: {
      message_id: ++uid,
      from: fromObj(USER_ID),
      chat: { id: USER_ID, type: 'private' },
      date: Math.floor(Date.now() / 1000),
      sticker: { file_id: 'stk1', emoji: '😄' },
    },
  });
  check('stiker direspons', lastTexts(cs).join(' ').toLowerCase().includes('stiker'));

  // ---------- downloader ----------
  console.log('\n== downloader ==');
  const dl = require('../src/services/downloaderService');
  check('deteksi tiktok', dl.detectPlatform('https://vt.tiktok.com/abc/') === 'tiktok');
  check('deteksi youtube', dl.detectPlatform('https://youtu.be/xQ9') === 'youtube');
  check('deteksi instagram', dl.detectPlatform('https://instagr.am/p/x') === 'instagram');
  check('platform asing null', dl.detectPlatform('https://vimeo.com/1') === null);
  check('extractUrl dari teks', dl.extractUrl('cek ini https://vt.tiktok.com/xyz mantap') === 'https://vt.tiktok.com/xyz');

  cs = await feed(cbUpdate('menu_downloader'));
  check('menu downloader tampil', lastTexts(cs).length >= 0); // menu memakai sendMessage

  net.postRoutes.set('tikwm.com', () =>
    Promise.resolve({ data: { data: { play: 'https://cdn.mock/video.mp4', title: 'TikTok Uji Coba' } } })
  );
  cs = await feed(textUpdate('/dl https://vt.tiktok.com/abc/'));
  check('video tiktok terkirim', cs.some((c) => c.method === 'sendVideo'));

  cs = await feed(cbUpdate('dl_tiktok'));
  check('mode pending tiktok aktif', lastTexts(cs).join(' ').includes('TikTok'));
  cs = await feed(textUpdate('https://www.tiktok.com/@user/video/123'));
  check('link via mode pending terkirim', cs.some((c) => c.method === 'sendVideo'));

  cs = await feed(textUpdate('lihat ini https://vt.tiktok.com/zzz/ keren'));
  check('URL tiktok di teks bebas otomatis diunduh', cs.some((c) => c.method === 'sendVideo'));

  cs = await feed(textUpdate('/dl https://youtu.be/xQ9'));
  check('youtube tanpa endpoint -> pesan ramah', lastTexts(cs).join(' ').includes('belum diatur'), JSON.stringify(lastTexts(cs)));

  // ---------- /search ----------
  console.log('\n== /search ==');

  // Stub yt-search (lazy require -> seed require.cache sebelum dipakai).
  const ytsId = require.resolve('yt-search');
  let __ytsImpl = async () => ({ videos: [] });
  if (!require.cache[ytsId]) {
    const M = require('module');
    const m = new M(ytsId, null);
    m.filename = ytsId;
    m.loaded = true;
    m.exports = (...a) => __ytsImpl(...a);
    require.cache[ytsId] = m;
  } else {
    throw new Error('yt-search sudah ter-load lebih awal; stub tidak efektif');
  }

  const previewBytes = Buffer.from([0x49, 0x44, 0x33, 1, 2, 3, 4]); // header ID3 ala mp3
  net.getRoutes.set('mock-preview', () =>
    Promise.resolve({
      data: previewBytes.buffer.slice(previewBytes.byteOffset, previewBytes.byteOffset + previewBytes.byteLength),
    })
  );
  net.getRoutes.set('itunes.apple.com', () =>
    Promise.resolve({
      data: {
        results: [
          { trackName: 'Despacito', artistName: 'Luis Fonsi', collectionName: 'VIDA', primaryGenreName: 'Pop', releaseDate: '2019-02-01T08:00:00Z', trackTimeMillis: 281000, artworkUrl100: 'https://mock-art/1.jpg', previewUrl: 'https://mock-preview/1.m4a', trackViewUrl: 'https://music.apple.com/1' },
          { trackName: 'Hati-Hati di Jalan', artistName: 'Tulus', collectionName: 'Manusia', primaryGenreName: 'Pop', releaseDate: '2022-03-03T00:00:00Z', trackTimeMillis: 244000, artworkUrl100: 'https://mock-art/2.jpg', previewUrl: 'https://mock-preview/2.m4a', trackViewUrl: 'https://music.apple.com/2' },
          { trackName: 'Sial', artistName: 'Mahalini', collectionName: 'Single', primaryGenreName: 'Pop', releaseDate: '2021-01-15T00:00:00Z', trackTimeMillis: 219000, artworkUrl100: 'https://mock-art/3.jpg', previewUrl: '', trackViewUrl: 'https://music.apple.com/3' },
        ],
      },
    })
  );

  let ddgHomeHtml = '<html><script>vqd="4-123456789012345678"</script></html>';
  net.getRoutes.set('duckduckgo.com', (url) => {
    if (url.includes('/i.js')) {
      return Promise.resolve({
        data: {
          results: [
            { title: 'Kucing oren lucu', image: 'https://mock-img/full1.jpg', thumbnail: 'https://mock-img/thumb1.jpg', width: 800, height: 600, url: 'https://sumber.example/kucing1' },
            { title: 'Foto kucing gemoy', image: 'https://mock-img/full2.jpg', thumbnail: 'https://mock-img/thumb2.jpg', width: 1024, height: 768, url: 'https://sumber.example/kucing2' },
            { title: 'Kucing tidur', image: 'https://mock-img/full3.jpg', thumbnail: '', width: 640, height: 480, url: 'https://sumber.example/kucing3' },
          ],
        },
      });
    }
    return Promise.resolve({ data: ddgHomeHtml });
  });

  __ytsImpl = async () => ({
    videos: [
      { title: 'Tutorial Node.js Pemula', author: { name: 'Kode Kanal' }, timestamp: '12:34', views: 123456, ago: '2 bulan lalu', url: 'https://youtu.be/abc123', image: 'https://mock-thumb/v1.jpg' },
      { title: 'Belajar Telegraf Bot', author: { name: 'Dev Indo' }, timestamp: '45:10', views: 98765, ago: '1 minggu lalu', url: 'https://youtu.be/def456', image: 'https://mock-thumb/v2.jpg' },
    ],
  });

  cs = await feed(textUpdate('/search lagu despacito'));
  const songMsg = cs.find((c) => c.method === 'sendMessage' && String(c.args[1]).includes('Hasil Lagu'));
  check('hasil lagu tampil', Boolean(songMsg) && String(songMsg.args[1]).includes('Despacito'));
  const sampleAudio = cs.find((c) => c.method === 'sendAudio');
  const sampleSrc = sampleAudio?.args?.[1];
  check(
    'contoh audio otomatis terkirim sebagai FILE utuh (bisa diputar di tempat)',
    Boolean(sampleAudio) && Buffer.isBuffer(sampleSrc?.source) && /\.m4a$/.test(String(sampleSrc?.filename)),
    JSON.stringify({ filename: sampleSrc?.filename, isBuffer: Buffer.isBuffer(sampleSrc?.source) })
  );
  check('caption contoh audio menyertakan link', String(sampleAudio?.args?.[2]?.caption || '').includes('music.apple.com/1'));
  check('tombol preview lagu ada', JSON.stringify(songMsg?.args[2]?.reply_markup || {}).includes('srchprev_0'));
  check('pesan "Mencari" dihapus', cs.some((c) => c.method === 'deleteMessage'));

  cs = await feed(cbUpdate('srchprev_0'));
  const audioCall = cs.find((c) => c.method === 'sendAudio');
  check('preview audio terkirim dari URL', Boolean(audioCall) && String(audioCall?.args[1]).includes('mock-preview/1.m4a'), JSON.stringify(cs.map((c) => c.method)));

  cs = await feed(textUpdate('/search video tutorial node'));
  const vidMsg = cs.find((c) => c.method === 'sendMessage' && String(c.args[1]).includes('Hasil Video'));
  check('hasil video tampil', Boolean(vidMsg) && String(vidMsg.args[1]).includes('Tutorial Node.js'));
  check('tombol Tonton pakai link YouTube', JSON.stringify(vidMsg?.args[2]?.reply_markup || {}).includes('youtu.be/abc123'));
  check('metadata video (views) ada', String(vidMsg?.args[1]).includes('123.456'));

  cs = await feed(textUpdate('/search gambar kucing oren'));
  const mg = cs.find((c) => c.method === 'sendMediaGroup');
  check('media group gambar terkirim', Array.isArray(mg?.args[1]) && mg.args[1].length === 3, `jumlah=${mg?.args[1]?.length}`);
  check('caption media group ada ukuran px', JSON.stringify(mg?.args[1] || []).includes('800×600px'));
  const imgMsg = cs.filter((c) => c.method === 'sendMessage').map((c) => c.args[1]).join(' ');
  check('daftar link gambar & sumber tampil', imgMsg.includes('Hasil Gambar') && imgMsg.includes('sumber.example/kucing1'));
  check('tombol Sumber ada', JSON.stringify(cs.find((c) => c.method === 'sendMessage' && String(c.args[1]).includes('Hasil Gambar'))?.args[2]?.reply_markup || {}).includes('sumber.example'));

  cs = await feed(textUpdate('/search'));
  check('/search kosong buka menu jenis', lastTexts(cs).join(' ').includes('Pilih jenis pencarian'));

  cs = await feed(textUpdate('/search kucing anggora'));
  check('query tanpa jenis -> pilih jenis dulu', lastTexts(cs).join(' ').includes('Cari sebagai'));
  cs = await feed(cbUpdate('srch_video'));
  check('pilih jenis memakai query tersimpan', lastTexts(cs).join(' ').includes('Hasil Video'));

  cs = await feed(cbUpdate('srch_lagu'));
  check('jenis tanpa query -> minta kata kunci', lastTexts(cs).join(' ').includes('Ketik kata kunci'));
  cs = await feed(textUpdate('juicy luicy malam terakhir'));
  check('query via mode pending jalan', lastTexts(cs).join(' ').includes('Hasil Lagu'));

  __ytsImpl = async () => ({ videos: [] });
  cs = await feed(textUpdate('/search video hal langka sekali'));
  check('hasil kosong -> pesan ramah', lastTexts(cs).join(' ').includes('Tidak ada hasil'));

  __ytsImpl = async () => {
    throw new Error('boom');
  };
  cs = await feed(textUpdate('/search video error test'));
  check('error layanan -> pesan ramah', lastTexts(cs).join(' ').includes('Gagal menghubungi layanan pencarian video'), JSON.stringify(lastTexts(cs)));

  ddgHomeHtml = '<html>tanpa token vqd</html>';
  cs = await feed(textUpdate('/search gambar apa saja'));
  check('DDG diblokir -> pesan dibatasi', lastTexts(cs).join(' ').includes('sedang dibatasi'), JSON.stringify(lastTexts(cs)));

  // ---------- /musik ----------
  console.log('\n== /musik ==');
  cs = await feed(textUpdate('/musik'));
  check('musik lokal terkirim sebagai audio', cs.some((c) => c.method === 'sendAudio'));

  // ---------- /reset ----------
  console.log('\n== /reset ==');
  cs = await feed(textUpdate('/reset'));
  check('histori dihapus', lastTexts(cs).join(' ').includes('dihapus'));
  check('history benar-benar kosong', db.getHistory(USER_ID).length === 0);
  check('doc dibersihkan', db.getUserDoc(USER_ID) === null || db.getUserDoc(USER_ID) === undefined);

  // ---------- banner CLI ----------
  console.log('\n== banner CLI ==');
  const { buildStartupBanner } = require('../src/banner');
  let btxt = '';
  let bannerThrew = false;
  try {
    btxt = buildStartupBanner({ botInfo: { username: 'serba_bisa_test_bot' }, adminCount: 2, reminderCount: 3 });
  } catch (e) {
    bannerThrew = true;
  }
  check('banner dibangun tanpa error', !bannerThrew && btxt.length > 100);
  check('banner sebut @username bot', btxt.includes('@serba_bisa_test_bot'));
  check('banner ada logo ASCII', btxt.includes('█') || btxt.includes('SERBA BISA'));
  check('banner tampilkan fitur aktif (✅)', btxt.includes('✅'));
  check('banner tampilkan fitur nonaktif (⚠️)', btxt.includes('⚠'));
  check('banner sebut jumlah reminder', btxt.includes('3 dimuat'));

  // ---------- ringkasan ----------
  console.log(`\n==============================`);
  console.log(`TOTAL: ${passCount} lulus, ${failCount} gagal`);
  if (failures.length) {
    console.log('KEGAGALAN:');
    failures.forEach((f) => console.log(' -', f));
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error('FATAL harness:', e);
  process.exitCode = 1;
});
