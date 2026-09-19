/*
  Lifts the Rates & Terms content out of the production page into structured
  JSON. Retyping legally-binding pricing text by hand is how a figure quietly
  changes; parsing it cannot invent a number.

  Run once against the production checkout; the JSON is then the source the
  staging build reads.
*/
import { readFileSync, writeFileSync } from 'node:fs';

const src = process.argv[2];
const html = readFileSync(`${src}/rates/index.html`, 'utf8');
const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));

const pair = (tag, cls, scope) => {
  const re = new RegExp(`<${tag}[^>]*class="[^"]*\\b${cls}\\b[^"]*"[^>]*data-en="([^"]*)" data-ua="([^"]*)"[^>]*>`, 'g');
  return [...scope.matchAll(re)].map((m) => ({ en: m[1], ua: m[2] }));
};

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const clean = (o) => ({ en: decode(o.en), ua: decode(o.ua) });

// Intro: the three lead paragraphs above the first section.
const headBlock = main.slice(0, main.indexOf('<section class="wrap tsec"'));
const intro = [...headBlock.matchAll(/data-en="([^"]*)" data-ua="([^"]*)"/g)]
  .map((m) => clean({ en: m[1], ua: m[2] }))
  .filter((p) => p.en.length > 40);

const sections = [];
const parts = main.split('<section class="wrap tsec"').slice(1);
for (const part of parts) {
  const h = part.match(/id="([^"]+)" data-en="([^"]*)" data-ua="([^"]*)"/);
  if (!h) continue;
  const body = part.slice(part.indexOf('<div class="tbody"'));
  const rows = [];

  // Walk the source in document order so the rendered page keeps the
  // sequence the author wrote, not the order of our selectors.
  const token = /<(p|h3|h4|li)([^>]*)>([\s\S]*?)<\/\1>/g;
  let m;
  let pendingPrice = null;
  while ((m = token.exec(body))) {
    const [, tag, attrs, inner] = m;
    const dp = attrs.match(/data-en="([^"]*)" data-ua="([^"]*)"/);
    const cls = (attrs.match(/class="([^"]*)"/) || [, ''])[1];
    // A step <li> carries its text in child elements, so it is matched
    // before the "must have a data-en of its own" check below.
    if (tag === 'li' && cls.includes('step')) {
      const t = inner.match(/<h3[^>]*data-en="([^"]*)" data-ua="([^"]*)"/);
      const d = inner.match(/<p[^>]*data-en="([^"]*)" data-ua="([^"]*)"/);
      if (t && d) rows.push({ kind: 'step', title: clean({ en: t[1], ua: t[2] }), text: clean({ en: d[1], ua: d[2] }) });
      continue;
    }
    if (!dp) continue;
    const val = clean({ en: dp[1], ua: dp[2] });
    if (cls.includes('grp')) rows.push({ kind: 'group', ...val });
    else if (cls.includes('svc')) pendingPrice = val;
    else if (cls.includes('fee')) { rows.push({ kind: 'price', label: pendingPrice, amount: val }); pendingPrice = null; }
    else if (tag === 'li') rows.push({ kind: 'bullet', ...val });
    else if (tag === 'p') rows.push({ kind: cls.includes('note') ? 'note' : 'text', ...val });
  }
  sections.push({ id: h[1], title: clean({ en: h[2], ua: h[3] }), rows });
}

// The FAQ lives on the home page, not on /rates/.
const home = readFileSync(`${src}/index.html`, 'utf8');
const faq = [...home.matchAll(/<summary data-en="([^"]*)" data-ua="([^"]*)">[^<]*<\/summary><p data-en="([^"]*)" data-ua="([^"]*)"/g)]
  .map((m) => ({ q: clean({ en: m[1], ua: m[2] }), a: clean({ en: m[3], ua: m[4] }) }));

writeFileSync('data/rates.json', JSON.stringify({ intro, sections, faq }, null, 1) + '\n');
console.log('intro paragraphs:', intro.length);
console.log('sections:', sections.map((s) => `${s.id}(${s.rows.length})`).join(' '));
console.log('faq:', faq.length);
