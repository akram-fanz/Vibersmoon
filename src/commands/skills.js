const aiService = require('../services/aiService');
const { toTelegramHtml, splitHtml } = require('../utils/format');

// Semua skill cukup didefinisikan di sini. Tambah skill = tambah 1 objek.
const SKILLS = [
  {
    name: 'plan',
    description: 'Buat rencana langkah-demi-langkah dari topik',
    prompt:
      'Kamu adalah asisten perencana. Dari topik yang diberikan pengguna, buat rencana yang jelas dan terstruktur: gunakan langkah bernomor (1, 2, 3), setiap langkah singkat & bisa dijalankan. Bahasa Indonesia. Jangan beri penjelasan berlebih di luar rencana.',
  },
  // Contoh menambah skill lain (cukup copas & ubah):
  // {
  //   name: 'translate',
  //   description: 'Terjemahkan teks ke bahasa target',
  //   prompt: 'Kamu adalah penerjemah. Terjemahkan teks pengguna ke bahasa yang diminta. Jawab hanya hasil terjemahan.',
  // },
  // {
  //   name: 'summary',
  //   description: 'Ringkas teks/artikel jadi poin-poin',
  //   prompt: 'Kamu adalah editor. Ringkas teks pengguna menjadi 3-5 poin utama yang padat. Bahasa Indonesia.',
  // },
];

function skillListText() {
  return (
    '🧠 *Daftar Skill*\n\n' +
    SKILLS.map((s) => `/${s.name} - ${s.description}`).join('\n') +
    '\n\nKetik perintahnya, mis. /plan belajar Node.js'
  );
}

function skillKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: SKILLS.map((s) => [
        { text: `🧠 /${s.name}`, callback_data: `skill_${s.name}` },
      ]),
    },
  };
}

async function runSkill(ctx, skill, arg) {
  if (!arg) {
    return ctx.reply(`Pakai: /${skill.name} <topik/teks>\n${skill.description}`);
  }
  try {
    const reply = await aiService.chat(ctx.from.id, arg, null, skill.prompt);
    const html = toTelegramHtml(reply);
    for (const chunk of splitHtml(html)) {
      await ctx.reply(chunk, { parse_mode: 'HTML' });
    }
  } catch (e) {
    ctx.reply(`❌ ${e.message}`);
  }
}

function register(bot) {
  bot.command('skills', (ctx) => {
    ctx.reply(skillListText(), { parse_mode: 'Markdown', ...skillKeyboard() });
  });

  bot.action('menu_skills', (ctx) => {
    ctx.answerCbQuery();
    ctx.reply(skillListText(), { parse_mode: 'Markdown', ...skillKeyboard() });
  });

  for (const s of SKILLS) {
    bot.command(s.name, (ctx) => {
      const arg = ctx.message.text.split(' ').slice(1).join(' ').trim();
      return runSkill(ctx, s, arg);
    });

    bot.action(`skill_${s.name}`, (ctx) => {
      ctx.answerCbQuery();
      ctx.reply(`Ketik /${s.name} <topik>, contoh: /${s.name} belajar Node.js`);
    });
  }
}

module.exports = { register, SKILLS };
