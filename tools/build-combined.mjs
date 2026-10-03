// Generate client.js (the repo root is the installable bundle) from the two
// forked factories in src/.
//
// Each fork is an independent window.__ModuleLoader__.load({...}) module with its
// own `module`/`exports`/`css`/`tagId`/`apply`/`inject` declarations. Concatenating
// them would collide on those names, so each factory body is wrapped in its own
// closure and the two `apply`s are composed in the outer module.
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
  const text = readFileSync(resolve(root, rel), 'utf8');
  const start = text.indexOf(FACTORY_OPEN);
  if (start === -1) throw new Error(`factory header not found in ${rel}`);
  const end = text.lastIndexOf(FACTORY_TAIL);
  if (end === -1 || end < start) throw new Error(`factory tail not found in ${rel}`);
  return text.slice(start + FACTORY_OPEN.length, end);
}

const halves = [
  ['approvalHalf', 'src/approval/client.js'],
  ['questionsHalf', 'src/questions/client.js'],
];

const out = [
  '// GENERATED FILE — do not edit by hand.',
  '// Source: src/approval/client.js + src/questions/client.js',
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
  '\t\t// Union of both halves: a missing service keeps the whole module inactive.',
  '\t\tconst inject = [...new Set([...approvalHalf.inject, ...questionsHalf.inject])];',
  '\t\treturn {',
  '\t\t\tinject,',
  '\t\t\tapply(ctx) {',
  '\t\t\t\tapprovalHalf.apply(ctx);',
  '\t\t\t\tquestionsHalf.apply(ctx);',
  '\t\t\t},',
  '\t\t};',
  '\t}',
  '});',
  '',
);

const target = resolve(root, 'client.js');
writeFileSync(target, out.join('\n'), 'utf8');
console.log(`wrote ${target}`);
