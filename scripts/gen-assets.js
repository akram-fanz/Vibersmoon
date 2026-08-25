const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const W = 800;
const H = 400;

// Warna latar (biru keunguan) dan aksen
function px(x, y) {
  // gradien sederhana + aksen garis bawah
  const t = x / W;
  const r = Math.round(40 + t * 60);
  const g = Math.round(50 + (1 - t) * 40);
  const b = Math.round(120 + t * 80);
  // garis aksen horizontal di tengah
  if (y > H / 2 - 4 && y < H / 2 + 4) return [255, 200, 80];
  return [r, g, b];
}

const raw = Buffer.alloc(H * (1 + W * 3));
let p = 0;
for (let y = 0; y < H; y++) {
  raw[p++] = 0; // filter type 0
  for (let x = 0; x < W; x++) {
    const [r, g, b] = px(x, y);
    raw[p++] = r;
    raw[p++] = g;
    raw[p++] = b;
  }
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  const c = require('zlib');
  // CRC32 sederhana via zlib? gunakan implementasi kecil
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])) >>> 0, 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c;
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 2; // color type RGB
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw)),
  chunk('IEND', Buffer.alloc(0)),
]);

const out = path.join(__dirname, '..', 'assets', 'menu.png');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, png);
console.log('Menu image written:', out, png.length, 'bytes');
