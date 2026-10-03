// Generate client.js (the repo root is the installable bundle) from the forked
// factories listed in `halves`.
//
// Each fork is an independent window.__ModuleLoader__.load({...}) module with its
// own `module`/`exports`/`css`/`tagId`/`apply`/`inject` declarations. Concatenating
// several of them would collide on those names, so each factory body is wrapped in
// its own closure and their `apply`s are composed in the outer module.
//
// Usage: node tools/build-combined.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MODULE_ID = '@local/digit-keys';
const FACTORY_OPEN = 'factory: (require) => {';
const FACTORY_TAIL = '\n\t}\n});';

/** Everything between the factory header and the factory's closing brace. */
function factoryBody(rel) {
  const text = readFileSync(resolve(root, rel), 'utf8').replace(/\r\n/g, '\n');
  const start = text.indexOf(FACTORY_OPEN);
  if (start === -1) throw new Error(`factory header not found in ${rel}`);
  const end = text.lastIndexOf(FACTORY_TAIL);
  if (end === -1 || end < start) throw new Error(`factory tail not found in ${rel}`);
  return text.slice(start + FACTORY_OPEN.length, end);
}

// The approval fork was reverted: the permission panel stays native.
const halves = [
  ['questionsHalf', 'src/questions/client.js'],
];

const out = [
  '// GENERATED FILE — do not edit by hand.',
  `// Source: ${halves.map(([, rel]) => rel).join(' + ')}`,
  '// Regenerate: node tools/build-combined.mjs',
  'window.__ModuleLoader__.load({',
  `\tid: ${JSON.stringify(MODULE_ID)},`,
  '\tfactory: (require) => {',
];

for (const [name, rel] of halves) {
  out.push(`\t\t// ${rel} — wrapped so its module/exports/css/tagId stay private.`);
  out.push(`\t\tconst ${name} = (() => {`);
  out.push(factoryBody(rel));
  out.push('\t\t})();');
}

out.push(
  '\t\t// Union of every half: a missing service keeps the whole module inactive.',
  `\t\tconst inject = [...new Set([${halves.map(([name]) => `...${name}.inject`).join(', ')}])];`,
  '\t\treturn {',
  '\t\t\tinject,',
  '\t\t\tapply(ctx) {',
  ...halves.map(([name]) => `\t\t\t\t${name}.apply(ctx);`),
  '\t\t\t},',
  '\t\t};',
  '\t}',
  '});',
  '',
);

const target = resolve(root, 'client.js');
writeFileSync(target, out.join('\n'), 'utf8');
console.log(`wrote ${target} (${halves.length} half/halves)`);
