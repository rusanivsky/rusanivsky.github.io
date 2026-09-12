/* Збирає favicon.svg, favicon-light.svg, favicon.ico, favicon-light.ico
 * і apple-touch-icon.png.
 *
 *   node scripts/make-favicons.mjs
 *
 * Іконка стоїть на тій самій плиті, що й сайт: градієнт --plate-base
 * зеленої теми під тим самим кутом 154°, згори зерно. Доти це був
 * плаский #415d43 — колір, якого на сайті немає ніде, окрім ховера.
 *
 * Друга пара файлів — світлий варіант, той самий --plate-base базового
 * (світлого) :root. Обидві пари підключені в <head> з
 * media="(prefers-color-scheme: …)" — точнісінько так, як Apple/WebKit
 * документують адаптивний favicon для Safari. apple-touch-icon лишається
 * один: домашній екран iOS не читає prefers-color-scheme для нього.
 *
 * Зерно — растрова плитка в самому SVG, а не feTurbulence. Причина та
 * сама, що описана в make-plate-textures.mjs: той самий фільтр кожен
 * рушій розтеризує по-своєму. Плитка мала (64px), тож base64 в SVG
 * важить кілька кілобайтів, а не сорок.
 *
 * Растри знімаються з того самого SVG справжнім браузером — інакше
 * векторна й растрова іконки розійдуться, і розійдуться тихо.
 * Шлях до Chrome: змінна CHROME, типове значення — macOS.
 */
import { deflateSync, inflateSync } from 'node:zlib';
import { writeFileSync, readFileSync, existsSync, unlinkSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import os from 'node:os';

const run = promisify(execFile);
const root = process.cwd();

const CHROME = process.env.CHROME
  ?? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => existsSync(p))
  ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

