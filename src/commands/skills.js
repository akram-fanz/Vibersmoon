import { chat as aiChat } from '../services/aiService.js';
import { toTelegramHtml, splitHtml } from '../utils/format.js';

const SKILLS = [
  { name: 'plan', description: 'Buat rencana langkah-demi-langkah dari topik',
    prompt: 'Kamu adalah asisten perencana. Dari topik yang diberikan pengguna, buat rencana yang jelas dan terstruktur: gunakan langkah bernomor (1, 2, 3), setiap langkah singkat & bisa dijalankan. Bahasa Indonesia.' },
];

function skillListText() {
  return '🧠 *Daftar Skill*\n\n' + SKILLS.map((s) => `/${s.name} - ${s.description}`).join('\n') + '\n\nKetik perintahnya, mis. /plan belajar Node.js';
}

function skillKeyboard() {
  return { reply_markup: { inline_keyboard: SKILLS.map((s) => [{ text: `🧠 /${s.name}`, callback_data: `skill_${s.name}` }]) } };
}

async function runSkill(ctx, skill, arg) {
  if (!arg) return ctx.reply(`Pakai: /${skill.name} <topik/teks>\n${skill.description}`);
  try {
    const reply = await aiChat(ctx.from.id, arg, null, skill.prompt);
    const html = toTelegramHtml(reply);
    for (const chunk of splitHtml(html)) await ctx.reply(chunk, { parse_mode: 'HTML' });
  } catch (e) {
    ctx.reply(`❌ ${e.message}`);
  }
}

export function register(bot) {
  bot.command('skills', (ctx) => { ctx.reply(skillListText(), { parse_mode: 'Markdown', ...skillKeyboard() }); });
  bot.callbackQuery('menu_skills', (ctx) => { ctx.answerCallbackQuery(); ctx.reply(skillListText(), { parse_mode: 'Markdown', ...skillKeyboard() }); });
  for (const s of SKILLS) {
    bot.command(s.name, (ctx) => runSkill(ctx, s, ctx.message.text.split(' ').slice(1).join(' ').trim()));
    bot.callbackQuery(`skill_${s.name}`, (ctx) => { ctx.answerCallbackQuery(); ctx.reply(`Ketik /${s.name} <topik>`); });
  }
}

export { SKILLS };
