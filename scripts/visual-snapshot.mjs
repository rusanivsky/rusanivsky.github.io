#!/usr/bin/env node
/* Зліпок геометрії сайту.

   Обходить кожну сторінку × кожну ширину в headless Chrome і записує на
   КОЖЕН елемент DOM його коробку і 14 обчислених властивостей. Це і є гейт:
   правку стилів видно не на око, а порівнянням двох зліпків.

   Навіщо: правила в CSS перекривають одне одного за порядком. Перенесений
   блок оживляє правило, яке доти ніколи не діяло, — і верстка їде там, де
   її ніхто не чіпав. Око цього не ловить, зліпок ловить.

       node scripts/visual-snapshot.mjs .visual/before
       # правка
       node scripts/visual-snapshot.mjs .visual/after
       node scripts/visual-diff.mjs .visual/before .visual/after

   Залежностей немає: node 24 має вбудований WebSocket, Chrome керується
   через CDP напряму, а статику віддає сервер у самому процесі.

   Сервер свій і на випадковому вільному порту — це не примха. Доти гейт
   користувався чужим, якщо порт уже відповідав, і мовчки знімав зліпки з
   іншого воркдерева: сусідня сесія тримала http.server на тому самому
   8912. Прогони сходилися з точністю до пікселя, бо файли справді були
   ті самі, — тільки не наші.

   Детермінованість тримається на чотирьох речах, і кожну довелося
   поставити окремо:
     — .rev знімається з <html>, інакше reveal.js лишає пів сторінки на
       opacity:0 зі зсувом translate, і коробки їдуть на 16px;
     — київський годинник заморожується ДВІЧІ (після завантаження і перед
       самим зняттям), бо kyiv-clock.js переписує його своїм таймером;
     — усе зовнішнє (analytics, ytimg, vimeocdn) блокується: мережа не
       мусить впливати на зліпок;
     — чекаємо document.fonts.ready і два кадри, бо до підвантаження Fixel
       рядки міряються запасним шрифтом.

   Анімації плити й заслінки ведені scroll(), а не часом, тож на нульовій
   прокрутці вони стоять нерухомо — ловити нічого. */

import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { existsSync, createReadStream } from 'node:fs';
import { readdirSync, statSync, readFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const ROOT = path.resolve(import.meta.dirname, '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.mp4': 'video/mp4',
};

/* Статика з КОРЕНЯ ЦЬОГО воркдерева і нізвідки більше. */
function startServer() {
  const server = createServer((req, res) => {
    let rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.join(ROOT, path.normalize(rel));
    if (!file.startsWith(ROOT) || !existsSync(file) || statSync(file).isDirectory()) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, base: `http://127.0.0.1:${server.address().port}` }));
  });
}

/* Ширини з брифа. Висота фіксована: вона впливає лише на vh-одиниці й на
   те, що reveal.js вважає першим екраном, — а його ми вимикаємо. */
const VIEWPORTS = [
  { w: 1440, h: 900 },
  { w: 900, h: 900 },
  { w: 390, h: 844 },
];

const PROPS = [
  'display', 'position', 'font-size', 'font-weight', 'line-height',
  'letter-spacing', 'color', 'background-color', 'grid-template-columns',
  'grid-column', 'margin-left', 'padding-left', 'text-align', 'opacity',
];

/* Псевдоелементи доводиться міряти окремо: getBoundingClientRect для них
   не існує, у DOM їх немає, і обхід елементів їх не бачив зовсім.

   А саме ними намальовано майже все, що тримає сторінку: волосяні лінійки
   рядків (.trow::before, .spec::before), заслінка під шапкою, розпірка
   першого треку, стрілки посилань. Через це гейт мовчав на правці, яка
   пересувала лінійки прайсу на 90px, — і мовчав би на будь-якій іншій.

   Беремо обчислені значення: для absolute-лінійки саме left/right/top і
   вирішують, де вона ляже. */
const PSEUDO_PROPS = [
  'content', 'display', 'position', 'left', 'right', 'top', 'bottom',
  'width', 'height', 'background-color', 'opacity', 'transform',
  'margin-left', 'font-size',
];

const BLOCKED = [
  '*googletagmanager.com*', '*google-analytics.com*', '*analytics.google.com*',
  '*i.ytimg.com*', '*i.vimeocdn.com*', '*youtube.com*', '*youtube-nocookie.com*',
  '*vimeo.com*', '*doubleclick.net*',
];

const outDir = path.resolve(process.argv[2] || '.visual/snap');
const jobs = Number(process.env.VISUAL_JOBS || 4);

/* ---------- перелік сторінок ---------- */

