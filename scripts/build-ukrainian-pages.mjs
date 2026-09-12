import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const googleTag = `<script async src="https://www.googletagmanager.com/gtag/js?id=G-ZGH5PBS8H6"></script>\n<script>\n  window.dataLayer = window.dataLayer || [];\n  function gtag(){dataLayer.push(arguments);}\n  gtag('js', new Date());\n  gtag('config', 'G-ZGH5PBS8H6');\n</script>`;
const pages = [
  ['/', 'index.html', 'Кирило Русанівський — відеомонтажер, фотограф і графічний дизайнер', 'Кирило Русанівський — відеомонтажер, фотограф і графічний дизайнер із Києва. Монтаж відео, репортажна фотографія, дизайн книжок і обкладинок, верстка.'],
  ['/rates/', 'rates/index.html', 'Умови співпраці — Кирило Русанівський', 'Умови роботи та контакти Кирила Русанівського — відеомонтажера, фотографа і графічного дизайнера з Києва.'],
  ['/contacts/', 'contacts/index.html', 'Контакти — Кирило Русанівський', 'Контакти Кирила Русанівського — відеомонтажера, фотографа і графічного дизайнера з Києва.'],
  ['/video/', 'video/index.html', 'Відеомонтаж — Кирило Русанівський', 'Портфоліо відеомонтажера з Києва Кирила Русанівського: інтерв’ю, YouTube-серії, музичні кліпи, документальні фільми, влоги та відео для соцмереж.'],
  ['/video/reels/', 'video/reels/index.html', 'Reels — Кирило Русанівський', 'Монтаж Reels у Києві: вертикальні відео для Instagram, TikTok і YouTube Shorts.'],
  ['/video/interviewandvlogs/', 'video/interviewandvlogs/index.html', 'Інтерв’ю і влоги — Кирило Русанівський', 'Зйомка й монтаж інтерв’ю та влогів у Києві: розмовні відео, YouTube-контент і соціальні мережі.'],
  ['/video/music/', 'video/music/index.html', 'Музичні кліпи — Кирило Русанівський', 'Портфоліо зі зйомки та монтажу музичних кліпів Кирила Русанівського: творчі відео для музикантів, артистів, релізів і живих виступів.'],
  ['/video/documentary/', 'video/documentary/index.html', 'Документалістика — Кирило Русанівський', 'Документальні фільми та відеомонтаж у Києві: історії людей, культурні проєкти, інтерв’ю та спостережне відео.'],
  ['/video/short-form/', 'video/short-form/index.html', 'Короткі відео — Кирило Русанівський', 'Монтаж коротких відео для соціальних мереж: вертикальні ролики для Instagram Reels, TikTok і YouTube Shorts.'],
  ['/photo/', 'photo/index.html', 'Фотографія — Кирило Русанівський', 'Портфоліо фотографа Кирила Русанівського в Києві: репортаж, культура та мистецтво, бекстейдж і портрети.'],
  ['/photo/reportage/', 'photo/reportage/index.html', 'Репортаж — Кирило Русанівський', 'Репортажний фотограф у Києві. Кирило Русанівський знімає публічні заходи, культурні програми, святкування, нічне життя й аудиторії.'],
  ['/photo/culture-art/', 'photo/culture-art/index.html', 'Культура та мистецтво — Кирило Русанівський', 'Фотографія культури та мистецтва в Києві: галереї, інсталяції, відкриття, перформанси, концерти, театр, митці й культурні проєкти.'],
  ['/photo/backstage/', 'photo/backstage/index.html', 'Бекстейдж — Кирило Русанівський', 'Бекстейдж-фотограф у Києві. Фотографія процесів зйомок, знімальних груп, постановок, сцен і живих подій.'],
  ['/photo/portraits/', 'photo/portraits/index.html', 'Портрети — Кирило Русанівський', 'Портретний фотограф у Києві. Портрети для людей, митців і творчих професіоналів — у студії або на локації.'],
  ['/design/', 'design/index.html', 'Друк і дизайн — Кирило Русанівський', 'Портфоліо графічного дизайнера з Києва: дизайн обкладинок, верстка книжок і видань, типографіка, бібліографічні покажчики та поліграфія.'],
  ['/design/covers/', 'design/covers/index.html', 'Дизайн обкладинок — Кирило Русанівський', 'Дизайнер книжкових обкладинок у Києві. Обкладинки, редакційна типографіка, верстка книжок і поліграфія для видавців, авторів і культурних проєктів.'],
];

