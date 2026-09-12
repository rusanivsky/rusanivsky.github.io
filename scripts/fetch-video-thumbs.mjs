/* Забирає прев'ю відео з чужих CDN до себе й переписує на них розмітку.
 *
 *   node scripts/fetch-video-thumbs.mjs
 *   node scripts/build-ukrainian-pages.mjs   # обов'язково після
 *
 * Навіщо. Сторінки розділу «Відео» тягнуть 41 мініатюру прямо з
 * i.ytimg.com і i.vimeocdn.com. Це означає дві речі, і обидві погані:
 * IP кожного відвідувача йде до Google ще до будь-якого кліку, хоч самі
 * вбудовування ми свідомо робимо через youtube-nocookie; і розділ не
 * відкриється там, де Google недоступний. `referrerpolicy="no-referrer"`
 * прибирає з запиту адресу сторінки, але не сам запит — прибрати його
 * можна лише переїхавши на власні файли.
 *
 * Скрипт ідемпотентний: те, що вже лежить у video/img/thumbs/, вдруге
 * не качається, а розмітка, вже переписана, вдруге не чіпається.
 *
 * Запускати треба там, де є доступ до i.ytimg.com — у середовищі, де
 * мережа обмежена білим списком, він чесно скаже, що не зміг.
 */
import { mkdir, readFile, writeFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const outDir = path.join(root, 'video', 'img', 'thumbs');
const webDir = '/video/img/thumbs';

/* Ім'я файлу з адреси. YouTube дає сталий id у самому шляху; у Vimeo
   шлях — довгий хеш, тож беремо його числовий префікс, який і є id
   ролика, і не тягнемо решту в назву. */
function nameFor(url) {
  const yt = url.match(/i\.ytimg\.com\/vi\/([\w-]+)\//);
  if (yt) return `yt-${yt[1]}.jpg`;
  const vm = url.match(/i\.vimeocdn\.com\/video\/(\d+)/);
  if (vm) return `vimeo-${vm[1]}.jpg`;
  return null;
}

async function listSources(dir, found = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'ua' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await listSources(full, found);
    else if (entry.name === 'index.html') found.push(full);
  }
  return found;
}

const sources = await listSources(root);
const urlRe = /https:\/\/i\.(?:ytimg|vimeocdn)\.com\/[^"]+/g;

const wanted = new Map();
for (const file of sources) {
  const html = await readFile(file, 'utf8');
  for (const url of html.match(urlRe) ?? []) {
    const name = nameFor(url);
    if (!name) { console.warn(`  ? не зрозумів адресу: ${url}`); continue; }
    if (!wanted.has(url)) wanted.set(url, name);
  }
}

if (!wanted.size) {
  console.log('Зовнішніх мініатюр у розмітці немає — нічого робити.');
  process.exit(0);
}

await mkdir(outDir, { recursive: true });
const onDisk = new Set(await readdir(outDir).catch(() => []));

let fetched = 0, skipped = 0;
const failed = [];
for (const [url, name] of wanted) {
  if (onDisk.has(name)) { skipped++; continue; }
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    /* YouTube на відсутній maxresdefault віддає заглушку 120×90 в кілька
       сотень байтів, і вона приходить з кодом 200. Розмір — найдешевший
       спосіб її впізнати, поки ми не декодуємо JPEG. */
    if (bytes.length < 4096) throw new Error(`підозріло мало (${bytes.length} Б) — схоже на заглушку`);
    await writeFile(path.join(outDir, name), bytes);
    fetched++;
  } catch (error) {
    failed.push([url, error.message]);
  }
}

if (failed.length) {
  console.error(`\nНе вдалося забрати ${failed.length} з ${wanted.size}:`);
  for (const [url, why] of failed.slice(0, 8)) console.error(`  ${why.padEnd(28)} ${url}`);
  if (failed.length > 8) console.error(`  …і ще ${failed.length - 8}`);
  console.error('\nРозмітку не чіпав: переписувати її на файли, яких немає, гірше за поточний стан.');
  process.exit(1);
}

/* Переписуємо лише тепер, коли всі файли справді на диску. */
let touched = 0, rewritten = 0;
for (const file of sources) {
  const before = await readFile(file, 'utf8');
  let html = before;
  for (const [url, name] of wanted) {
    if (!html.includes(url)) continue;
    html = html.split(url).join(`${webDir}/${name}`);
    rewritten++;
  }
  /* referrerpolicy тримав чужий CDN на відстані; для свого ж файлу він
     зайвий. Так само preconnect до i.ytimg.com. */
  html = html.replace(/ referrerpolicy="no-referrer"(?=[^>]*src="\/video\/img\/thumbs\/)/g, '');
  html = html.replace(/<img src="(\/video\/img\/thumbs\/[^"]+)" referrerpolicy="no-referrer"/g, '<img src="$1"');
  html = html.replace(/\n?<link rel="preconnect" href="https:\/\/i\.ytimg\.com">/g, '');
  if (html !== before) { await writeFile(file, html); touched++; }
}

const totalBytes = (await Promise.all(
  [...new Set(wanted.values())].map(async n => (await stat(path.join(outDir, n))).size),
)).reduce((a, b) => a + b, 0);

console.log(`Забрано ${fetched}, вже було ${skipped}. Разом ${wanted.size} файлів, ${(totalBytes / 1048576).toFixed(1)} MB.`);
console.log(`Переписано ${rewritten} посилань у ${touched} джерелах.`);
console.log('Далі: node scripts/build-ukrainian-pages.mjs');