/* Двадцять дві адреси — заглушки з <meta http-equiv=refresh>: ні стилів,
   ні розмітки, сама лише вказівка, куди сторінка переїхала. Браузером їх
   знімати нічого: поки ми дійдемо до зняття, refresh уже потягне нас на
   ціль, і зліпок вийде чужий і випадковий за часом. Тому заглушка йде в
   зліпок одним рядком — куди вона веде. Ціль переїзду від цього все одно
   під наглядом: підміните адресу — гейт побачить. */
function listPages() {
  const pages = [];
  const stubs = [];
  const classify = (file, url) => {
    const html = readFileSync(file, 'utf8');
    const refresh = html.match(/<meta\s+http-equiv="refresh"\s+content="[^"]*url=([^"]*)"/i);
    if (refresh) stubs.push({ url, to: refresh[1] });
    else pages.push(url);
  };
  const walk = (dir, rel) => {
    for (const name of readdirSync(dir).sort()) {
      if (name === '.git' || name === '.claude' || name === '.visual' || name === 'node_modules') continue;
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) walk(full, rel ? `${rel}/${name}` : name);
      else if (name === 'index.html') classify(full, rel ? `/${rel}/` : '/');
    }
  };
  walk(ROOT, '');
  classify(path.join(ROOT, '404.html'), '/404.html');
  return { pages, stubs };
}

/* ---------- CDP ---------- */

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Set();
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id !== undefined) {
        const waiter = this.pending.get(msg.id);
        if (!waiter) return;
        this.pending.delete(msg.id);
        if (msg.error) waiter.reject(new Error(`${waiter.method}: ${msg.error.message}`));
        else waiter.resolve(msg.result);
        return;
      }
      for (const fn of [...this.listeners]) fn(msg);
    });
  }

  static connect(url) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      ws.addEventListener('open', () => resolve(new Cdp(ws)), { once: true });
      ws.addEventListener('error', reject, { once: true });
    });
  }

  send(method, params = {}, sessionId) {
    const id = this.nextId++;
    const payload = sessionId ? { id, method, params, sessionId } : { id, method, params };
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, method });
      this.ws.send(JSON.stringify(payload));
    });
  }

  /* Слухач вішається ДО дії, що породить подію, інакше подія розминеться
     з очікуванням і гейт зависне на таймауті. */
  waitFor(method, sessionId, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.listeners.delete(fn);
        reject(new Error(`таймаут ${method}`));
      }, timeoutMs);
      const fn = (msg) => {
        if (msg.method !== method) return;
        if (sessionId && msg.sessionId !== sessionId) return;
        clearTimeout(timer);
        this.listeners.delete(fn);
        resolve(msg.params);
      };
      this.listeners.add(fn);
    });
  }
}

/* ---------- у сторінці ---------- */

const FREEZE = `(() => {
  /* Спершу глушимо всі таймери, і аж потім заморожуємо текст. Інакше
     kyiv-clock.js, що чекає на межу хвилини, встигав перезаписати
     годинник між заморожуванням і збором: раз на кількадесят прогонів
     зліпок містив живий час, і сторінка «розходилась» на 5px там, де
     ніхто нічого не міняв. Заморожування двічі вікно лише звужувало.
     Після цього ми тільки читаємо верстку, тож знятий таймер нічого не
     ламає — навпаки, це єдиний спосіб зробити заморозку остаточною. */
  const last = setTimeout(() => {}, 0);
  for (let id = 1; id <= last; id++) { clearTimeout(id); clearInterval(id); }
  document.documentElement.classList.remove('rev');
  document.querySelectorAll('[data-rev]').forEach((el) => el.classList.add('is-in'));
  /* Знятого .rev не досить: перехід, що вже пішов, Chrome доводить до
     кінця й після того, як правило перестало збігатися. Зліпок ловив
     його на півдорозі — звідси opacity .348 і зсув 11px із 16.
     finish() ставить перехід у кінцеве положення миттєво.
     Тільки доріжка часу: анімації на scroll() ведені прокруткою, і на
     нульовій вони стоять там, де й мають, — заслінка шапки й лінійка під
     нею саме такі, і досаджувати їх означало б їх зіпсувати. */
  document.getAnimations().forEach((animation) => {
    try { if (animation.timeline === document.timeline) animation.finish(); } catch (e) {}
  });
  /* Прокрутку зводимо до нуля. Смугу підрозділів сторінка гортає до
     активної вкладки інлайн-скриптом, який міряє offsetLeft ще до того,
     як приїхав Fixel: залежно від того, чи шрифт уже в кеші, виходить
     розбіжність в 1px, і вона гуляла від прогону до прогону. Прокрутка —
     не верстка, гейт міряє не її; а CSS, який вирішує, чи смуга взагалі
     гортається, лишається під наглядом через ширини. */
  window.scrollTo(0, 0);
  document.querySelectorAll('*').forEach((el) => {
    if (el.scrollLeft) el.scrollLeft = 0;
    if (el.scrollTop) el.scrollTop = 0;
  });
  document.querySelectorAll('.kyiv-clock').forEach((el) => { el.textContent = '00:00'; });
  document.querySelectorAll('.kyiv-tz').forEach((el) => { el.textContent = 'EEST'; });
  return true;
})()`;

