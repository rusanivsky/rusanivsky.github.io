#!/usr/bin/env node
/* Порівняння двох зліпків geometrії.

       node scripts/visual-diff.mjs .visual/before .visual/after

   Коробка (left, top, width, height) звіряється з допуском 0.5px — нижче
   нього різниця береться з округлення субпікселів і нічого не значить.
   Решта чотирнадцяти властивостей звіряється дослівно: 'none' і '0px' —
   це різні речі.

   Вихідний код 1, якщо є бодай одна розбіжність. Два прогони підряд на
   незміненому коді мусять давати 0; якщо не дають — щось на сторінці
   анімується або тікає, і гейт треба лагодити, а не обходити. */

import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const BOX_TOLERANCE = 0.5;
const BOX_NAMES = ['left', 'top', 'width', 'height'];
const SHOW = Number(process.env.VISUAL_SHOW || 40);

const [dirA, dirB] = process.argv.slice(2, 4).map((p) => p && path.resolve(p));

if (!dirA || !dirB) {
  console.error('Вжиток: node scripts/visual-diff.mjs <зліпок-А> <зліпок-Б>');
  process.exit(2);
}
for (const dir of [dirA, dirB]) {
  if (!existsSync(dir)) {
    console.error(`Немає теки зліпка: ${dir}`);
    process.exit(2);
  }
}

function listSnapshots(root) {
  const found = new Map();
  const walk = (dir, rel) => {
    for (const name of readdirSync(dir).sort()) {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) walk(full, rel ? `${rel}/${name}` : name);
      else if (name.endsWith('.json')) found.set(rel ? `${rel}/${name}` : name, full);
    }
  };
  walk(root, '');
  return found;
}

const a = listSnapshots(dirA);
const b = listSnapshots(dirB);

const lines = [];
let differences = 0;

for (const key of a.keys()) {
  if (!b.has(key)) { lines.push(`− зник зліпок ${key}`); differences++; }
}
for (const key of b.keys()) {
  if (!a.has(key)) { lines.push(`+ новий зліпок ${key}`); differences++; }
}

const index = (records) => {
  const map = new Map();
  for (const record of records) map.set(record.p, record);
  return map;
};

for (const [key, fileA] of [...a].sort()) {
  if (!b.has(key)) continue;
  const left = index(JSON.parse(readFileSync(fileA, 'utf8')));
  const right = index(JSON.parse(readFileSync(b.get(key), 'utf8')));
  const local = [];

  for (const [where, recA] of left) {
    const recB = right.get(where);
    if (!recB) { local.push(`  − нема елемента ${where}`); differences++; continue; }

    for (let i = 0; i < 4; i++) {
      const delta = recB.b[i] - recA.b[i];
      if (Math.abs(delta) > BOX_TOLERANCE) {
        local.push(`  ${where} · ${BOX_NAMES[i]}: ${recA.b[i]} → ${recB.b[i]} (${delta > 0 ? '+' : ''}${Math.round(delta * 100) / 100})`);
        differences++;
      }
    }
    for (const prop of Object.keys(recA)) {
      if (prop === 'p' || prop === 'b') continue;
      if (recA[prop] !== recB[prop]) {
        local.push(`  ${where} · ${prop}: ${recA[prop]} → ${recB[prop]}`);
        differences++;
      }
    }
  }
  for (const where of right.keys()) {
    if (!left.has(where)) { local.push(`  + новий елемент ${where}`); differences++; }
  }

  if (local.length) {
    lines.push(`\n${key} — ${local.length} розбіжностей`);
    lines.push(...local.slice(0, SHOW));
    if (local.length > SHOW) lines.push(`  …ще ${local.length - SHOW}`);
  }
}

console.log(`зліпків: ${a.size} проти ${b.size}`);
if (!differences) {
  console.log('0 розбіжностей.');
  process.exit(0);
}
console.log(lines.join('\n'));
console.log(`\nРАЗОМ: ${differences} розбіжностей.`);
process.exit(1);
