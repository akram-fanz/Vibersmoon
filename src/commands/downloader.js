const downloaderService = require('../services/downloaderService');

const pendingPlatform = new Map();
const LABELS = { tiktok: 'TikTok', youtube: 'YouTube', instagram: 'Instagram' };

async function handleDownload(ctx, url, forcePlatform) {
  const platform = forcePlatform || downloaderService.detectPlatform(url);
  if (!platform) {
    return ctx.reply('❌ Link tidak dikenali. Kirim link TikTok, YouTube, atau Instagram.');
  }
  const wait = ctx.reply('⏳ Memproses…');
  try {
    const media = await downloaderService.getMediaUrl(platform, url);
    await downloaderService.sendMedia(ctx, media);
  } catch (e) {
    ctx.reply(`❌ ${e.message}`);
  }
}

function register(bot) {
  bot.action('menu_downloader', (ctx) => {
    ctx.answerCbQuery();
    ctx.reply('⬇️ Pilih platform untuk download:', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎵 TikTok', callback_data: 'dl_tiktok' }],
          [{ text: '▶️ YouTube', callback_data: 'dl_youtube' }],
          [{ text: '📸 Instagram', callback_data: 'dl_ig' }],
          [{ text: '🔙 Kembali', callback_data: 'menu_help' }],
        ],
      },
    });
  });

  const setPending = (platform) => (ctx) => {
    ctx.answerCbQuery();
    pendingPlatform.set(ctx.from.id, platform);
    ctx.reply(`Kirim link ${LABELS[platform]} yang mau diunduh:`);
  };
  bot.action('dl_tiktok', setPending('tiktok'));
  bot.action('dl_youtube', setPending('youtube'));
  bot.action('dl_ig', setPending('instagram'));

  bot.command('dl', async (ctx) => {
    const url = ctx.message.text.replace('/dl', '').trim();
    if (!url) return ctx.reply('Pakai: /dl <url tiktok/youtube/ig>');
    await handleDownload(ctx, url);
  });

  // Handler teks: didahulukan dari fallback AI.
  bot.on('text', async (ctx, next) => {
    const text = ctx.message.text;
    if (text.startsWith('/')) return next();

    const platform = pendingPlatform.get(ctx.from.id);
    const url = downloaderService.extractUrl(text);

    if (platform) {
      pendingPlatform.delete(ctx.from.id);
      if (url) {
        await handleDownload(ctx, url, platform);
        return;
      }
      return next(); // pesan bukan link -> batalkan mode pending, serahkan ke AI
    }

    if (url && downloaderService.isDownloadUrl(text)) {
      await handleDownload(ctx, url);
      return;
    }

    return next();
  });
}

module.exports = { register };