const SETTLE = `(async () => {
  try { await document.fonts.ready; } catch (e) {}
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  return true;
})()`;

const COLLECT = `((expected) => {
  /* Перевірка адреси — не параноя: доти зліпок міг зніматися з ще не
     заміненої сторінки, якщо чекання load ловило подію від попередньої
     навігації. Тихий зсув на одну сторінку читався як «розбіжності
     скрізь», і шукати його довелося довго. */
  if (location.pathname !== expected) {
    throw new Error('зліпок не з тієї сторінки: чекали ' + expected + ', на екрані ' + location.pathname);
  }
  if (document.documentElement.classList.contains('rev')) {
    throw new Error('клас .rev лишився на <html>: reveal.js тримає блоки невидимими');
  }
  const moving = document.getAnimations().filter(
    (a) => a.timeline === document.timeline && a.playState === 'running'
  );
  if (moving.length) {
    throw new Error(moving.length + ' анімацій ще йдуть — зліпок був би випадковим');
  }
  const PROPS = ${JSON.stringify(PROPS)};
  const PSEUDO_PROPS = ${JSON.stringify(PSEUDO_PROPS)};
  const out = [];
  const round = (n) => Math.round(n * 100) / 100;
  const sx = window.scrollX;
  const sy = window.scrollY;
  const walk = (el, where) => {
    const box = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    const rec = {
      p: where,
      b: [round(box.left + sx), round(box.top + sy), round(box.width), round(box.height)],
    };
    for (const prop of PROPS) rec[prop] = style.getPropertyValue(prop);
    out.push(rec);
    for (const pseudo of ['::before', '::after']) {
      const ps = getComputedStyle(el, pseudo);
      if (!ps.content || ps.content === 'none' || ps.display === 'none') continue;
      const prec = { p: where + pseudo, b: [0, 0, 0, 0] };
      for (const prop of PSEUDO_PROPS) prec[prop] = ps.getPropertyValue(prop);
      out.push(prec);
    }
    const seen = Object.create(null);
    for (const child of el.children) {
      const tag = child.tagName.toLowerCase();
      seen[tag] = (seen[tag] || 0) + 1;
      walk(child, where + '/' + tag + '[' + seen[tag] + ']');
    }
  };
  walk(document.documentElement, 'html');
  return JSON.stringify(out);
})`;

/* ---------- один зліпок ---------- */

/* Навігація з прив'язкою до loaderId.

   Page.loadEventFired сам по собі не каже, ЧИЯ це подія. Вкладка
   створюється на about:blank, її load приходить із запізненням — і перше
   ж чекання з'їдало чужу подію. Далі зсув котився далі: кожна сторінка
   знімалась, поки на екрані була попередня. Розбіжності від цього
   виглядали як живі анімації, а не як помилка гейта.

   Page.lifecycleEvent несе loaderId, який повертає сама Page.navigate.
   Слухач вішається ДО навігації і складає події в буфер, бо load цілком
   може випередити відповідь на navigate. */
async function navigate(cdp, sessionId, url) {
  const buffer = [];
  let resolveLoad = null;
  let wantedLoader = null;

  const listener = (msg) => {
    if (msg.method !== 'Page.lifecycleEvent' || msg.sessionId !== sessionId) return;
    if (msg.params.name !== 'load') return;
    if (wantedLoader === null) { buffer.push(msg.params.loaderId); return; }
    if (msg.params.loaderId === wantedLoader && resolveLoad) resolveLoad();
  };
  cdp.listeners.add(listener);

  try {
    const result = await cdp.send('Page.navigate', { url }, sessionId);
    if (result.errorText) throw new Error(`${url}: ${result.errorText}`);
    wantedLoader = result.loaderId;
    if (buffer.includes(wantedLoader)) return;
    await new Promise((resolve, reject) => {
      resolveLoad = resolve;
      setTimeout(() => reject(new Error(`таймаут завантаження ${url}`)), 30000);
    });
  } finally {
    cdp.listeners.delete(listener);
  }
}