/* ── PNG без залежностей, як у make-plate-textures.mjs ───────────── */
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
function png(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8 біт, RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // фільтр none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ── Плитка зерна. mulberry32, щоб файл виходив той самий щоразу.
   Один зерновий шум на обидва варіанти — різниться лише opacity
   накладання, як --grain різниться між темами на самому сайті. ── */
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

const TILE = 64;
const grain = Buffer.alloc(TILE * TILE * 4);
for (let i = 0; i < TILE * TILE; i++) {
  /* Сірий навколо 128: в режимі overlay це «нічого не міняй», а розкид
     у кілька рівнів і дає зерно. Дизер у пів-рівня — з тієї ж причини,
     що й у плямах плити: без нього близькі рівні стають плато. */
  const v = Math.max(0, Math.min(255, Math.round(128 + gauss() * 11 + (rnd() - 0.5))));
  grain[i * 4] = v; grain[i * 4 + 1] = v; grain[i * 4 + 2] = v; grain[i * 4 + 3] = 255;
}
const grainB64 = png(TILE, TILE, grain).toString('base64');

/* Монограма лишається та сама, що була: KR, вирізана з тексту. Колір
   літери приходить з кожного варіанту окремо (той самий --ink, яким
   на сайті набрано ім'я на цій темі), тож у джерелі fill не фіксуємо. */
const monogramSource = readFileSync(path.join(root, 'scripts', 'favicon-monogram.svg'), 'utf8').trim();
const monogramFor = fill => monogramSource.replace(/fill="#[0-9a-f]+"/i, `fill="${fill}"`);

/* ── Два варіанти плити ───────────────────────────────────────────
   Денний (без суфікса) лишається тим самим, що був завжди: зелена
   плита сайту за замовчуванням (data-theme="green"). Другий —
   нічна тема сайту (data-theme="night"), для prefers-color-scheme:
   dark, а не світла/кремова — на OS-темну систему іконка має темнішати,
   а не світлішати.
   Стопи — ті самі, що в --plate-base кожної теми (photo/photo.css).
   CSS-кут 154° = вертикальний градієнт, повернутий на 154−180 = −26°.
   grainOpacity нічного піднято в тій самій пропорції, що й --grain на
   сайті між зеленою (.18) і нічною (.14) темами: 0.22 у зеленого —
   база, нічному дістається 0.22 × .14/.18. */
const variants = [
  {
    suffix: '', label: 'day (green)',
    ink: '#eaf1e7', grainOpacity: 0.22,
    stops: [
      ['#4f5f49', 0], ['#4b5b47', 8.3], ['#445542', 16.7], ['#3b4d3d', 25],
      ['#344738', 33.3], ['#2f4234', 41.7], ['#2b3e31', 50], ['#283a2e', 58.3],
      ['#24352a', 66.7], ['#1f2f25', 75], ['#1a2a21', 83.3], ['#15241d', 91.7], ['#13211a', 100],
    ],
  },
  {
    suffix: '-dark', label: 'night (dark)',
    ink: '#eaf1e7', grainOpacity: 0.171,
    stops: [
      ['#272d1a', 0], ['#252b1a', 8.3], ['#202718', 16.7], ['#192316', 25],
      ['#142014', 33.3], ['#111e13', 41.7], ['#101c13', 50], ['#0e1b12', 58.3],
      ['#0d1a11', 66.7], ['#0b1811', 75], ['#0a150f', 83.3], ['#08130e', 91.7], ['#06120d', 100],
    ],
  },
];

/* Найдальший піксель PNG: розпаковуємо IDAT і знімаємо фільтри рядків.
   Кількість байтів на піксель беремо з IHDR, а не припускаємо: Chromium
   пише повністю непрозорий кадр як RGB (тип 2), а не RGBA, і перевірка,
   написана під чотири байти, читала б чужі байти й мовчки брехала. */
function cornerPixel(buf) {
  let off = 8, width = 0, height = 0, depth = 8, colour = 6, idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('latin1', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      depth = data[8]; colour = data[9];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colour];
  if (depth !== 8 || !channels) throw new Error(`PNG ${depth} біт, тип ${colour} — розбір не підтримує`);
  const bpp = channels, stride = width * bpp;
  const raw = inflateSync(Buffer.concat(idat));
  const out = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[y * stride + x - bpp] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = (x >= bpp && y > 0) ? out[(y - 1) * stride + x - bpp] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      out[y * stride + x] = v & 0xff;
    }
  }
  const i = (height - 1) * stride + (width - 1) * bpp;
  if (channels === 1) return { r: out[i], g: out[i], b: out[i], a: 255 };
  if (channels === 2) return { r: out[i], g: out[i], b: out[i], a: out[i + 1] };
  return { r: out[i], g: out[i + 1], b: out[i + 2], a: channels === 4 ? out[i + 3] : 255 };
}

const tmp = path.join(os.tmpdir(), `favicon-${process.pid}`);
const extraFlags = (process.env.CHROME_FLAGS ?? '').split(/\s+/).filter(Boolean);

/* ── Растри з того самого SVG ─────────────────────────────────── */
async function renderSizes(svg, sizes) {
  const shots = new Map();
  for (const size of sizes) {
    const page = `${tmp}-${size}.html`;
    const shot = `${tmp}-${size}.png`;
    /* Розмір атрибутами, а не стилем: SVG без width/height — замінюваний
       елемент, і поки CSS не застосувався, він малюється у типових 300×150.
       Знімок тоді виходить обрізаним, і мовчки. */
    const sized = svg.replace(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">`,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}">`);
    writeFileSync(page, `<!doctype html><meta charset="utf-8">`
      + `<style>html,body{margin:0;padding:0;background:transparent;line-height:0}</style>`
      + sized);
    await run(CHROME, [
      '--headless=new', ...extraFlags, '--disable-gpu', '--hide-scrollbars',
      '--default-background-color=00000000', '--force-device-scale-factor=1',
      `--window-size=${size},${size}`, '--virtual-time-budget=4000',
      `--screenshot=${shot}`, `file://${page}`,
    ]);
    const shotData = readFileSync(shot);
    /* Розміру кадру мало: він завжди виходить той, що замовили, а от
       вміст у ньому може стояти обрізаним — саме так і сталося, коли SVG
       малювався у типових 300×150 замість заданих. Дивимось у найдальший
       від початку піксель: плита має покривати весь кадр, тож він мусить
       бути непрозорим. Порожній кут означає, що іконка не заповнила кадр. */
    const corner = cornerPixel(shotData);
    const empty = corner.a < 250 || (corner.r > 240 && corner.g > 240 && corner.b > 240);
    if (empty) {
      throw new Error(`Знімок ${size}px порожній у правому нижньому куті `
        + `(rgba ${corner.r},${corner.g},${corner.b},${corner.a}) — там має бути темний низ `
        + `плити. Іконка не заповнила кадр: цей Chrome малює SVG не того розміру.`);
    }
    shots.set(size, shotData);
    unlinkSync(page); unlinkSync(shot);
  }
  return shots;
}

