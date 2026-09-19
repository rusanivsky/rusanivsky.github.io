/*
  Static build. Reads data/, writes plain HTML at the repo root, which is what
  GitHub Pages serves. No runtime framework, no client router.

  Both languages are rendered on the server: English at /, Ukrainian at /ua/.
  The language switch is a pair of real links, not a script that rewrites text
  after load — a crawler and a reader with no JavaScript both get the language
  they asked for.

  Idempotent: running it twice in a row changes nothing.
*/
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { projects, videoCatalogue, clients } from '../data/projects.mjs';
import { UI, PRACTICE_INTRO, CAPABILITIES } from '../data/ui.mjs';

const short = (file) =>
  createHash('sha1').update(readFileSync(new URL('../' + file, import.meta.url))).digest('hex').slice(0, 8);

const sizes = JSON.parse(readFileSync(new URL('../data/media-sizes.json', import.meta.url), 'utf8'));
const rates = JSON.parse(readFileSync(new URL('../data/rates.json', import.meta.url), 'utf8'));

/* Одна гарнітура на обидві абетки, тож прелоуд не залежить від мови.
   Версія в імені файлу — щоб оновлення беты не впиралося в кеш. */
const DISPLAY_FONT = '/fonts/word-music-display-0.8.0.2.woff2';
const CSS_V = short('styles/site.css');
const JS_V = short('scripts/site.js');
// Social networks cache a card by URL and never re-fetch it, so the OG image
// carries a content hash too.
const OG_V = short('og-image.jpg');
const ICON_V = short('favicon.svg');
const GA_V = short('scripts/google-analytics.js');

/* One switch separates the staging copy from the live site. Everything that
   differs between them — the host in every canonical and Open Graph URL, the
   robots line in the head, robots.txt and the CNAME — hangs off it, so going
   live is `SITE_ENV=live node scripts/build.mjs` and nothing is edited by
   hand at the moment it matters most. The default stays staging: a build run
   without thinking cannot publish the test host's pages to the index. */
const LIVE = process.env.SITE_ENV === 'live';
const SITE = LIVE ? 'https://rusanivsky.com' : 'https://test.rusanivsky.com';
const HOST = LIVE ? 'rusanivsky.com' : 'test.rusanivsky.com';
const EMAIL = 'info@rusanivsky.com';
const LANGS = ['en', 'ua'];

/* The one piece of module state: which language is being written right now. */
let LANG = 'en';

