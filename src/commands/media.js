import axios from 'axios';
import { chat as aiChat } from '../services/aiService.js';
import { sendReply } from './ai.js';
import { getFileLink } from '../utils/telegram.js';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

async function handlePhoto(ctx) {
  const photo = ctx.message.photo[ctx.message.photo.length - 1];
  const question = (ctx.message.caption || '').trim();

  if (photo.file_size && photo.file_size > MAX_IMAGE_BYTES) {
    return ctx.reply('❌ Gambar terlalu besar (maksimal ~5MB).');
  }

  let waitMsg;
  try {
    waitMsg = await ctx.reply('🔍 Menganalisis gambar…');
    const link = await getFileLink(ctx, photo.file_id);
    const res = await axios.get(link, { responseType: 'arraybuffer', timeout: 20000, maxContentLength: MAX_IMAGE_BYTES });
    const dataUrl = `data:image/jpeg;base64,${Buffer.from(res.data).toString('base64')}`;
    const reply = await aiChat(ctx.from.id, dataUrl, question);
    await sendReply(ctx, reply);
  } catch (e) {
    if (/timeout|ECONNABORTED/i.test(e.message || '')) {
      return ctx.reply('❌ Analisis gambar memakan waktu terlalu lama.');
    }
    ctx.reply(`❌ ${e.message}`);
  } finally {
    if (waitMsg) ctx.deleteMessage(waitMsg.message_id).catch(() => {});
  }
}

export function register(bot) {
  bot.on('message:photo', handlePhoto);
  bot.on('message:sticker', (ctx) => ctx.reply('😄 Stiker lucu!'));
}
