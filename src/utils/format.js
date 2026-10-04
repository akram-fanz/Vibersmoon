export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function truncate(text, max = 100) {
  return String(text).slice(0, max);
}

export function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${u[i]}`;
}

export function isUrl(str) {
  try { new URL(str); return true; } catch { return false; }
}

// Ubah output AI (markdown sederhana) jadi HTML aman untuk Telegram.
export function toTelegramHtml(text) {
  let s = escapeHtml(String(text));

  // Fenced code block: ```lang\n...\n```
  const parts = [];
  const re = /```(\w*)\n([\s\S]*?)```/g;
  let last = 0, m;
  while ((m = re.exec(s)) !== null) {
    parts.push(s.slice(last, m.index));
    const lang = m[1] ? ` class="language-${m[1]}"` : '';
    parts.push(`<pre><code${lang}>${m[2]}</code></pre>`);
    last = re.lastIndex;
  }
  parts.push(s.slice(last));
  s = parts.join('');

  // Inline code: `x`
  s = s.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  // Bold: **x** atau __x__
  s = s.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
  s = s.replace(/__([^_\n]+)__/g, '<b>$1</b>');
  // Italic: *x* (hati-hati jangan tabrak bold yang sudah jadi)
  s = s.replace(/(^|[\s(])\*([^*\n]+)\*(?=$|[\s).,!?])/g, '$1<i>$2</i>');
  return s;
}

// Pecah HTML Telegram jadi chunk aman (<4096 char), jangan potong di tengah tag.
export function splitHtml(html, chunk = 3900) {
  if (html.length <= chunk) return [html];
  const openTags = [];
  const chunks = [];
  let cur = '';
  // tokenisasi tag vs teks
  const tokens = html.split(/(<[^>]+>)/g).filter(Boolean);
  for (const tok of tokens) {
    if (cur.length + tok.length > chunk && cur.length > 0) {
      // tutup tag yang masih terbuka di akhir chunk ini
      chunks.push(cur + openTags.slice().reverse().map((t) => `</${t}>`).join(''));
      // buka lagi tag aktif di chunk berikutnya
      cur = openTags.map((t) => `<${t}>`).join('');
    }
    cur += tok;
    const m = /^<(\/?)(\w+)/.exec(tok);
    if (m && !tok.endsWith('/>')) {
      if (m[1] === '/') {
        const idx = openTags.lastIndexOf(m[2]);
        if (idx !== -1) openTags.splice(idx, 1);
      } else {
        openTags.push(m[2]);
      }
    }
  }
  if (cur.trim()) chunks.push(cur);
  return chunks;
}