async function snapshot(cdp, sessionId, url, viewport) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.w, height: viewport.h, deviceScaleFactor: 1, mobile: false,
  }, sessionId);

  await navigate(cdp, sessionId, url);

  const evaluate = (expression, awaitPromise = false) =>
    cdp.send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true }, sessionId);

  /* Перше заморожування — одразу після завантаження, щоб годинник не
     встиг лягти в зліпок живим значенням. */
  await evaluate(FREEZE);
  await evaluate(SETTLE, true);
  /* Друге — перед самим зняттям: kyiv-clock.js перезаписує текст своїм
     таймером, і між settle та collect він може встигнути. Після нього ще
     один кадр: на скидання прокрутки відгукується horizontal-edge-fade.js,
     і його подія приходить не в тому ж такті. */
  await evaluate(FREEZE);
  await evaluate(SETTLE, true);

  const expected = new URL(url).pathname;
  const result = await evaluate(`${COLLECT}(${JSON.stringify(expected)})`);
  if (result.exceptionDetails) {
    const detail = result.exceptionDetails.exception?.description || result.exceptionDetails.text;
    throw new Error(`${url}: ${detail}`);
  }
  return result.result.value;
}

/* ---------- запуск ---------- */

async function main() {
  if (!existsSync(CHROME)) {
    console.error(`Немає Chrome: ${CHROME}`);
    process.exit(2);
  }

  const stop = [];

  const { server, base } = await startServer();
  stop.push(() => server.close());

  const profile = await mkdtempIn();
  const chrome = spawn(CHROME, [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--disable-background-networking', '--disable-sync', '--disable-gpu',
    /* Смуга прокрутки в headless має ширину і з'їдає 15px верстки; на macOS
       у справжньому браузері вона накладна. Ховаємо, щоб ширина вікна
       дорівнювала заявленій. */
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--disable-features=CalculateNativeWinOcclusion,Translate',
    'about:blank',
  ], { stdio: 'ignore' });
  stop.push(() => chrome.kill());

  const port = await readDevToolsPort(profile);
  const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  const cdp = await Cdp.connect(version.webSocketDebuggerUrl);

  const { pages, stubs } = listPages();
  const work = [];
  for (const viewport of VIEWPORTS) for (const page of pages) work.push({ page, viewport });

  await rm(outDir, { recursive: true, force: true });
  console.log(`${pages.length} сторінок × ${VIEWPORTS.length} ширини = ${work.length} зліпків, плюс ${stubs.length} заглушок → ${path.relative(ROOT, outDir) || outDir}`);

  for (const stub of stubs) {
    const file = path.join(outDir, 'stubs', snapName(stub.url));
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify([{ p: 'html', b: [0, 0, 0, 0], redirect: stub.to }]));
  }

  let done = 0;
  let cursor = 0;
  const started = Date.now();

  const worker = async () => {
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    await cdp.send('Page.enable', {}, sessionId);
    await cdp.send('Page.setLifecycleEventsEnabled', { enabled: true }, sessionId);
    await cdp.send('Runtime.enable', {}, sessionId);
    await cdp.send('Network.enable', {}, sessionId);
    await cdp.send('Network.setBlockedURLs', { urls: BLOCKED }, sessionId);

    while (cursor < work.length) {
      const item = work[cursor++];
      const json = await snapshot(cdp, sessionId, base + item.page, item.viewport);
      const file = path.join(outDir, String(item.viewport.w), snapName(item.page));
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, json);
      done++;
      if (done % 10 === 0 || done === work.length) {
        process.stdout.write(`\r  ${done}/${work.length}`);
      }
    }
    await cdp.send('Target.closeTarget', { targetId });
  };

  await Promise.all(Array.from({ length: Math.max(1, jobs) }, worker));
  process.stdout.write('\n');
  console.log(`Готово за ${Math.round((Date.now() - started) / 1000)} с.`);

  /* Чекаємо, поки Chrome справді помре: інакше прибирання профілю
     перегониться з його власним записом сесії і падає на ENOTEMPTY. */
  const gone = new Promise((resolve) => chrome.once('exit', resolve));
  for (const fn of stop.reverse()) fn();
  await Promise.race([gone, new Promise((r) => setTimeout(r, 5000))]);
  await rm(profile, { recursive: true, force: true }).catch(() => {});
  process.exit(0);
}

function snapName(url) {
  return (url === '/' ? 'root' : url.replace(/^\/|\/$/g, '').replace(/\//g, '__')) + '.json';
}

async function mkdtempIn() {
  const dir = path.join(os.tmpdir(), `visual-chrome-${process.pid}-${Date.now()}`);
  await mkdir(dir, { recursive: true });
  return dir;
}

async function readDevToolsPort(profile) {
  const file = path.join(profile, 'DevToolsActivePort');
  const until = Date.now() + 20000;
  while (Date.now() < until) {
    try {
      const text = await readFile(file, 'utf8');
      const port = Number(text.split('\n')[0]);
      if (port > 0) return port;
    } catch (e) { /* Chrome ще не написав */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('Chrome не повідомив порт DevTools');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
