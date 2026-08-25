const weatherService = require('../services/weatherService');

function register(bot) {
  bot.command('cuaca', async (ctx) => {
    const city = ctx.message.text.split(' ').slice(1).join(' ').trim();
    if (!city) {
      return ctx.reply('Gunakan: /cuaca <nama kota>\nContoh: /cuaca Jakarta');
    }
    try {
      const info = await weatherService.getWeather(city);
      ctx.replyWithMarkdown(info);
    } catch (e) {
      ctx.reply(`❌ ${e.message}`);
    }
  });
}

module.exports = { register };
