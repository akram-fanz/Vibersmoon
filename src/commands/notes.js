import fs from 'fs';
import path from 'path';

const NOTES_DIR = path.join(process.cwd(), 'notes');

function ensureDir() { if (!fs.existsSync(NOTES_DIR)) fs.mkdirSync(NOTES_DIR, { recursive: true }); }
function notePath(name) { return path.join(NOTES_DIR, `${name}.md`); }

async function cmdCreate(ctx) {
  const parts = ctx.message.text.split(' ').slice(1);
  const name = parts.shift();
  if (!name) return ctx.reply('Gunakan: /note buat <nama>\nLalu kirim isi sebagai reply.');
  const text = parts.join(' ') || (ctx.message.reply_to_message?.text || '');
  if (!text) return ctx.reply('Kirim isi catatan sebagai reply, atau sertakan teks: /note buat <nama> <isi>');
  ensureDir();
  fs.writeFileSync(notePath(name), text, 'utf-8');
  ctx.reply(`📝 Catatan <b>${name}</b> tersimpan.`, { parse_mode: 'HTML' });
}

async function cmdGet(ctx) {
  const name = (ctx.message.text || '').replace(/^\/note\s*(?:lihat|ambil|baca)?\s*/, '').trim();
  if (!name) return ctx.reply('Gunakan: /note lihat <nama>');
  const p = notePath(name);
  if (!fs.existsSync(p)) return ctx.reply('❌ Catatan tidak ditemukan.');
  const content = fs.readFileSync(p, 'utf-8');
  const chunks = content.match(new RegExp(`.{1,4000}`, 'gs')) || [content];
  for (const chunk of chunks) await ctx.reply(`📄 <b>${name}</b>\n\n${chunk.slice(0, 4000)}`, { parse_mode: 'HTML' });
}

async function cmdDelete(ctx) {
  const name = (ctx.message.text || '').replace(/^\/note hapus\s*/, '').trim();
  if (!name) return ctx.reply('Gunakan: /note hapus <nama>');
  const p = notePath(name);
  if (!fs.existsSync(p)) return ctx.reply('❌ Tidak ditemukan.');
  fs.unlinkSync(p);
  ctx.reply(`🗑 Catatan <b>${name}</b> dihapus.`, { parse_mode: 'HTML' });
}

async function cmdList(ctx) {
  ensureDir();
  const files = fs.readdirSync(NOTES_DIR).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3));
  if (!files.length) return ctx.reply('📭 Belum ada catatan.');
  await ctx.reply(`📝 Catatan: ${files.map((n) => `📄 ${n}`).join(', ')}`);
}

export function register(bot) {
  bot.command('note', async (ctx) => {
    const text = ctx.message.text;
    if (/buat|tambah|create/i.test(text)) return cmdCreate(ctx);
    if (/hapus|del|delete/i.test(text)) return cmdDelete(ctx);
    return cmdGet(ctx);
  });
}