const lightPortfolioRoutes = new Set([
  '/design/covers/',
  '/photo/reportage/',
  '/photo/culture-art/',
  '/photo/backstage/',
  '/photo/portraits/',
]);
const nightPortfolioRoutes = new Set([
  '/video/reels/',
  '/video/interviewandvlogs/',
  '/video/music/',
  '/video/documentary/',
  '/video/short-form/',
]);

// Підсторінки-галереї — єдині, де тему обирає гість. Зелені сторінки
// лишаються зеленими: перший перемикач тем зламався саме на тому, що
// вибір гостя їхав за ним по всьому сайту
const switchableRoutes = new Set([...lightPortfolioRoutes, ...nightPortfolioRoutes]);

const absolute = (route) => `https://rusanivsky.com${route}`;
const uaRoute = (route) => route === '/' ? '/ua/' : `/ua${route}`;

function alternates(route) {
  return [
    `<link rel="alternate" hreflang="en" href="${absolute(route)}">`,
    `<link rel="alternate" hreflang="uk" href="${absolute(uaRoute(route))}">`,
    `<link rel="alternate" hreflang="x-default" href="${absolute(route)}">`,
  ].join('\n');
}

// Структурні дані досі їхали в /ua/ англійською копією — разом із
// полем url, яке вказувало на англійську адресу. Для Google це сторінка,
// що називає себе чужим URL. Перебираємо об’єкт як JSON, а не регексом:
// поля лежать на двох рівнях, і будь-яка зміна розмітки вище зламала б
// пошук за текстом. Порядок професій і вмінь дзеркалить англійський.
const ukrainianProfile = {
  jobTitle: ['Відеомонтажер', 'Фотограф', 'Графічний дизайнер'],
  knowsAbout: [
    'Відеомонтаж', 'Зйомка інтервʼю', 'Виробництво музичних кліпів',
    'Документальне кіно', 'Монтаж влогів',
    'Івент-фотографія', 'Концертна фотографія', 'Театральна фотографія',
    'Бекстейдж-фотографія', 'Портретна фотографія',
    'Графічний дизайн', 'Дизайн книжок', 'Дизайн обкладинок', 'Редакційний дизайн',
    'Верстка', 'Поліграфія',
  ],
};

