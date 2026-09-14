import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(import.meta.dirname, '..');

function minifyCss(source) {
  let output = '';
  let quote = '';
  let pendingSpace = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (quote) {
      output += char;
      if (char === '\\') {
        output += next || '';
        index += 1;
      } else if (char === quote) {
        quote = '';
      }
      continue;
    }

    if (char === '"' || char === "'") {
      if (pendingSpace && output && !'{(:;,>~'.includes(output.at(-1))) output += ' ';
      pendingSpace = false;
      quote = char;
      output += char;
      continue;
    }

    if (char === '/' && next === '*') {
      const end = source.indexOf('*/', index + 2);
      if (end === -1) throw new Error('Unclosed CSS comment');
      pendingSpace = true;
      index = end + 1;
      continue;
    }

    if (/\s/.test(char)) {
      pendingSpace = true;
      continue;
    }

    if ('{}:;,>~'.includes(char)) {
      output = output.trimEnd();
      if (char === '}' && output.endsWith(';')) output = output.slice(0, -1);
      output += char;
      pendingSpace = false;
      continue;
    }

    if (char === ')') {
      output = output.trimEnd();
      output += char;
      pendingSpace = false;
      continue;
    }

    if (pendingSpace && output && !'{(:;,>~'.includes(output.at(-1))) output += ' ';
    pendingSpace = false;
    output += char;
  }

  if (quote) throw new Error('Unclosed CSS string');
  return `${output.trim()}\n`;
}

export async function buildHomeStyleBundle(root = projectRoot) {
  const files = ['styles/base.css', 'styles/home.css'];
  const source = (await Promise.all(files.map((file) => readFile(path.join(root, file), 'utf8')))).join('\n');
  const output = minifyCss(source);
  await writeFile(path.join(root, 'styles/home.bundle.min.css'), output);
  return Buffer.byteLength(output);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const size = await buildHomeStyleBundle();
  console.log(`Built styles/home.bundle.min.css (${size} bytes).`);
}
