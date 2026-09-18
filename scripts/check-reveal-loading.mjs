import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const files = execFileSync('rg', ['--files', '-g', '*.html'], { encoding: 'utf8' })
  .trim()
  .split('\n');

const boot = "<script data-reveal-boot>document.documentElement.classList.add('rev')</script>";
const revealPattern = /<script src="\/scripts\/reveal\.js\?v=12" defer onerror="document\.documentElement\.classList\.remove\('rev'\)"><\/script>/g;
const anyRevealPattern = /<script src="\/scripts\/reveal\.js(?:\?v=\d+)?"[^>]*><\/script>/g;
const failures = [];
let checked = 0;

for (const file of files) {
  const html = readFileSync(file, 'utf8');
  if (!html.includes('/scripts/reveal.js')) continue;
  checked += 1;

  const bootMatches = html.split(boot).length - 1;
  const revealMatches = [...html.matchAll(revealPattern)].length;
  const allRevealMatches = [...html.matchAll(anyRevealPattern)].length;
  const bootIndex = html.indexOf(boot);
  const firstStylesheetIndex = html.indexOf('<link rel="stylesheet"');

  if (bootMatches !== 1) failures.push(`${file}: expected one reveal boot, found ${bootMatches}`);
  if (allRevealMatches !== 1) failures.push(`${file}: expected one reveal.js include, found ${allRevealMatches}`);
  if (revealMatches !== 1) failures.push(`${file}: reveal.js must be deferred and have the error fallback`);
  if (bootIndex === -1 || firstStylesheetIndex === -1 || bootIndex > firstStylesheetIndex) {
    failures.push(`${file}: reveal boot must run before the first stylesheet`);
  }
}

if (checked !== 26) failures.push(`expected 26 EN/UA reveal pages, found ${checked}`);

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`Reveal loading contract passed for ${checked} pages.`);