const esc = (s) => String(s).replace(/&(?!(?:amp|lt|gt|quot|#\d+);)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = (s) => esc(s).replace(/"/g, '&quot;');

/* Pick the current language out of a bilingual value; a plain string is
   language-neutral by definition (a video's own title, an email address). */
const L = (o) => (o == null ? '' : typeof o === 'string' ? o : o[LANG] ?? o.en);
const ui = (key) => L(UI[key]);

/* Paths: Ukrainian pages live under /ua/ and link to each other there. */
const href = (path) => (LANG === 'ua' ? '/ua' + path : path);
const other = (lang, path) => (lang === 'ua' ? '/ua' + path : path);

const t = (o, cls = '', tag = 'span') =>
  o ? `<${tag}${cls ? ` class="${cls}"` : ''}>${esc(L(o))}</${tag}>` : '';

const dim = (src) => sizes[src.split('?')[0]] || null;

function write(path, html) {
  const out = new URL('../' + path, import.meta.url);
  mkdirSync(dirname(out.pathname), { recursive: true });
  writeFileSync(out, html.replace(/\n{3,}/g, '\n\n'));
}

/* ---------------- shell ---------------- */

const NAV_MAIN = [['/', 'selected'], ['/photo/', 'photography'], ['/video/', 'video'], ['/design/', 'design']];
/* Street is built and reachable at /street/, but it is held out of the
   navigation and the sitemap until a real edit exists: a menu entry that
   leads to «the selection is not ready yet» promises work the page does not
   have. Put the two lines back — here and in PUBLIC — the day the frames
   land, and nothing else has to change. */
const NAV_SECOND = [['/info/', 'info'], ['/enquiries/', 'enquiries']];
const NAV_MINOR = [['/rates/', 'rates']];
/* The rail is the short list: the two places the work itself is published.
   The address and the full set of profiles live on Info, under «Elsewhere» —
   a panel that follows every page stays a way in, not a contact card. The
   drawer renders the same list in the same order, so the mobile menu is the
   rail, not a second idea of it. */
/* The full list of profiles, in the order a reader is likely to want them:
   the places the work itself lives first, the professional registers after.
   One Instagram, not two — the personal account is the one that carries the
   pictures — and no handles: a list of names reads as a list, a list of
   @-handles reads as a form. Every address here comes from the site's own
   history or from the author; none is guessed. */
const PROFILES = [
  ['https://www.instagram.com/rusanivsky/', 'Instagram'],
  ['https://www.threads.com/@rusanivsky', 'Threads'],
  ['https://www.tiktok.com/@rusanivsky', 'TikTok'],
  ['https://www.youtube.com/@rusanivsky', 'YouTube'],
  ['https://www.facebook.com/rusanivsky', 'Facebook'],
  ['https://www.behance.net/rusanivsky', 'Behance'],
  ['https://www.pinterest.com/rusanivsky/', 'Pinterest'],
  ['https://www.linkedin.com/in/rusanivsky/', 'LinkedIn'],
  ['https://www.upwork.com/freelancers/~01538086fd314c4cfa', 'Upwork'],
  ['https://cases.media/rusanivsky/', 'CASES'],
];

const ELSEWHERE = [
  ['https://www.instagram.com/rusanivsky.photography/', 'Instagram'],
  ['https://www.behance.net/rusanivsky', 'Behance'],
];

const navLinks = (list, here) =>
  list.map(([path, key]) =>
    `<a href="${href(path)}"${path === here ? ' aria-current="page"' : ''}>${ui(key)}</a>`).join('');

/* The theme control is kept but not rendered: Auto still follows the system
   and a stored manual choice still applies, only the switch is out of the
   way. Putting it back is one line in the rail. */
const themeControl = () =>
  `<div class="theme"><span>${ui('theme')}</span>` +
  `<button type="button" data-theme="auto" aria-pressed="true">Auto</button><span class="sep">/</span>` +
  `<button type="button" data-theme="light" aria-pressed="false">Light</button><span class="sep">/</span>` +
  `<button type="button" data-theme="dark" aria-pressed="false">Dark</button></div>`;

/* Two faces for the name and the headlines, side by side, so the choice can
   be made by looking rather than by argument. The switch sits with the theme
   because it is the same kind of control: a preference, stored, undoable. */
/* Real links, so /ua/ is a page you can bookmark and a crawler can index. */
const langControl = (path) =>
  `<div class="theme lang">` +
  `<a href="${other('en', path)}" hreflang="en"${LANG === 'en' ? ' aria-current="true"' : ''}>EN</a>` +
  `<a href="${other('ua', path)}" hreflang="uk"${LANG === 'ua' ? ' aria-current="true"' : ''}>UA</a></div>`;

const rail = (here, path) => `
<nav class="rail" aria-label="${attr(ui('menu'))}">
  <a class="wordmark" href="${href('/')}">${ui('name')}</a>
  <div class="rail-mid">
    <div class="rail-nav">${navLinks(NAV_MAIN, here)}</div>
    <div class="rail-nav">${navLinks(NAV_SECOND, here)}</div>
  </div>
  <div class="rail-foot">
    ${navLinks(NAV_MINOR, here)}
    ${ELSEWHERE.map(([h, l]) => `<a href="${h}" target="_blank" rel="noopener">${l}</a>`).join('')}
    ${langControl(path)}
    <p class="rail-meta"><span>${ui('copyright')}</span><span>${ui('kyiv')}</span></p>
  </div>
</nav>`;

const mobile = (here, path) => `
<div class="bar">
  <a class="wordmark" href="${href('/')}">${ui('name')}</a>
  <button type="button" id="menu-open" aria-expanded="false" aria-controls="drawer">${ui('menu')}</button>
</div>
<div class="drawer" id="drawer" role="dialog" aria-modal="true" aria-label="${attr(ui('menu'))}" hidden>
  <div class="drawer-top">
    <span class="wordmark">${ui('name')}</span>
    <button type="button" id="menu-close">${ui('close')}</button>
  </div>
  <div class="group">${navLinks(NAV_MAIN, here)}</div>
  <div class="group">${navLinks(NAV_SECOND, here)}</div>
  <div class="group small">
    ${navLinks(NAV_MINOR, here)}
    ${ELSEWHERE.map(([h, l]) => `<a href="${h}" target="_blank" rel="noopener">${l}</a>`).join('')}
    ${langControl(path)}
  </div>
</div>`;

const lightbox = () => `
<div class="lb" id="lb" role="dialog" aria-modal="true" aria-label="${attr(ui('viewer'))}" hidden>
  <button type="button" class="lb-close" aria-label="${attr(ui('closeViewer'))}">${ui('close')}</button>
  <div class="lb-stage"><img src="" alt="" width="1600" height="1067"></div>
  <div class="lb-bar">
    <span id="lb-cap"></span>
    <span id="lb-count"></span>
    <span class="lb-nav">
      <button type="button" data-lb-prev aria-label="${attr(ui('prevAria'))}">← ${ui('prev')}</button>
      <button type="button" data-lb-next aria-label="${attr(ui('nextAria'))}">${ui('nextImage')} →</button>
    </span>
  </div>
</div>`;

/* The title card. It is not a loader: the page is already rendering behind it,
   it appears once per browsing session, and anyone who asked the system for
   less motion never sees it at all. It carries the full name, with the role
   set quietly to its right on the same line. */
const splash = () => `
<div class="splash" aria-hidden="true"><p class="splash-mark"><span class="splash-name">${ui('name')}</span><span class="splash-role">${ui('role')}</span></p></div>`;

const SPLASH_BOOT = `(function(){try{
if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
if(sessionStorage.getItem('kr-seen'))return;
sessionStorage.setItem('kr-seen','1');
var r=document.documentElement;r.className+=' splash-on';
addEventListener('DOMContentLoaded',function(){
setTimeout(function(){r.className+=' splash-off';},1400);
setTimeout(function(){r.className=r.className.replace(/ splash-o(n|ff)/g,'');},1660);
});}catch(e){}})();`;

/* The face is decided before the first paint, so the headlines do not start in
   one font and jump to the other. */
const foot = () => `
<div class="foot">
  <a href="${href('/rates/')}">${ui('rates')}</a>
  <a href="${href('/privacy/')}">${esc(L(PRIVACY_TITLE))}</a>
  <span>${ui('kyiv')}</span>
  <span>${ui('copyright')}</span>
</div>`;

/* The production site spent years on these lines and Google has them
   indexed. The redesign moved the pages but not the words: where a new page
   answers for an old one, its description — and on the home page its title —
   is the one the old page carried, copied across unchanged. Nothing here is
   written for this file; every string is lifted verbatim from the site it
   replaces. Pages with no single predecessor keep the description the build
   derives from their own text. */
const SEO = {
  "/privacy/": {
    "d": "A short privacy notice for rusanivsky.com and its use of Google Analytics."
  },
  "/ua/privacy/": {
    "d": "Коротка інформація про приватність і використання Google Analytics на сайті Кирила Русанівського."
  },
  "/": {
    "t": "Kyrylo Rusanivsky — Video Editor / Photographer / Graphic Designer",
    "d": "Kyrylo Rusanivsky is a Kyiv-based video editor, photographer and graphic designer. Video editing, event photography, book and cover design, editorial layout."
  },
  "/ua/": {
    "t": "Кирило Русанівський — відеомонтажер, фотограф і графічний дизайнер",
    "d": "Кирило Русанівський — відеомонтажер, фотограф і графічний дизайнер із Києва. Монтаж відео, репортажна фотографія, дизайн книжок і обкладинок, верстка."
  },
  "/rates/": {
    "d": "Work terms, prices and payment for Kyrylo Rusanivsky — video editor, photographer and graphic designer in Kyiv. Rates, timelines, revisions and paperwork."
  },
  "/ua/rates/": {
    "d": "Умови роботи та контакти Кирила Русанівського — відеомонтажера, фотографа і графічного дизайнера з Києва."
  },
  "/work/reportage/": {
    "d": "Reportage photographer in Kyiv. Kyrylo Rusanivsky documents public events, cultural programmes, celebrations, nightlife and audiences."
  },
  "/work/portraits/": {
    "d": "Portrait photographer in Kyiv. Portraits by Kyrylo Rusanivsky for individuals, artists and creative professionals, in studio or on location."
  },
  "/work/backstage/": {
    "d": "Backstage photographer in Kyiv. Behind-the-scenes photography by Kyrylo Rusanivsky for film crews, productions, photo shoots, stages and live events."
  },
  "/work/culture-and-art/": {
    "d": "Culture and art photography in Kyiv: galleries, installations, openings, performances, concerts, theatre, artists and cultural projects by Kyrylo Rusanivsky."
  },
  "/ua/work/reportage/": {
    "d": "Репортажний фотограф у Києві. Кирило Русанівський знімає публічні заходи, культурні програми, святкування, нічне життя й аудиторії."
  },
  "/ua/work/portraits/": {
    "d": "Портретний фотограф у Києві. Портрети для людей, митців і творчих професіоналів — у студії або на локації."
  },
  "/ua/work/backstage/": {
    "d": "Бекстейдж-фотограф у Києві. Фотографія процесів зйомок, знімальних груп, постановок, сцен і живих подій."
  },
  "/ua/work/culture-and-art/": {
    "d": "Фотографія культури та мистецтва в Києві: галереї, інсталяції, відкриття, перформанси, концерти, театр, митці й культурні проєкти."
  },
  "/design/": {
    "d": "Book cover designer in Kyiv. Cover design, editorial typography, book layout and printed matter by Kyrylo Rusanivsky for publishers, authors and cultural projects."
  },
  "/ua/design/": {
    "d": "Дизайнер книжкових обкладинок у Києві. Обкладинки, редакційна типографіка, верстка книжок і поліграфія для видавців, авторів і культурних проєктів."
  }
};

const OG_ALT = {
  en: 'Kyrylo Rusanivsky — video editor, photographer and graphic designer, Kyiv',
  ua: 'Кирило Русанівський — відеомонтажер, фотограф і графічний дизайнер, Київ',
};

function page({ here, path, title, description, body, ogImage = '/og-image.jpg' }) {
  const canonical = other(LANG, path);
  const seo = SEO[canonical];
  if (seo) {
    if (seo.t) title = seo.t;
    if (seo.d) description = seo.d;
  }
  const ogUrl = `${SITE}${ogImage}${ogImage.startsWith('/og-image') ? `?v=${OG_V}` : ''}`;
  return `<!DOCTYPE html>
<html lang="${LANG === 'ua' ? 'uk' : 'en'}" data-theme="auto">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${attr(description)}">
<meta name="author" content="Kyrylo Rusanivsky">
${LIVE ? '' : '<meta name="robots" content="noindex, nofollow">\n'}<link rel="canonical" href="${SITE}${canonical}">
<link rel="alternate" hreflang="en" href="${SITE}${other('en', path)}">
<link rel="alternate" hreflang="uk" href="${SITE}${other('ua', path)}">
<link rel="alternate" hreflang="x-default" href="${SITE}${other('en', path)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Kyrylo Rusanivsky">
<meta property="og:locale" content="${LANG === 'ua' ? 'uk_UA' : 'en_US'}">
<meta property="og:locale:alternate" content="${LANG === 'ua' ? 'en_US' : 'uk_UA'}">
<meta property="og:url" content="${SITE}${canonical}">
<meta property="og:title" content="${attr(title)}">
<meta property="og:description" content="${attr(description)}">
<meta property="og:image" content="${ogUrl}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${attr(OG_ALT[LANG])}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${attr(title)}">
<meta name="twitter:description" content="${attr(description)}">
<meta name="twitter:image" content="${ogUrl}">
<meta name="theme-color" content="#f4f1e9">
<link rel="icon" href="/favicon.ico?v=${ICON_V}" sizes="32x32">
<link rel="icon" href="/favicon.svg?v=${ICON_V}" type="image/svg+xml">
<link rel="icon" href="/favicon-dark.ico?v=${ICON_V}" sizes="32x32" media="(prefers-color-scheme: dark)">
<link rel="icon" href="/favicon-dark.svg?v=${ICON_V}" type="image/svg+xml" media="(prefers-color-scheme: dark)">
<link rel="apple-touch-icon" href="/apple-touch-icon.png?v=${ICON_V}">
<link rel="apple-touch-icon" href="/apple-touch-icon-dark.png?v=${ICON_V}" media="(prefers-color-scheme: dark)">
<link rel="manifest" href="/site.webmanifest?v=${ICON_V}">
<link rel="preload" href="/fonts/fixel-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${DISPLAY_FONT}" as="font" type="font/woff2" crossorigin>
${LANG === 'ua' ? '<link rel="preload" href="/fonts/fixel-cyrillic.woff2" as="font" type="font/woff2" crossorigin>\n' : ''}<link rel="stylesheet" href="/styles/site.css?v=${CSS_V}">
<script>${SPLASH_BOOT}</script>
<script src="/scripts/site.js?v=${JS_V}" defer></script>
${LIVE ? `<script src="/scripts/google-analytics.js?v=${GA_V}" defer></script>\n` : ''}
</head>
<body>
<a class="skip" href="#main">${ui('skip')}</a>
${splash()}
<div class="shell">
${rail(here, path)}
${mobile(here, path)}
${body}
</div>
${lightbox()}
</body>
</html>
`;
}

/* ---------------- shared pieces ---------------- */

const DISCIPLINE = {
  photography: { en: 'Photography', ua: 'Фотографія' },
  video: { en: 'Video', ua: 'Відео' },
  design: { en: 'Design', ua: 'Дизайн' },
};
const ROLE = {
  Photography: { en: 'Photography', ua: 'Фотографія' },
  Producing: { en: 'Producing', ua: 'Продюсування' },
  Camera: { en: 'Camera', ua: 'Камера' },
  Editing: { en: 'Editing', ua: 'Монтаж' },
  'Cover design': { en: 'Cover design', ua: 'Дизайн обкладинки' },
};

function projectMeta(p) {
  const discipline = p.disciplines.map((d) => L(DISCIPLINE[d])).join(' / ');
  const bits = [discipline];
  // A role that only restates the practice, or a client that only restates
  // the title, adds nothing to the row.
  const roles = p.roles.filter((r) => L(ROLE[r] || r) !== discipline).map((r) => L(ROLE[r] || r));
  if (roles.length) bits.push(roles.join(', '));
  if (p.client && p.client !== L(p.title)) bits.push(p.client);
  if (p.year) bits.push(p.year);
  return bits;
}

function img(src, alt, { lazy = true, eager = false } = {}) {
  const d = dim(src);
  return `<img src="${src}" alt="${attr(alt || '')}"${d ? ` width="${d.w}" height="${d.h}"` : ''}` +
    `${eager ? ' fetchpriority="high"' : ''} loading="${lazy && !eager ? 'lazy' : 'eager'}" decoding="async">`;
}

/* A cover that is not 16:9 gets cropped to the band. Where the crop sits is
   a property of the picture — a title in the lower third, a motif in the
   upper half — so it is carried in the data and nothing is guessed here. */
const focusStyle = (p) => (p.coverFocus ? ` style="--focus:${attr(p.coverFocus)}"` : '');

/* How wide a frame stands in a project's sequence is not a taste call and not
   a fixed column count — it comes from the frame's own shape. Two pictures
   read as the same size when they cover the same area, and the area of a
   frame set to a given width goes as w² / ratio, so the width itself goes as
   √ratio. Sixteen-by-nine is the anchor at six columns of twelve; everything
   else follows from it and is rounded to the grid. Three columns is the
   floor and eight the ceiling: narrower than three a frame stops being a
   frame, wider than eight it stops being one of several and the page loses
   its rhythm. A standing 9:16 lands on three, a 4:3 on five, a square on
   four or five — all of them covering roughly the same area, which is what
   makes them look like one set and not a pile. */
const spanAt = (anchor, d, lo, hi) =>
  (d
    ? Math.min(hi, Math.max(lo, Math.round((anchor / Math.sqrt(16 / 9)) * Math.sqrt(d.w / d.h))))
    : anchor);
const spanFor = (d) => spanAt(6, d, 3, 8);

function player(item, eager = false) {
  const d = dim(item.poster);
  const vertical = d && d.h > d.w;
  return `<div class="player${vertical ? ' vertical' : ''}">
  ${img(item.poster, '', { eager })}
  <button type="button" class="player-btn" data-platform="${item.platform}" data-video-id="${item.videoId}" aria-label="${attr(ui('play') + ' — ' + item.title)}"></button>
</div>`;
}

/* ---------------- home ---------------- */

/* The stage shows several frames from a project, not one cover: screenshots
   for the video work, photographs for the photography. The pick looks
   arbitrary but is not random — a build has to be reproducible, so the
   shuffle is seeded with the project's own slug and gives the same set every
   time. Real randomness would change the HTML on every run.

   The panel is about eight hundred pixels across, so the cap is what stays
   legible in it rather than what exists: at four frames in two rows of two
   each one is still a picture, and past that the wall becomes a contact
   sheet. Design shows what it has, which is one or two. */
const STAGE_MAX = { photography: 4, video: 4, design: 4 };

function seeded(slug) {
  let h = 2166136261;
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13; h >>>= 0;
    h ^= h >> 17;
    h ^= h << 5; h >>>= 0;
    return h / 4294967296;
  };
}

/* Stills a project actually owns: its own photographs, or the poster frame of
   each of its films. Nothing is generated and nothing is borrowed. */
function stills(p) {
  const out = [];
  for (const m of p.media || []) {
    if (m.type === 'image' && m.src) out.push({ src: m.src, alt: L(m.alt) || L(p.title) });
    else if (m.poster) out.push({ src: m.poster, alt: m.title || L(p.title) });
  }
  if (!out.length && p.cover) out.push({ src: p.cover, alt: L(p.title) });
  const seen = new Set();
  return out.filter((x) => (seen.has(x.src) ? false : seen.add(x.src)));
}

/* One wall, one shape. A single standing frame among wide ones cannot share a
   cell with them without either cropping it or leaving a hole, so the odd ones
   out step aside — but only while the project still has two frames of its own
   dominant shape. A film whose only poster is vertical keeps it. */
function sameShape(items) {
  const tall = (x) => { const d = dim(x.src); return !!d && d.h > d.w; };
  const standing = items.filter(tall);
  const lying = items.filter((x) => !tall(x));
  const major = lying.length >= standing.length ? lying : standing;
  return major.length >= 2 ? major : items;
}

function stagePick(p) {
  const all = sameShape(stills(p));
  const cap = STAGE_MAX[p.disciplines[0]] ?? 6;
  if (all.length <= cap) return all;
  /* The cover leads, the rest are drawn from the whole set rather than the
     first ten in file order, so the stage is not just the top of the folder. */
  const rest = all.filter((x) => x.src !== p.cover);
  const rnd = seeded(p.slug);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  const lead = all.find((x) => x.src === p.cover);
  return (lead ? [lead] : []).concat(rest).slice(0, cap);
}

/* Rows of two or three. Each frame's cell is as wide as its own proportions
   ask for, so nothing is cropped to fit its neighbour. */
/* Choosing the arrangement.

   The wall is a plain grid and every frame in it is the same size as every
   other — no frame is singled out. Only arrangements that fill their grid
   exactly are allowed, so the wall never ends on an empty cell.

   Which arrangement depends on the frames themselves. A cell's proportions are
   (stageAspect · rows / columns); the closer that is to the proportions of the
   pictures, the less empty room is left around each one. Nothing is cropped —
   a picture that does not match its cell simply keeps a little air. Two wide
   screenshots therefore stack one above the other, while two standing frames
   stand side by side. */
const STAGE_ASPECT = 0.94;

/* One or two across, never three. Three columns inside a panel eight hundred
   pixels wide turns every frame into a thumbnail, and a count that no column
   number divides — five, say — used to fall back to a single tall column,
   which is the worst of both. Rows are rounded up instead of required to come
   out even, and an odd last frame is centred under the pair above it. */
function arrangements(n) {
  const out = [];
  for (let c = 1; c <= 2; c++) out.push({ n, c, rows: Math.ceil(n / c) });
  return out;
}

function median(xs) {
  const a = [...xs].sort((x, y) => x - y);
  return a[Math.floor(a.length / 2)];
}

function compose(cells, cap) {
  const ratio = median(cells.map((x) => x.ratio));
  /* A project with only a handful of frames shows all of them — three
     screenshots are three screenshots, not two. Trimming is only ever a way of
     keeping a long photographic series to a sensible number. */
  /* Two is the smallest wall worth calling one, so the search may go all the
     way down to a pair. Whether it does is settled by the frames themselves:
     four photographs in two rows of two fill the panel well, while four wide
     sixteen-by-nines in the same arrangement are half the size they could be —
     stacked as a pair each one spans the panel. The penalty below is what
     makes showing more worth a little imperfection, and it is a fifth of a
     step per dropped frame: enough to keep a series a series, not enough to
     keep a shape nobody would choose. */
  const floor = Math.min(cells.length, 2);
  let best = null;
  for (let n = Math.min(cap, cells.length); n >= floor; n--) {
    for (const a of arrangements(n)) {
      const cellAspect = (STAGE_ASPECT * a.rows) / a.c;
      /* Distance in proportion, not in pixels, so a cell half as wide as its
         picture counts the same as one twice as wide. */
      const fit = Math.abs(Math.log(cellAspect / ratio));
      /* Showing more of the project is worth a little imperfection — a
         photography series is meant to read as a series — but not a cell so
         badly shaped that the picture floats in it. */
      const score = fit + (cells.length - n) * 0.2;
      if (!best || score < best.score) best = { ...a, score };
    }
  }
  return best;
}

/* The rule for a lone frame. A full wall fills the panel; one frame on its own
   would either float in it or fill it like a poster, so it is given a fixed
   share of the panel's AREA — not of its width. Width alone would make a wide
   still a thin strip and a standing cover a tall slab; equal area makes them
   weigh the same, and each keeps its own proportions. Width follows from the
   frame's own ratio: area = w · w · (stageAspect / ratio), so w = √(area ·
   ratio / stageAspect), with a ceiling so nothing touches the edges. */
const SOLO_AREA = 0.32;

/* How much of the panel a wall covers when it is allowed to grow as large as
   it fits: limited by the panel's width when the wall is the wider shape, by
   its height when it is the taller one. */
const fitShare = (wall) => Math.min(STAGE_ASPECT / wall, wall / STAGE_ASPECT);

function soloScale(wall) {
  return Math.min(Math.sqrt(SOLO_AREA / fitShare(wall)), 0.88).toFixed(3);
}

function mosaic(p, eager) {
  const picked = stagePick(p).map((x) => {
    const d = dim(x.src);
    return { ...x, ratio: d ? d.w / d.h : 1.6 };
  });
  const cap = STAGE_MAX[p.disciplines[0]] ?? 6;
  const a = compose(picked, Math.min(cap, 9));
  const cells = picked.slice(0, a.n);

  const odd = a.c === 2 && a.n % 2 === 1;
  const tiles = cells.map((x, i) =>
    `<span class="tile${odd && i === a.n - 1 ? ' orphan' : ''}">${img(x.src, x.alt, { lazy: !eager, eager })}</span>`).join('');

  /* The wall is given the shape of the frames it holds — columns and rows
     multiplied by the frames' own proportions — so it grows to the largest
     size that fits the panel and every cell comes out the shape of its
     picture. Cells that filled the panel regardless of shape left the air
     between the rows instead, and the wall read as torn apart. */
  const wall = (a.c / a.rows) * median(cells.map((x) => x.ratio));
  const solo = a.n === 1 ? `;--solo:${soloScale(wall)}` : '';
  return `<span class="mosaic${a.n === 1 ? ' solo' : ''}" style="--mc:${a.c};--mr:${a.rows};--wall:${wall.toFixed(3)}${solo}">${tiles}</span>`;
}

/* Seven is the whole selection on the home page: the list is a door, not an
   archive, and seven rows still fit the column without crowding the type. */
const featured = projects
  .filter((p) => p.featured)
  .sort((a, b) => a.featuredOrder - b.featuredOrder)
  .slice(0, 7);

const STANDFIRST = {
  en: 'Kyrylo Rusanivsky works in Kyiv across three practices — photography, video and graphic design — and keeps a street-photography series of his own. Selected projects below.',
  ua: 'Кирило Русанівський працює в Києві у трьох практиках — фотографія, відео і графічний дизайн — і веде власну серію вуличних світлин. Нижче — обрані проєкти.',
};

function homePage() {
  const rows = featured.map((p, i) => `<a class="row" href="${href(`/work/${p.slug}/`)}">
  <span class="row-head">
    <span class="row-no">${String(i + 1).padStart(2, '0')}</span>
    ${t(p.title, 'row-title')}
  </span>
  <span class="row-meta">${projectMeta(p).map(esc).join('<span class="dot">·</span>')}</span>
  <span class="row-preview"${focusStyle(p)}>${img(p.cover, L(p.title), { lazy: i > 0 })}</span>
</a>`).join('\n');

  const slides = featured.map((p, i) =>
    `<div class="slide${i === 0 ? ' on' : ''}" data-title="${attr(L(p.title))}" data-meta="${attr(projectMeta(p).join(' · '))}" aria-hidden="${i === 0 ? 'false' : 'true'}">${mosaic(p, i === 0)}</div>`).join('\n');

  const body = `
<main class="home" id="main">
  <div class="index-col">
    <h1 class="eyebrow">${ui('selectedWork')}<span class="sr"> — ${ui('name')}</span></h1>
    ${t(STANDFIRST, 'standfirst t-lead', 'p')}
    <div class="index">
${rows}
    </div>
  </div>
  <div class="stage" id="stage" aria-hidden="true">
    <div class="stage-frame">
${slides}
    </div>
    <p class="stage-caption"><span id="stage-title"></span><span id="stage-meta"></span></p>
  </div>
</main>`;

  return page({
    here: '/',
    path: '/',
    title: LANG === 'ua' ? 'Кирило Русанівський — обрані роботи' : 'Kyrylo Rusanivsky — Selected Work',
    description: L(STANDFIRST),
    body,
  });
}

/* ---------------- practice indexes ---------------- */

/* A selection is not a catalogue. In a catalogue every row is the same
   height because the rows are an index; in a selection the first project is
   the one the page is arguing for, and the rest follow it. The width still
   comes from the picture's own shape — the same equal-area law the project
   pages use — only the anchor changes: nine columns for the lead, six for
   the others. Nothing is placed by hand, so adding a project cannot break
   the page, and a standing cover is never flattened into a band to make the
   row line up. The ragged right edge is the point: it is where the page
   breathes. */
const LEAD_SPAN = (d) => spanAt(9, d, 6, 9);
const RESTSPAN = (d) => spanAt(6, d, 3, 6);

function workCard(p, { lead = false, curated = false } = {}) {
  const meta = projectMeta(p);
  const d = dim(p.cover);
  const vars = [];
  if (curated) {
    vars.push(`--span:${(lead ? LEAD_SPAN : RESTSPAN)(d)}`);
    if (d) vars.push(`--ar:${d.w}/${d.h}`);
  }
  if (p.coverFocus) vars.push(`--focus:${p.coverFocus}`);
  const style = vars.length ? ` style="${attr(vars.join(';'))}"` : '';
  return `<a class="work" href="${href(`/work/${p.slug}/`)}"${curated ? style : ''}>
  <span class="work-cover"${curated ? '' : focusStyle(p)}>${img(p.cover, L(p.title))}</span>
  ${t(p.title, 'work-title')}
  <span class="work-meta">${meta.slice(1).map(esc).join(' · ') || esc(meta[0])}</span>
</a>`;
}

function practicePage({ here, discipline, extra = '' }) {
  const list = projects.filter((p) => p.disciplines.includes(discipline));
  const title = L(DISCIPLINE[discipline]);
  const intro = PRACTICE_INTRO[discipline];
  const body = `
<main class="page g12" id="main">
  <div class="page-head col-8">
    <p class="eyebrow">${ui('practice')}</p>
    <h1 class="page-title t-title">${esc(title)}</h1>
    ${t(intro, 'page-intro t-lead col-7', 'p')}
  </div>
  <section class="section col-full">
    <h2 class="section-label">${ui('projects')}</h2>
    <div class="works selection">${list
      .map((p, i) => workCard(p, { lead: i === 0, curated: true }))
      .join('\n')}</div>
  </section>
  ${extra}
  <div class="col-full">${foot()}</div>
</main>`;
  return page({
    here,
    path: here,
    title: `${title} — ${ui('name')}`,
    description: L(intro),
    body,
  });
}

function catalogueBlock() {
  return videoCatalogue.map((g) => `
  <section class="section col-full">
    <h2 class="section-label">${esc(L(g.title))}</h2>
    <div class="works">
      ${g.items.map((v) => `<div class="work">
        ${player(v)}
        <p class="vid-title">${esc(v.title)}</p>
        <p class="vid-meta">${[v.role, v.client].filter(Boolean).map(esc).join(' · ')}</p>
      </div>`).join('\n')}
    </div>
  </section>`).join('\n');
}

/* ---------------- collage ----------------
   Galleries are laid out in CSS columns rather than a row grid. Four columns
   with the grid's own gutter measure exactly three grid tracks each — and six
   tracks when it drops to two columns — so the collage never leaves the grid
   while still letting frames of different heights sit at different levels,
   which is what makes a wall of photographs read as an edit and not as a
   contact sheet.

   The width and rhythm variations are keyed to the index, so the same input
   always produces the same page. */
function collage(items, groupId, eagerFirst = false) {
  const WIDTHS = ['is-full', 'is-full', 'is-inset', 'is-full', 'is-inset-right', 'is-full'];
  const RHYTHM = ['gap-m', 'gap-l', 'gap-s', 'gap-m', 'gap-xl', 'gap-s', 'gap-l', 'gap-m'];
  const cells = items.map((item, i) => {
    const d = dim(item.src);
    const portrait = d && d.h / d.w > 1.15;
    const width = portrait ? 'is-inset' : WIDTHS[i % WIDTHS.length];
    return `<a class="cell ${width} ${RHYTHM[i % RHYTHM.length]}" href="${item.src}" data-lb>
      <figure class="shot">${img(item.src, item.alt, { eager: eagerFirst && i === 0 })}</figure>
    </a>`;
  }).join('\n');
  return `<div class="collage" data-lb-group="${groupId}">${cells}</div>`;
}

/* ---------------- project pages ---------------- */

function projectPage(p, index) {
  const meta = projectMeta(p);
  const isVideo = p.media[0].type === 'video';
  const leadItems = p.media.filter((m) => m.lead);
  const restItems = p.media.filter((m) => m.type === 'image' && !m.lead);

  let sequence;
  if (isVideo) {
    sequence = p.media.map((v, i) => `<div class="span-${spanFor(dim(v.poster))}">
      ${player(v, i === 0)}
      <p class="vid-title">${esc(v.title)}</p>
    </div>`).join('\n');
  } else if (p.disciplines.includes('photography')) {
    sequence = `<div class="col-full">${collage(leadItems.length ? leadItems : p.media, p.slug, true)}</div>`;
    if (restItems.length) {
      sequence += `
      <button type="button" class="rest-toggle col-full" aria-controls="rest-${p.slug}">${ui('showRest')} ${restItems.length} ${ui('frames')}</button>
      <div class="rest col-full" id="rest-${p.slug}" hidden>${collage(restItems, p.slug + '-rest')}</div>`;
    }
  } else {
    // Design projects are one or two deliberate objects; a collage of two
    // items is not a collage, it is two pictures with an excuse.
    sequence = p.media.map((m, i) =>
      `<a class="span-${spanFor(dim(m.src))}" href="${m.src}" data-lb><figure class="shot">${img(m.src, m.alt, { eager: i === 0 })}</figure></a>`).join('\n');
  }

  const others = projects.filter((o) => o.slug !== p.slug);
  const related = [others[(index + 1) % others.length], others[(index + 2) % others.length]];
  const roles = p.roles.filter((r) => L(ROLE[r] || r) !== meta[0]).map((r) => L(ROLE[r] || r));

  const body = `
<main class="project g12" id="main">
  <div class="project-head col-8">
    <p class="eyebrow">${esc(meta[0])}${p.context === 'personal' ? ' · ' + ui('personal') : ''}</p>
    <h1 class="project-title t-display">${esc(L(p.title))}</h1>
    ${t(p.shortDescription, 'project-dek t-lead col-7', 'p')}
    <dl class="facts">
      ${p.client ? `<div><dt>${ui('client')}</dt><dd>${esc(p.client)}</dd></div>` : ''}
      ${roles.length ? `<div><dt>${ui('role')}</dt><dd>${esc(roles.join(', '))}</dd></div>` : ''}
      ${p.year ? `<div><dt>${ui('year')}</dt><dd>${esc(p.year)}</dd></div>` : ''}
      <div><dt>${ui('practice')}</dt><dd>${esc(meta[0])}</dd></div>
    </dl>
  </div>

  <div class="seq col-full g12" style="padding-inline:0"${isVideo || p.disciplines.includes('photography') ? '' : ` data-lb-group="${attr(p.slug)}"`}>
${sequence}
  </div>

  ${p.credits.length ? `<div class="credits col-7">
    <h2 class="section-label">${ui('credits')}</h2>
    <ul>${p.credits.map((c) => t(c, '', 'li')).join('')}</ul>
  </div>` : ''}

  ${p.externalLinks.length ? `<div class="col-7" style="margin-top:2rem">
    <ul class="bullets">${p.externalLinks.map((l) => `<li><a href="${l.href}" target="_blank" rel="noopener">${esc(l.label)} →</a></li>`).join('')}</ul>
  </div>` : ''}

  <section class="section col-full">
    <h2 class="section-label">${ui('next')}</h2>
    <div class="works works-pair">${related.map(workCard).join('')}</div>
  </section>

  <div class="col-full">${foot()}</div>
</main>`;

  return page({
    here: '',
    path: `/work/${p.slug}/`,
    title: `${L(p.title)} — ${ui('name')}`,
    description: L(p.shortDescription),
    body,
    ogImage: p.cover,
  });
}

/* ---------------- text pages ---------------- */

function ratesPage() {
  const renderRows = (rows) => {
    const out = [];
    let prices = [], bullets = [], steps = [];
    const flush = () => {
      if (prices.length) { out.push(`<ul class="rate-list">${prices.join('')}</ul>`); prices = []; }
      if (bullets.length) { out.push(`<ul class="bullets">${bullets.join('')}</ul>`); bullets = []; }
      if (steps.length) { out.push(`<ol class="steps">${steps.join('')}</ol>`); steps = []; }
    };
    for (const r of rows) {
      if (r.kind === 'price') {
        /* A short amount sits opposite its label; a long one is a condition,
           not a figure, so it takes its own line and reads left-aligned. */
        const long = L(r.amount).length > 28;
        prices.push(`<li>${t(r.label)}${t(r.amount, long ? 'amount amount-long' : 'amount')}</li>`);
        continue;
      }
      if (r.kind === 'bullet') { bullets.push(t(r, '', 'li')); continue; }
      if (r.kind === 'step') {
        steps.push(`<li><span class="n">${String(steps.length + 1).padStart(2, '0')}</span><span>${t(r.title, '', 'b')}${t(r.text)}</span></li>`);
        continue;
      }
      flush();
      if (r.kind === 'group') out.push(`<div class="rate-group"><h3>${esc(L(r))}</h3></div>`);
      else out.push(t(r, r.kind === 'note' ? 'page-intro' : '', 'p'));
    }
    flush();
    return out.join('\n');
  };

  const sections = rates.sections.map((s) => `
  <section class="section col-full g12" style="padding-inline:0">
    <h2 class="section-label col-full" id="${s.id}">${esc(L(s.title))}</h2>
    <div class="prose col-8" style="margin-top:1.1rem">${renderRows(s.rows)}</div>
  </section>`).join('\n');

  const body = `
<main class="page g12" id="main">
  <div class="page-head col-8">
    <p class="eyebrow">${ui('commercial')}</p>
    <h1 class="page-title t-title">${ui('rates')}</h1>
    <div class="prose t-lead col-7" style="margin-top:1.2rem">${rates.intro.map((p) => t(p, '', 'p')).join('')}</div>
  </div>
  ${sections}
  <div class="col-full">${foot()}</div>
</main>`;
  return page({
    here: '/rates/',
    path: '/rates/',
    title: `${UI.rates[LANG].replace('&amp;', '&')} — ${ui('name')}`,
    description: L(rates.intro[0]),
    body,
  });
}

const ABOUT = [
  {
    en: 'I edit videos. I design and typeset books. I photograph people and events. I work on interviews, YouTube series and social-media videos; I create publications and printed materials. I also keep a street-photography series about the city, spontaneous scenes and landscapes. I work remotely.',
    ua: 'Монтую відео. Проєктую й верстаю книжки. Знімаю людей і події. Працюю з інтерв’ю, YouTube-серіями й роликами для соцмереж; створюю видання та поліграфічну продукцію. Також веду серію вуличних світлин — про місто, випадкові сцени і краєвиди. Працюю дистанційно.',
  },
  {
    en: 'I have worked remotely, as a freelancer, since 2013. Right now I take on video editing and design projects — from a single task to ongoing support. I work as a registered sole proprietor in Ukraine: a contract or a public offer, an invoice, payment to a business account.',
    ua: 'Працюю дистанційно, на фрилансі, з 2013 року. Зараз беру проєкти з відеомонтажу та графічного дизайну — від однієї задачі до постійного супроводу. Працюю офіційно як ФОП: договір або публічна оферта, рахунок, акт, оплата на розрахунковий рахунок.',
  },
];

const PORTRAIT_ALT = {
  en: 'Kyrylo Rusanivsky with a camera at a cafe table in Kyiv',
  ua: 'Кирило Русанівський з камерою за столиком кафе в Києві',
};

function infoPage() {
  const body = `
<main class="page g12" id="main">
  <div class="about-copy">
    <p class="eyebrow">${ui('info')}</p>
    <h1 class="page-title t-title">${ui('name')}</h1>
    <div class="prose t-lead" style="margin-top:1.2rem">${ABOUT.map((p) => t(p, '', 'p')).join('')}</div>
  </div>
  <div class="about-figure">
    <figure class="portrait">
      <picture>
        <source type="image/avif" srcset="/media/portrait/photo-640.avif 640w, /media/portrait/photo-768.avif 768w" sizes="(min-width: 61rem) 20.4rem, (min-width: 34rem) 22.1rem, 92vw">
        <source type="image/webp" srcset="/media/portrait/photo-640.webp 640w, /media/portrait/photo-768.webp 768w" sizes="(min-width: 61rem) 20.4rem, (min-width: 34rem) 22.1rem, 92vw">
        <img src="/media/portrait/photo-768.jpg" width="768" height="960" alt="${attr(L(PORTRAIT_ALT))}" loading="lazy" decoding="async">
      </picture>
    </figure>
  </div>

  <section class="section col-full g12" style="padding-inline:0">
    <div class="pair-left">
      <h2 class="section-label">${ui('capabilities')}</h2>
      <dl class="spec-list">
        ${CAPABILITIES.map((c) => `<div><dt>${esc(L(c.k))}</dt><dd>${esc(L(c.v))}</dd></div>`).join('')}
      </dl>
    </div>
    <div class="pair-right">
      <h2 class="section-label">${ui('selectedClients')}</h2>
      <ul class="client-list">
        ${clients.map((c) => `<li><a href="${c.href}" target="_blank" rel="noopener">${esc(c.name)}</a></li>`).join('')}
      </ul>
    </div>
  </section>

  <section class="section col-full g12" style="padding-inline:0">
    <h2 class="section-label col-full">${ui('elsewhere')}</h2>
    <ul class="client-list two-col col-7">
      <li><a href="mailto:${EMAIL}">${EMAIL}</a></li>
      ${PROFILES.map(([h, l]) => `<li><a href="${h}" target="_blank" rel="noopener">${l}</a></li>`).join('\n      ')}
    </ul>
  </section>
  <div class="col-full">${foot()}</div>
</main>`;
  return page({
    here: '/info/',
    path: '/info/',
    title: `${ui('info')} — ${ui('name')}`,
    description: L(ABOUT[0]),
    body,
  });
}

const ENQ_TITLE = {
  en: 'Tell me the format, the deadline and the budget.',
  ua: 'Напишіть формат, дедлайн і бюджет.',
};
const ENQ_INTRO = {
  en: 'Write in whichever channel suits you. I reply within one business day.',
  ua: 'Пишіть у зручний спосіб. Відповідаю протягом одного робочого дня.',
};
const ENQ_FORM_NOTE = {
  en: 'This opens your mail client with the answers filled in — nothing is sent anywhere else.',
  ua: 'Форма відкриє ваш поштовий клієнт із заповненими відповідями — більше нікуди нічого не йде.',
};

function enquiriesPage() {
  const body = `
<main class="page g12" id="main">
  <div class="page-head col-8">
    <p class="eyebrow">${ui('enquiries')}</p>
    <h1 class="page-title t-title">${esc(L(ENQ_TITLE))}</h1>
    ${t(ENQ_INTRO, 'page-intro t-lead', 'p')}
  </div>

  <section class="section col-full g12" style="padding-inline:0">
    <h2 class="section-label col-full">${ui('direct')}</h2>
    <ul class="channels col-7">
      <li><a href="mailto:${EMAIL}"><span>${EMAIL}</span><span class="who">Email</span></a></li>
      <li><a href="https://t.me/rusanivsky" target="_blank" rel="noopener"><span>@rusanivsky</span><span class="who">Telegram</span></a></li>
      <li><a href="https://wa.me/380938676581" target="_blank" rel="noopener"><span>+38 093 867 65 81</span><span class="who">WhatsApp</span></a></li>
    </ul>
  </section>

  <section class="section col-full g12" style="padding-inline:0">
    <h2 class="section-label col-full">${ui('shortBrief')}</h2>
    <p class="page-intro col-7">${esc(L(ENQ_FORM_NOTE))} <a href="${href('/rates/')}">${ui('rates')}</a> ${ui('ratesCovers')}</p>
    <form class="brief col-7" id="brief" data-mailto="${EMAIL}" data-subject="${attr(ui('briefSubject'))}">
      <label for="b-contact">${ui('yourContact')}</label>
      <input id="b-contact" name="Contact" type="text" required
             aria-describedby="b-contact-note" autocomplete="email">
      <p class="field-note" id="b-contact-note">${ui('contactHint')}</p>
      <label for="b-disc">${ui('discipline')}</label>
      <select id="b-disc" name="Discipline">
        <option>${ui('video')}</option>
        <option>${ui('photography')}</option>
        <option>${ui('graphicDesign')}</option>
        <option>${ui('moreThanOne')}</option>
      </select>
      <label for="b-dead">${ui('deadline')}</label>
      <input id="b-dead" name="Deadline" type="text" autocomplete="off">
      <label for="b-budget">${ui('budget')}</label>
      <input id="b-budget" name="Budget" type="text" autocomplete="off">
      <label for="b-msg">${ui('message')}</label>
      <textarea id="b-msg" name="Message"></textarea>
      <button type="submit">${ui('send')}</button>
      <noscript><p class="field-note">${ui('briefNoJs')}</p></noscript>
    </form>
  </section>

  <div class="col-full">${foot()}</div>
</main>`;
  return page({
    here: '/enquiries/',
    path: '/enquiries/',
    title: `${ui('enquiries')} — ${ui('name')}`,
    description: L(ENQ_INTRO),
    body,
  });
}

const STREET_INTRO = {
  en: 'A street-photography series about the city, spontaneous scenes and landscapes. It is not commissioned work and it is never finished — it runs alongside everything else.',
  ua: 'Серія вуличних світлин — про місто, випадкові сцени і краєвиди. Це не замовна робота і вона ніколи не завершена: вона триває поряд з усім іншим.',
};
const STREET_NOTE = {
  en: 'The edit for this page is still being made. The production site has never published these frames on its own pages — until a real selection exists here, the series continues on Instagram.',
  ua: 'Добірку для цієї сторінки ще роблю. На основному сайті ці кадри ніколи не публікувалися окремо — доки тут немає справжнього відбору, серія триває в Instagram.',
};

function streetPage() {
  const body = `
<main class="page g12" id="main">
  <div class="page-head col-8">
    <p class="eyebrow">${ui('personal')}</p>
    <h1 class="page-title t-title">${ui('street')}</h1>
    ${t(STREET_INTRO, 'page-intro t-lead col-7', 'p')}
  </div>

  <section class="section col-full g12" style="padding-inline:0">
    <h2 class="section-label col-full">${ui('theSequence')}</h2>
    <div class="prose col-7" style="margin-top:1.1rem">
      ${t(STREET_NOTE, '', 'p')}
      <p><a href="https://www.instagram.com/rusanivsky/" target="_blank" rel="noopener">Instagram — @rusanivsky →</a></p>
    </div>
  </section>
  <div class="col-full">${foot()}</div>
</main>`;
  return page({
    here: '/street/',
    path: '/street/',
    title: `${ui('street')} — ${ui('name')}`,
    description: L(STREET_INTRO),
    body,
  });
}

/* The privacy notice is the one page of the old site that is not portfolio:
   a legal text with its own indexed URL. Every sentence below is copied
   verbatim from rusanivsky.com/privacy/ and its Ukrainian twin — the words
   are not re-edited here, only moved into the two-language rendering the
   rest of the site uses. The date the notice carries is the date it was last
   changed by its author, not the date of this port. */
const PRIVACY_TITLE = { en: 'Privacy', ua: 'Приватність' };
const PRIVACY_DEK = {
  en: 'This short notice explains what happens when you visit rusanivsky.com. It was last updated on 12 September 2026.',
  ua: 'Це коротке повідомлення пояснює, що відбувається, коли ви відвідуєте rusanivsky.com. Оновлено 12 вересня 2026 року.',
};
const PRIVACY = [
  { h: { en: 'Analytics', ua: 'Аналітика' },
    p: [
      { en: 'This site uses Google Analytics 4 to understand which pages are visited and how the site is used. Google Analytics may collect page views, session information, approximate location, browser and device information, and interactions such as scrolling and clicks on contact links.',
        ua: 'Цей сайт використовує Google Analytics 4, щоб розуміти, які сторінки відвідують і як використовують сайт. Google Analytics може збирати перегляди сторінок, інформацію про сеанси, приблизне місцезнаходження, дані браузера й пристрою, а також взаємодії — наприклад прокручування та кліки на контактні посилання.' },
      { en: 'The site does not send the contents of your messages or contact details to Google Analytics. The Analytics tag uses the first-party _ga cookie to distinguish visitors and sessions.',
        ua: 'Сайт не надсилає вміст ваших повідомлень або контактні дані до Google Analytics. Тег Analytics використовує власний cookie-файл _ga, щоб розрізняти відвідувачів і сеанси.' },
    ] },
  { h: { en: 'Your choices', ua: 'Ваш вибір' },
    p: [
      { en: 'You can delete or block cookies in your browser settings. You can also use browser tools that disable Google Analytics measurement. Some site functions, such as language preference, may use local browser storage.',
        ua: 'Ви можете видалити або заблокувати cookie у налаштуваннях браузера. Також можна використовувати інструменти браузера, які вимикають вимірювання Google Analytics. Деякі функції сайту, наприклад вибір мови, можуть використовувати локальне сховище браузера.' },
    ],
    link: { href: 'https://policies.google.com/privacy',
            label: { en: 'Read Google’s Privacy Policy', ua: 'Читайте Політику конфіденційності Google' } } },
  { h: { en: 'Contact', ua: 'Контакт' },
    p: [], mail: { en: 'For questions about this notice or the site, write to ',
                   ua: 'Якщо у вас є запитання про це повідомлення або сайт, напишіть на ' } },
];

function privacyPage() {
  const sections = PRIVACY.map((s) => `
  <section class="section col-full g12" style="padding-inline:0">
    <h2 class="section-label col-full">${esc(L(s.h))}</h2>
    <div class="prose col-7" style="margin-top:1.1rem">
      ${s.p.map((x) => t(x, '', 'p')).join('')}
      ${s.link ? `<p><a href="${s.link.href}" target="_blank" rel="noopener">${esc(L(s.link.label))}</a></p>` : ''}
      ${s.mail ? `<p>${esc(L(s.mail))}<a href="mailto:${EMAIL}">${EMAIL}</a>.</p>` : ''}
    </div>
  </section>`).join('');

  const body = `
<main class="page g12" id="main">
  <div class="page-head col-8">
    <p class="eyebrow">${esc(L(PRIVACY_TITLE))}</p>
    <h1 class="page-title t-title">${esc(L(PRIVACY_TITLE))}</h1>
    ${t(PRIVACY_DEK, 'page-intro t-lead col-7', 'p')}
  </div>
${sections}
  <div class="col-full">${foot()}</div>
</main>`;
  return page({
    here: '/privacy/',
    path: '/privacy/',
    title: `${L(PRIVACY_TITLE)} — ${ui('name')}`,
    description: L(PRIVACY_DEK),
    body,
  });
}

function notFound() {

  const body = `
<main class="page g12" id="main">
  <div class="page-head col-8">
    <p class="eyebrow">404</p>
    <h1 class="page-title t-title">${ui('notFound')}</h1>
    <p class="page-intro t-lead">${ui('tryInstead')} <a href="${href('/')}">${ui('selectedWork')}</a>, <a href="${href('/photo/')}">${ui('photography')}</a>, <a href="${href('/video/')}">${ui('video')}</a>, <a href="${href('/design/')}">${ui('design')}</a>.</p>
  </div>
  <div class="col-full">${foot()}</div>
</main>`;
  return page({ here: '', path: '/404.html', title: `${ui('notFound')} — ${ui('name')}`, description: L(UI.notFound), body });
}

/* Legacy addresses keep working: a canonical to the new target plus a meta
   refresh, which is all GitHub Pages allows without a server. No noindex —
   paired with a canonical it contradicts itself. */
function redirect(to) {
  return `<!DOCTYPE html>
<html lang="${LANG === 'ua' ? 'uk' : 'en'}">
<head>
<meta charset="utf-8">
<title>${ui('moved')} — ${ui('name')}</title>
<link rel="canonical" href="${SITE}${to}">
<meta http-equiv="refresh" content="0; url=${to}">
</head>
<body><p>${ui('movedTo')} <a href="${to}">${to}</a>.</p></body>
</html>
`;
}

/* ---------------- emit ---------------- */

const written = [];

function build(lang) {
  LANG = lang;
  const prefix = lang === 'ua' ? 'ua/' : '';
  const out = (path, html) => { write(prefix + path, html); written.push(prefix + path); };

  out('index.html', homePage());
  out('photo/index.html', practicePage({ here: '/photo/', discipline: 'photography' }));
  out('video/index.html', practicePage({ here: '/video/', discipline: 'video', extra: catalogueBlock() }));
  out('design/index.html', practicePage({ here: '/design/', discipline: 'design' }));
  out('street/index.html', streetPage());
  out('info/index.html', infoPage());
  out('enquiries/index.html', enquiriesPage());
  out('rates/index.html', ratesPage());
  out('privacy/index.html', privacyPage());
  out('404.html', notFound());
  projects.forEach((p, i) => out(`work/${p.slug}/index.html`, projectPage(p, i)));

  const LEGACY = {
    'photo/reportage/index.html': '/work/reportage/',
    'photo/culture-art/index.html': '/work/culture-and-art/',
    'photo/backstage/index.html': '/work/backstage/',
    'photo/portraits/index.html': '/work/portraits/',
    'photo/vechirky/index.html': '/work/reportage/',
    'photo/fotosesii/index.html': '/work/portraits/',
    'photo/baksteydzh/index.html': '/work/backstage/',
    'photo/mystetski-podii/index.html': '/work/culture-and-art/',
    'photo/koncerty-ta-vystavy/index.html': '/work/culture-and-art/',
    'photo/publichni-zahody/index.html': '/work/reportage/',
    'photo/art-events/index.html': '/work/culture-and-art/',
    'photo/concerts-theatre/index.html': '/work/culture-and-art/',
    'photo/parties/index.html': '/work/reportage/',
    'photo/photo-sessions/index.html': '/work/portraits/',
    'photo/public-events/index.html': '/work/reportage/',
    'work/dyvochyv/index.html': '/work/reels/',
    'video/reels/index.html': '/video/',
    'video/short-form/index.html': '/video/',
    'video/interviewandvlogs/index.html': '/video/',
    'video/interviews/index.html': '/video/',
    'video/vlogs/index.html': '/video/',
    'video/music/index.html': '/video/',
    'video/documentary/index.html': '/video/',
    'design/covers/index.html': '/design/',
    'contacts/index.html': '/enquiries/',
    'terms/index.html': '/rates/',
  };
  for (const [from, to] of Object.entries(LEGACY)) out(from, redirect(other(lang, to)));
}

LANGS.forEach(build);

/* A sitemap with both locales. On the staging host robots.txt closes the
   whole site and every page carries noindex; on the live host it opens and
   points at the sitemap. Both come out of the same switch, so the two can
   never disagree. */
const PUBLIC = ['/', '/photo/', '/video/', '/design/', '/info/', '/enquiries/', '/rates/', '/privacy/',
  ...projects.map((p) => `/work/${p.slug}/`)];
const today = new Date().toISOString().slice(0, 10);
const urls = PUBLIC.map((path) => LANGS.map((lang) => `  <url>
    <loc>${SITE}${other(lang, path)}</loc>
${LANGS.map((alt) => `    <xhtml:link rel="alternate" hreflang="${alt === 'ua' ? 'uk' : 'en'}" href="${SITE}${other(alt, path)}"/>`).join('\n')}
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${path}"/>
    <lastmod>${today}</lastmod>
  </url>`).join('\n')).join('\n');
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`);
written.push('sitemap.xml');

write('robots.txt', LIVE
  ? `User-agent: *
Allow: /

Sitemap: ${SITE}/sitemap.xml
`
  : `User-agent: *
Disallow: /
`);
written.push('robots.txt');

write('CNAME', `${HOST}\n`);
written.push('CNAME');

console.log(`wrote ${written.length} files (${written.filter((f) => f.startsWith('ua/')).length} Ukrainian)`);
