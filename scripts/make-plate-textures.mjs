/* Дві текстури тла растром, а не SVG-фільтром.

   feTurbulence кожен рушій розтеризує по-своєму: на тих самих стилях
   Safari і Chromium давали різний тон і різну зернистість, і плита в
   одному браузері виходила світлішою за іншу. Растр знімає питання —
   обидва беруть ті самі пікселі.

   Плями (mottle) окремо важливі для «сходинок». Їхній розмах — лише
   пара рівнів з 255 на дуже великих плямах, тож без дизеру вони самі
   стають контурними лініями: рівно ті сходинки, що видно в Safari.
   Перед округленням додається шум у пів-рівня — плато зникають, а на
   око текстура та сама.

   node scripts/make-plate-textures.mjs
     → img/grain.png   зерно, плитка 160
     → img/mottle.png  плями, плитка 512 (малюється на 1280) */
import {deflateSync} from 'node:zlib';
import {writeFileSync} from 'node:fs';

/* mulberry32: щоб файли виходили ті самі при кожному запуску */
let seed = 0x9e3779b9;
const rnd = () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const gauss = () => {
  const u = Math.max(rnd(), 1e-9), v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

const table = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  table[n] = c;
}
const crc = buf => {
  let c = -1;
  for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(body));
  return Buffer.concat([len, body, sum]);
};
/* 8 біт, відтінки сірого, без інтерлейсу */
const writeGray = (file, size, px) => {
  const raw = Buffer.alloc((size + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size + 1)] = 0;                       /* filter: none */
    for (let x = 0; x < size; x++) {
      const v = Math.round(px[y * size + x]);
      raw[y * (size + 1) + 1 + x] = v < 0 ? 0 : v > 255 ? 255 : v;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 0;                        /* 8 біт, grayscale */
  writeFileSync(file, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, {level: 9})),
    chunk('IEND', Buffer.alloc(0)),
  ]));
};

/* ── зерно ───────────────────────────────────────────────────
   Гаусів розподіл, σ ≈ 33 з 255 — приблизно той самий розкид, що
   давав fractalNoise у двох октавах, тож числа --grain у стилях
   лишаються при своєму значенні. */
{
  const SIZE = 160, MEAN = 128, SIGMA = 33;
  const px = new Float64Array(SIZE * SIZE);
  for (let i = 0; i < px.length; i++) px[i] = MEAN + gauss() * SIGMA;
  writeGray('img/grain.png', SIZE, px);
}

/* ── плями ───────────────────────────────────────────────────
   Дві октави періодичного value-noise: плитка стикується сама з собою,
   на екрані малюється вдвічі більшою, тож пляма виходить десь на пів
   екрана. Розмах — той, що давав feTurbulence у WebKit: середина 127,
   σ ≈ 2 рівні. */
{
  const SIZE = 512, MEAN = 127, SIGMA = 2, DITHER = 0.5;
  const ease = t => t * t * (3 - 2 * t);
  const octave = (cells, out, weight) => {
    const g = new Float64Array(cells * cells);
    for (let i = 0; i < g.length; i++) g[i] = gauss();
    for (let y = 0; y < SIZE; y++) {
      const fy = y / SIZE * cells, y0 = Math.floor(fy) % cells, ty = ease(fy - Math.floor(fy));
      const y1 = (y0 + 1) % cells;
      for (let x = 0; x < SIZE; x++) {
        const fx = x / SIZE * cells, x0 = Math.floor(fx) % cells, tx = ease(fx - Math.floor(fx));
        const x1 = (x0 + 1) % cells;
        const top = g[y0 * cells + x0] + (g[y0 * cells + x1] - g[y0 * cells + x0]) * tx;
        const bot = g[y1 * cells + x0] + (g[y1 * cells + x1] - g[y1 * cells + x0]) * tx;
        out[y * SIZE + x] += weight * (top + (bot - top) * ty);
      }
    }
  };
  const n = new Float64Array(SIZE * SIZE);
  octave(3, n, 1);                                 /* велика пляма */
  octave(6, n, 0.5);                               /* друга октава */
  let mean = 0, sq = 0;
  for (const v of n) mean += v;
  mean /= n.length;
  for (const v of n) sq += (v - mean) * (v - mean);
  const norm = SIGMA / Math.sqrt(sq / n.length);
  const px = new Float64Array(SIZE * SIZE);
  /* Дизер. Пів-рівня вистачило б, якби плитку малювали піксель у піксель,
     але на екрані вона розтягується вчетверо і дрібний шум згладжується
     разом із нею — тож беремо з запасом (σ ≈ DITHER рівнів). Інакше плавна
     пляма при округленні знову лягає контурними лініями. */
  for (let i = 0; i < px.length; i++) px[i] = MEAN + (n[i] - mean) * norm + (rnd() - 0.5) * 2 * DITHER;
  writeGray('img/mottle.png', SIZE, px);
}
