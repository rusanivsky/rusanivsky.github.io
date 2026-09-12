/* Робить із растрових логотипів клієнтів маски у WebP.

   Логотип на головній не показується картинкою: у `.lg` стоїть
   `mask-image:var(--src)`, а колір дає `background:currentColor`. Тобто
   з файлу читається **лише альфа-канал**, а всі RGB-байти браузер
   викидає. У трьох PNG вони лежали марно: naukma везла темно-синій,
   defenders — майже білий, shylero — чистий нуль.

   Скрипт зафарбовує колір у нуль і перекодовує в WebP. У WebP альфа
   стискається без утрат навіть у «втратному» режимі, тож маска виходить
   байт у байт тією самою — скрипт це щоразу перевіряє й падає, якщо
   бодай один піксель розійшовся. Роздільність не зменшується: на зумі й
   на щільних екранах маска лишається такою самою різкою, як була.

   77 → 44 КБ на трьох файлах. Порівняння: той самий трюк у PNG
   (сірий + альфа, тип 4) дає лише 53 КБ, бо PNG не має окремого
   стискача для альфи.

     node scripts/make-client-masks.mjs
       → img/clients/naukma.webp, defenders-ukma.webp, shylero.webp

   Вихідні PNG лишаються в репозиторії як джерело для повторного
   прогону — сайт їх не вантажить, у CSS стоять .webp. Векторні
   логотипи поруч (kmbs, kooperativ, tsyronian, yd) — SVG, їх скрипт
   не чіпає.

   WebP тут безпечний без запасного PNG: сторінка й так тримається на
   color-mix() і :has(), а обидва новіші за WebP — браузера, який
   покаже сайт, але не покаже маску, не існує.

   Через справжній браузер — з тієї самої причини, що й og-картка
   (scripts/make-og-image.mjs): у репозиторії немає залежностей, а
   Chromium уже стоїть і вміє і декодувати PNG, і кодувати WebP. */
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

/* Playwright у репозиторії не встановлений (тут немає package.json), тож
   беремо той, що є в системі. Якщо його немає ніде — скажемо, як дати. */
async function loadChromium() {
  const candidates = ['playwright', 'playwright-core', process.env.PLAYWRIGHT_MODULE].filter(Boolean);
  for (const id of candidates) {
    try { return (await import(id)).chromium; } catch {}
  }
  throw new Error('потрібен playwright: npm i -g playwright, або PLAYWRIGHT_MODULE=/шлях/до/playwright/index.mjs');
}
const chromium = await loadChromium();

const root = process.cwd();
const names = ['naukma', 'defenders-ukma', 'shylero'];

/* маленький сервер: canvas не читає файли з file:// через CORS */
const server = createServer(async (request, response) => {
  const url = decodeURIComponent(request.url.split('?')[0]);
  if (url === '/') {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end('<!doctype html><title>masks</title>');
    return;
  }
  try {
    const file = path.join(root, url);
    if (!file.startsWith(root)) throw new Error('поза коренем');
    const body = await readFile(file);
    response.writeHead(200, { 'content-type': 'image/png' });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end();
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(origin + '/', { waitUntil: 'domcontentloaded' });

let before = 0, after = 0;
for (const name of names) {
  const source = await readFile(path.join(root, `img/clients/${name}.png`));
  const result = await page.evaluate(async ({ origin, name }) => {
    const image = new Image();
    image.src = `${origin}/img/clients/${name}.png`;
    await image.decode();

    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;

    const alpha = new Uint8Array(canvas.width * canvas.height);
    for (let i = 0; i < alpha.length; i++) alpha[i] = pixels[i * 4 + 3];

    /* колір у нуль: маска його не читає, а рівне поле кодується дешевше */
    const flat = context.createImageData(canvas.width, canvas.height);
    for (let i = 0; i < alpha.length; i++) flat.data[i * 4 + 3] = alpha[i];
    context.putImageData(flat, 0, 0);

    const url = canvas.toDataURL('image/webp', 0.5);

    /* перевірка: декодуємо назад і порівнюємо альфу з вихідною */
    const back = new Image();
    back.src = url;
    await back.decode();
    const check = document.createElement('canvas');
    check.width = canvas.width;
    check.height = canvas.height;
    const checkContext = check.getContext('2d', { willReadFrequently: true });
    checkContext.drawImage(back, 0, 0);
    const decoded = checkContext.getImageData(0, 0, check.width, check.height).data;
    let changed = 0;
    for (let i = 0; i < alpha.length; i++) if (decoded[i * 4 + 3] !== alpha[i]) changed++;

    return { base64: url.split(',')[1], width: canvas.width, height: canvas.height, changed };
  }, { origin, name });

  if (result.changed) {
    throw new Error(`${name}: альфа розійшлася на ${result.changed} пікселях — файл не записано`);
  }

  const webp = Buffer.from(result.base64, 'base64');
  await writeFile(path.join(root, `img/clients/${name}.webp`), webp);
  before += source.length;
  after += webp.length;
  console.log(`${name}: ${result.width}×${result.height}, ${(source.length / 1024).toFixed(1)} → ${(webp.length / 1024).toFixed(1)} КБ (альфа збігається)`);
}

console.log(`разом: ${(before / 1024).toFixed(1)} → ${(after / 1024).toFixed(1)} КБ`);
await browser.close();
server.close();