function localiseStructuredData(html, route, description) {
  return html.replace(
    /(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/,
    (whole, open, body, close) => {
      let data;
      try { data = JSON.parse(body); } catch { return whole; }
      const canonical = absolute(uaRoute(route));
      if (data.url) data.url = canonical;
      const person = data.mainEntity;
      if (person) {
        if (person.url) person.url = canonical;
        person.description = description;
        if (person.jobTitle) person.jobTitle = ukrainianProfile.jobTitle;
        if (person.knowsAbout) person.knowsAbout = ukrainianProfile.knowsAbout;
      }
      return open + '\n' + JSON.stringify(data, null, 2) + '\n' + close;
    },
  );
}

function updateHead(html, route, title, description, ukrainian) {
  const canonical = absolute(ukrainian ? uaRoute(route) : route);
  html = html.replace(/\n<link rel="alternate" hreflang="(?:en|uk|x-default)" href="[^"]+">/g, '');
  html = html.replace(/<html lang="en"/, `<html lang="${ukrainian ? 'uk' : 'en'}"`);
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
  html = html.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${description}">`);
  html = html.replace(/<link rel="canonical" href="[^"]+">/, `<link rel="canonical" href="${canonical}">\n${alternates(route)}`);
  html = html.replace(/<meta property="og:locale" content="[^"]*">/, `<meta property="og:locale" content="${ukrainian ? 'uk_UA' : 'en_US'}">`);
  html = html.replace(/<meta property="og:locale:alternate" content="[^"]*">/, `<meta property="og:locale:alternate" content="${ukrainian ? 'en_US' : 'uk_UA'}">`);
  html = html.replace(/<meta property="og:url" content="[^"]+">/, `<meta property="og:url" content="${canonical}">`);
  html = html.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${title}">`);
  html = html.replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${description}">`);
  html = html.replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${title}">`);
  html = html.replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${description}">`);
  return html;
}

function addGoogleTag(html) {
  if (html.includes('googletagmanager.com/gtag/js?id=G-ZGH5PBS8H6')) return html;
  return html.replace('</head>', `${googleTag}\n</head>`);
}

function ukrainianiseContent(html) {
  // The source already stores approved Ukrainian copy in data-ua. Make it the
  // literal server-delivered text rather than relying on JavaScript to swap it.
  html = html.replace(/(<([a-z][\w-]*)(?:\s[^>]*)?\sdata-en="[^"]*"\sdata-ua="([^"]*)"(?:\s[^>]*)?>)([^<]*)(<\/\2>)/gi, '$1$3$5');
  html = html.replace(/try\{\s*setLang\(detect\w*\(\),\s*false\);\s*\}catch\(e\)\{\s*setLang\('en',\s*false\);\s*\}/, "try{ setLang('ua', false); }catch(e){}");
  // без крапки з комою: у джерелі виклик стоїть як L(D(),false)})();, тож
  // точний рядок із ; не збігався ніколи. Сторінка умов — єдина, що
  // використовує цю коротку форму скрипта (решта ловиться регексом на
  // setLang вище), і саме вона віддавалась з українським текстом, а потім
  // сама перемикала себе на англійську за мовою браузера
  html = html.replace("L(D(),false)", "L('ua',false)");
  html = html.replace(/(<button type="button" data-lang="en" aria-pressed=")true("[^>]*>EN<\/button><button type="button" data-lang="ua" aria-pressed=")false/, '$1false$2true');
  return html;
}

function localiseLinks(html) {
  for (const [route] of pages) {
    const from = `href="${route}"`;
    const to = `href="${uaRoute(route)}"`;
    html = html.split(from).join(to);
  }
  return html;
}

function addContactsLink(html, route) {
  const current = route === '/rates/' ? ' aria-current="page"' : '';
  const en = 'Rates & Terms', ua = 'Умови співпраці';
  const termsLink = `<a class="tiny contact-link" href="/rates/"${current} data-en="${en}" data-ua="${ua}">${en}</a>`;
  const contactsCurrent = route === '/contacts/' ? ' aria-current="page"' : '';
  const contactsLink = `<a class="tiny contact-link mobile-contact-link" href="/contacts/"${contactsCurrent} data-en="Contacts" data-ua="Контакти">Contacts</a>`;
  const langToggle = '<div class="tgl" id="lang" role="group" aria-label="Language"><button type="button" data-lang="ua" aria-pressed="false" aria-label="Switch to Ukrainian">UA</button></div>';
  // Усі три іконки лежать у розмітці, потрібну показує CSS за
  // data-theme-mode — його theme.js ставить ще в <head>. Так кнопка не
  // чекає на DOMContentLoaded і шапка не стрибає на кожному завантаженні.
  // У бургері цей рядок стає четвертим після мови
  const themeIcons =
    '<span class="ti" data-mode="auto"><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">'
      + '<circle cx="8" cy="8" r="5.7" fill="none" stroke="currentColor" stroke-width="1.4"/>'
      + '<path d="M8 2.3a5.7 5.7 0 0 1 0 11.4z" fill="currentColor"/></svg></span>'
    + '<span class="ti" data-mode="light"><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">'
      + '<circle cx="8" cy="8" r="3.1"/>'
      + '<path d="M8 1v1.7M8 13.3V15M15 8h-1.7M2.7 8H1M12.95 3.05l-1.2 1.2M4.25 11.75l-1.2 1.2M12.95 12.95l-1.2-1.2M4.25 4.25l-1.2-1.2"/></svg></span>'
    + '<span class="ti" data-mode="night"><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">'
      + '<path d="M13.5 9.9A6 6 0 0 1 6.1 2.5 6 6 0 1 0 13.5 9.9z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg></span>';
  const themeToggle = switchableRoutes.has(route)
    ? `\n    <div class="tgl" id="theme" role="group" aria-label="Theme"><button type="button" aria-label="Theme: auto">${themeIcons}</button></div>`
    : '';
  // On the home page the link sits next to the language switcher. Keep the
  // same desktop header on every page, including pages whose older source had
  // the link as the fourth item in .parts.
  html = html.replace(/<a class="[^"]*tiny contact-link[^"]*" href="\/(?:contacts|terms|rates)\/"(?: aria-current="page")? data-en="[^"]*" data-ua="[^"]*">[^<]*<\/a>/g, '');
  html = html.replace(/\s*<div class="tgl" id="(?:lang|theme)"[^>]*>[\s\S]*?<\/div>/g, '');
  html = html.replace(/\n[ \t]*\n[ \t]*<\/nav>/g, '\n  </nav>');
  html = html.replace(
    /<div class="switches">/,
    `<div class="switches">\n    ${termsLink}\n    ${contactsLink}\n    ${langToggle}${themeToggle}`,
  );
  html = html.replace(/(<div class="switches">)\n[ \t]*\n/g, '$1\n');
  if (!html.includes('<script src="/scripts/language-switcher.js"></script>')) {
    html = html.replace('</head>', '<script src="/scripts/language-switcher.js"></script>\n</head>');
  }
  return html;
}

const footerMeta = '<div class="foot-meta" aria-label="Location and local time">'
  + '<span class="tiny"><span class="city-name" data-en="Kyiv" data-ua="Київ">Kyiv</span>'
  + '<span class="city-country" data-en=", Ukraine" data-ua=", Україна">, Ukraine</span></span>'
  + '<span class="tiny local-time"><span data-en="Local time" data-ua="Місцевий час">Local time</span> '
  + '<span class="kyiv-clock">—:—</span> <span class="kyiv-tz">EET</span></span>'
  + '</div>';

function addFooterMeta(html, route) {
  // The home page already moves its header metadata into this footer slot.
  if (route === '/' || html.includes('class="foot-meta"')) return html;
  const footer = /(<div class="wrap foot-bar">\s*<div class="cols">[\s\S]*?<\/div>)(\s*<\/div>)/;
  if (!footer.test(html)) throw new Error(`No footer bar found for ${route}`);
  return html.replace(footer, `$1\n    ${footerMeta}$2`);
}

function addKyivClockScript(html, route) {
  if (route === '/' || html.includes('/scripts/kyiv-clock.js')) return html;
  return html.replace('</body>', '<script src="/scripts/kyiv-clock.js?v=1"></script>\n</body>');
}

const sectionHeaderStyleVersion = 19;

const sectionStyleVersions = {
  '/photo/photo.css': 112,
  '/video/video.css': 113,
  '/design/design.css': 104,
};

function updateSectionStyleVersions(html) {
  for (const [stylesheet, version] of Object.entries(sectionStyleVersions)) {
    html = html.replace(new RegExp(`${stylesheet.replaceAll('/', '\\/')}\\?v=\\d+`, 'g'), `${stylesheet}?v=${version}`);
  }
  return html;
}

function addSectionHeaderStyle(html, route) {
  if (route === '/') return html;
  html = html.replace(/\s*<link rel="stylesheet" href="\/styles\/section-header\.css(?:\?[^\"]*)?">/g, '');
  const sectionStyle = /<link rel="stylesheet" href="\/(?:photo\/photo|video\/video|design\/design)\.css\?v=\d+">/;
  if (!sectionStyle.test(html)) throw new Error(`No section stylesheet found for ${route}`);
  return html.replace(sectionStyle, `$&\n<link rel="stylesheet" href="/styles/section-header.css?v=${sectionHeaderStyleVersion}">`);
}

const themeScriptVersion = 5;

// Скрипт іде перед стилями розділу без defer: data-theme має стати на
// місце до першого малювання, інакше видно спалах чужої теми
function addThemeScript(html, route) {
  html = html.replace(/\s*<script src="\/scripts\/theme\.js(?:\?[^"]*)?"><\/script>/g, '');
  if (!switchableRoutes.has(route)) return html;
  const sectionStyle = /<link rel="stylesheet" href="\/(?:photo\/photo|video\/video|design\/design)\.css\?v=\d+">/;
  if (!sectionStyle.test(html)) throw new Error(`No section stylesheet found for ${route}`);
  return html.replace(sectionStyle, `<script src="/scripts/theme.js?v=${themeScriptVersion}"></script>\n$&`);
}

function renameWorkTerms(html) {
  return html.replace(/(<h[1-6][^>]*id="s-contact"[^>]*?)data-en="Contacts" data-ua="Контакти"/g, '$1data-en="Work terms" data-ua="Умови роботи"')
    .replace(/(<h[1-6][^>]*id="s-contact"[^>]*>)Contacts(<\/h[1-6]>)/g, '$1Work terms$2')
    .replace(/(Telegram|Behance|Threads|TikTok) @rusanivsky/g, '$1');
}

function normalizeBackLinks(html) {
  return html.replace(
    /<a class="back" href="([^"]+)"[^>]*>[\s\S]*?<\/a>/g,
    (_, href) => `<a class="back" href="${href}"><span class="back-arrow">←</span> <span class="back-label" data-en="Home" data-ua="На головну">Home</span></a>`,
  );
}

// Не --bg, а колір, який плита тла показує при самому верху вікна:
// саме до нього примикає обвід браузера на телефоні
const themeColour = { light: '#e8ebe6', green: '#42563f', night: '#1b1b1b' };

// Тему сторінки вирішує її розділ, а не гість: перемикача в шапці немає,
// нічого не читається з localStorage і нічого не залежить від системної
// схеми. Атрибут стоїть у <html>, тобто ще до першого байта стилів.
function applyThemePolicy(html, route) {
  const theme = lightPortfolioRoutes.has(route) ? 'light' : nightPortfolioRoutes.has(route) ? 'night' : 'green';
  // data-theme у розмітці лишається запасним варіантом для гостя без JS:
  // сторінка тоді виглядає так, як виглядала до появи перемикача
  html = html.replace(/<html lang="en"(?: data-theme="(?:light|green|night)")?>/, `<html lang="en" data-theme="${theme}">`);
  // Два теги з медіа-умовами обслуговують авто-режим без жодного скрипта;
  // явний вибір theme.js потім перепише обидва на один колір
  const meta = switchableRoutes.has(route)
    ? `<meta name="theme-color" media="(prefers-color-scheme: light)" content="${themeColour.light}">\n`
      + `<meta name="theme-color" media="(prefers-color-scheme: dark)" content="${themeColour.night}">`
    : `<meta name="theme-color" content="${themeColour[theme]}">`;
  let first = true;
  html = html.replace(/<meta name="theme-color"[^>]*>/g, () => {
    if (!first) return '';
    first = false;
    return meta;
  });
  html = html.replace(/\n\n+(?=<link rel="icon")/g, '\n');
  return html;
}

await rm(path.join(root, 'ua'), { recursive: true, force: true });
for (const [route, source, title, description] of pages) {
  let english = await readFile(path.join(root, source), 'utf8');
  const englishTitle = english.match(/<title>([^<]*)<\/title>/)?.[1] ?? title;
  const englishDescription = english.match(/<meta name="description" content="([^"]*)">/)?.[1] ?? description;
  english = updateHead(english, route, englishTitle, englishDescription, false);
  english = addGoogleTag(english);
  english = renameWorkTerms(english);
  english = normalizeBackLinks(english);
  english = addContactsLink(english, route);
  english = addFooterMeta(english, route);
  english = addKyivClockScript(english, route);
  english = updateSectionStyleVersions(english);
  english = addSectionHeaderStyle(english, route);
  english = addThemeScript(english, route);
  english = applyThemePolicy(english, route);
  await writeFile(path.join(root, source), english);

  let ukrainian = ukrainianiseContent(english);
  ukrainian = localiseLinks(ukrainian);
  ukrainian = updateHead(ukrainian, route, title, description, true);
  ukrainian = localiseStructuredData(ukrainian, route, description);
  const output = path.join(root, uaRoute(route), 'index.html');
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, ukrainian);
}

