const axios = require('axios');
const aiService = require('../services/aiService');
const { sendReply } = require('./ai');

// Foto Telegram terkompresi selalu jpeg. Batas unduhan agar base64 tidak membengkak.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

async function handlePhoto(ctx) {
  // Ambil resolusi tertinggi dari array foto.
  const photo = ctx.message.photo[ctx.message.photo.length - 1];
  const question = (ctx.message.caption || '').trim();

  if (photo.file_size && photo.file_size > MAX_IMAGE_BYTES) {
    return ctx.reply('❌ Gambar terlalu besar (maksimal ~5MB). Coba kirim foto yang lebih kecil.');
  }

  let waitMsg;
  try {
    waitMsg = await ctx.reply('🔍 Menganalisis gambar…');
    const link = await ctx.telegram.getFileLink(photo.file_id);
    const res = await axios.get(link, {
      responseType: 'arraybuffer',
      timeout: 20000,
      maxContentLength: MAX_IMAGE_BYTES,
    });
    const dataUrl = `data:image/jpeg;base64,${Buffer.from(res.data).toString('base64')}`;
    const reply = await aiService.analyzeImage(ctx.from.id, dataUrl, question);
    if (waitMsg) ctx.deleteMessage(waitMsg.message_id).catch(() => {});
    await sendReply(ctx, reply);
  } catch (e) {
    if (waitMsg) ctx.deleteMessage(waitMsg.message_id).catch(() => {});
    if (e.code === 'ECONNABORTED' || /timeout/i.test(e.message || '')) {
      return ctx.reply('❌ Analisis gambar memakan waktu terlalu lama. Coba lagi atau kirim gambar lebih kecil.');
    }
    if (/maxContentLength|maxBodyLength/i.test(e.message || '')) {
      return ctx.reply('❌ Gambar terlalu besar (maksimal ~5MB). Coba kirim foto yang lebih kecil.');
    }
    ctx.reply(`❌ ${e.message}`);
  }
}

function register(bot) {
  bot.on('photo', handlePhoto);
  bot.on('sticker', (ctx) => {
    ctx.reply('😄 Stiker lucu! Respons media masih berstatus placeholder.');
  });
}

module.exports = { register };
