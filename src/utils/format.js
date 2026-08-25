function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function extractParts(text) {
  const parts = [];
  const re = /```(\w+)?\n?/g;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    const openIdx = m.index;
    const openLen = m[0].length;
    const lang = m[1] || '';
    const closeIdx = text.indexOf('```', openIdx + openLen);
    if (openIdx > last) parts.push({ type: 'text', content: text.slice(last, openIdx) });
    if (closeIdx === -1) {
      // fence tidak ditutup -> sisa sampai akhir dianggap code
      parts.push({ type: 'code', lang, content: text.slice(openIdx + openLen) });
      last = text.length;
      break;
    }
    const code = text
      .slice(openIdx + openLen, closeIdx)
      .replace(/^\n/, '')
      .replace(/\n$/, '');
    parts.push({ type: 'code', lang, content: code });
    last = closeIdx + 3;
    re.lastIndex = closeIdx + 3;
  }
  if (last < text.length) parts.push({ type: 'text', content: text.slice(last) });
  return parts;
}

function toTelegramHtml(text) {
  return extractParts(text)
    .map((p) =>
      p.type === 'text'
        ? escapeHtml(p.content)
        : `<pre><code>${escapeHtml(p.content)}</code></pre>`
    )
    .join('');
}

const LANG_EXT = {
  // JavaScript / TypeScript
  js: 'js', javascript: 'js', jsx: 'jsx', ts: 'ts', typescript: 'ts', tsx: 'tsx',
  mjs: 'mjs', cjs: 'cjs', vue: 'vue', svelte: 'svelte',
  // Python
  py: 'py', python: 'py', py3: 'py', ipynb: 'ipynb',
  // JVM
  java: 'java', kt: 'kt', kotlin: 'kt', scala: 'scala', groovy: 'groovy',
  // C / C++
  c: 'c', h: 'h', cpp: 'cpp', 'c++': 'cpp', cc: 'cc', cxx: 'cxx', hpp: 'hpp',
  hxx: 'hxx', cu: 'cu', cuh: 'cuh',
  // C# / .NET
  cs: 'cs', csharp: 'cs', vb: 'vb', vbnet: 'vb',
  // Web
  php: 'php', rb: 'rb', ruby: 'rb', go: 'go', golang: 'go', rs: 'rs', rust: 'rs',
  // Lainnya
  swift: 'swift', dart: 'dart', r: 'r', perl: 'pl', pl: 'pl', lua: 'lua',
  pas: 'pas', pascal: 'pas', sql: 'sql',
  // Shell / scripting
  sh: 'sh', bash: 'sh', shell: 'sh', zsh: 'zsh', fish: 'fish',
  ps1: 'ps1', powershell: 'ps1', bat: 'bat', cmd: 'bat',
  // Markup / data
  html: 'html', htm: 'htm', css: 'css', scss: 'scss', sass: 'sass', less: 'less',
  json: 'json', xml: 'xml', yaml: 'yaml', yml: 'yml', toml: 'toml', ini: 'ini',
  csv: 'csv', tsv: 'tsv', env: 'env',
  // Dokumen / lainnya
  md: 'md', markdown: 'md', tex: 'tex', latex: 'tex',
  dockerfile: 'dockerfile', makefile: 'makefile', graphql: 'graphql', gql: 'graphql',
  proto: 'proto', tcl: 'tcl', asm: 'asm', nasm: 'asm', haskell: 'hs', hs: 'hs',
  elixir: 'ex', ex: 'ex', exs: 'exs', erlang: 'erl', erl: 'erl', clj: 'clj',
  lisp: 'lisp', elm: 'elm', cobol: 'cbl', fortran: 'f90', f90: 'f90',
  // default teks
  txt: 'txt', text: 'txt',
};

function langToExt(lang) {
  if (!lang) return 'txt';
  return LANG_EXT[lang.toLowerCase()] || 'txt';
}

// Ambang panjang code (karakter). Di bawah ini -> code block HTML,
// di atas ini -> dikirim sebagai file dokumen.
const MAX_INLINE_CODE = 1500;

function parseParts(text) {
  return extractParts(text);
}

function splitHtml(html) {
  const MAX = 4000;
  if (html.length <= MAX) return [html];

  const chunks = [];
  let buf = '';
  let inPre = false;
  let i = 0;
  while (i < html.length) {
    if (html.startsWith('<pre><code>', i)) {
      buf += '<pre><code>';
      i += '<pre><code>'.length;
      inPre = true;
      continue;
    }
    if (html.startsWith('</code></pre>', i)) {
      buf += '</code></pre>';
      i += '</code></pre>'.length;
      inPre = false;
      continue;
    }
    buf += html[i];
    i++;
    if (buf.length >= MAX && !inPre) {
      chunks.push(buf);
      buf = '';
    }
  }
  if (buf) {
    if (inPre) buf += '</code></pre>';
    chunks.push(buf);
  }
  return chunks;
}

module.exports = { escapeHtml, toTelegramHtml, splitHtml, langToExt, parseParts, MAX_INLINE_CODE };