// Сторінки, що переїхали. Заглушка лишається на старій адресі в обох мовах:
// GitHub Pages не вміє 301.
const moved = [
  ['/terms/', '/rates/'],
  ['/video/interviews/', '/video/interviewandvlogs/'],
  ['/video/vlogs/', '/video/interviewandvlogs/'],
  ['/photo/public-events/', '/photo/reportage/'],
  ['/photo/art-events/', '/photo/culture-art/'],
  ['/photo/concerts-theatre/', '/photo/culture-art/'],
  ['/photo/parties/', '/photo/reportage/'],
  ['/photo/photo-sessions/', '/photo/portraits/'],
];
for (const [from, to] of moved) {
  for (const [oldRoute, newRoute, lang, title, sentence] of [
    [from, to, 'en', 'Moved — Kyrylo Rusanivsky', `This page moved to <a href="${to}">${to}</a>.`],
    [uaRoute(from), uaRoute(to), 'uk', 'Сторінку перенесено — Кирило Русанівський',
      `Сторінку перенесено на <a href="${uaRoute(to)}">${uaRoute(to)}</a>.`],
  ]) {
    const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<title>${title}</title>
<link rel="canonical" href="${absolute(newRoute)}">
<meta http-equiv="refresh" content="0; url=${newRoute}">
</head>
<body>
<p>${sentence}</p>
</body>
</html>
`;
    const out = path.join(root, oldRoute, 'index.html');
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, html);
  }
}

const sitemapUrls = pages.flatMap(([route]) => [route, uaRoute(route)]);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls.map((route) => `  <url><loc>${absolute(route)}</loc><lastmod>2026-09-09</lastmod><changefreq>monthly</changefreq><priority>${route === '/' || route === '/ua/' ? '1.0' : '0.7'}</priority></url>`).join('\n')}\n</urlset>\n`;
await writeFile(path.join(root, 'sitemap.xml'), sitemap);
