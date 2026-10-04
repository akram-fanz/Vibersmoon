import { getWeather } from '../services/weatherService.js';

export function register(bot) {
  bot.command('cuaca', async (ctx) => {
    const city = ctx.message.text.replace(/^\/cuaca\s*/, '').trim();
    if (!city) return ctx.reply('Gunakan: /cuaca <nama kota>');
    try {
      const info = await getWeather(city);
      ctx.replyWithMarkdown(info);
    } catch (e) {
      ctx.reply(`❌ ${e.message}`);
    }
  });
}
