// Generates src/tokens.ts (typed values) and dist/tokens.css (custom properties) from tokens.json.
// Zero dependencies. Run: node build.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = JSON.parse(readFileSync(join(here, 'tokens.json'), 'utf8'));

/** Flatten DTCG groups into [path[], token, inheritedType]. */
function* walk(node, path = [], type) {
  const groupType = node.$type ?? type;
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('$') || value === null || typeof value !== 'object') continue;
    if ('$value' in value) yield [[...path, key], value, value.$type ?? groupType];
    else yield* walk(value, [...path, key], groupType);
  }
}

function toCss(token, type) {
  const v = token.$value;
  switch (type) {
    case 'duration':
    case 'dimension':
      return `${v.value}${v.unit}`;
    case 'cubicBezier':
      return `cubic-bezier(${v.join(', ')})`;
    case 'fontFamily':
      return v.map((f) => (/\s/.test(f) ? `"${f}"` : f)).join(', ');
    default:
      return String(v);
  }
}

function toJs(token, type) {
  const v = token.$value;
  if (type === 'duration') return v.unit === 's' ? v.value : v.value / 1000; // seconds for JS APIs
  if (type === 'dimension') return v.value;
  return v;
}

const lines = [];
const tree = {};
for (const [path, token, type] of walk(source)) {
  lines.push(`  --sb-${path.join('-')}: ${toCss(token, type)};`);
  let cursor = tree;
  for (const key of path.slice(0, -1)) cursor = cursor[key] ??= {};
  cursor[path[path.length - 1]] = toJs(token, type);
}

const css = `/* Generated from tokens.json — do not edit. */\n:root {\n${lines.join('\n')}\n}\n\n@media (prefers-reduced-motion: reduce) {\n  :root {\n    --sb-motion-duration-slow: 150ms;\n    --sb-motion-duration-deliberate: 150ms;\n    --sb-motion-duration-cinematic: 150ms;\n  }\n}\n`;

const ts = `// Generated from tokens.json by build.mjs — do not edit.
// Durations are in seconds (ready for @snowbros/motion); dimensions in px; easings as [x1, y1, x2, y2].
export const tokens = ${JSON.stringify(tree, null, 2)} as const;

export type Tokens = typeof tokens;
`;

mkdirSync(join(here, 'dist'), { recursive: true });
writeFileSync(join(here, 'dist', 'tokens.css'), css);
writeFileSync(join(here, 'src', 'tokens.ts'), ts);
console.log(`tokens: ${lines.length} custom properties written`);