/* ICO з PNG усередині: так уміють усі браузери й Windows від Vista.
   Розмір 256 у довіднику записується нулем — саме тому поле однобайтне. */
function buildIco(shots, icoSizes) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(icoSizes.length, 4);
  let offset = 6 + icoSizes.length * 16;
  const dir = [], payloads = [];
  for (const size of icoSizes) {
    const data = shots.get(size);
    const entry = Buffer.alloc(16);
    entry[0] = size % 256; entry[1] = size % 256;
    entry[2] = 0; entry[3] = 0;
    entry.writeUInt16LE(1, 4); entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8); entry.writeUInt32LE(offset, 12);
    dir.push(entry); payloads.push(data);
    offset += data.length;
  }
  return Buffer.concat([header, ...dir, ...payloads]);
}

for (const variant of variants) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<defs>
<linearGradient id="plate" x1="0" y1="0" x2="0" y2="1" gradientTransform="rotate(-26 .5 .5)">
${variant.stops.map(([c, at]) => `<stop offset="${at}%" stop-color="${c}"/>`).join('\n')}
</linearGradient>
<pattern id="grain" width="32" height="32" patternUnits="userSpaceOnUse">
<image width="32" height="32" href="data:image/png;base64,${grainB64}"/>
</pattern>
</defs>
<rect width="64" height="64" fill="url(#plate)"/>
<rect width="64" height="64" fill="url(#grain)" opacity="${variant.grainOpacity}" style="mix-blend-mode:overlay"/>
${monogramFor(variant.ink)}
</svg>
`;
  const svgPath = path.join(root, `favicon${variant.suffix}.svg`);
  writeFileSync(svgPath, svg);
  console.log(`favicon${variant.suffix}.svg (${variant.label}): ${(Buffer.byteLength(svg) / 1024).toFixed(1)} КБ`);

  /* apple-touch-icon лишається тільки для темного варіанту: домашній
     екран iOS не перемикає його за системною темою. */
  const needsTouchIcon = variant.suffix === '';
  const sizes = needsTouchIcon ? [16, 32, 48, 180] : [16, 32, 48];
  const shots = await renderSizes(svg, sizes);

  if (needsTouchIcon) {
    writeFileSync(path.join(root, 'apple-touch-icon.png'), shots.get(180));
    console.log(`apple-touch-icon.png: 180×180, ${(shots.get(180).length / 1024).toFixed(1)} КБ`);
  }

  const icoSizes = [16, 32, 48];
  const ico = buildIco(shots, icoSizes);
  const icoPath = path.join(root, `favicon${variant.suffix}.ico`);
  writeFileSync(icoPath, ico);
  console.log(`favicon${variant.suffix}.ico (${variant.label}): ${icoSizes.join(', ')} px, ${(ico.length / 1024).toFixed(1)} КБ`);
}

console.log('\nНе забудьте підняти ?v= у посиланнях на іконки.');
