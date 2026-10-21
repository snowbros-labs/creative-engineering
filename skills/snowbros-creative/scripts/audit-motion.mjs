#!/usr/bin/env node
// SNOWBROS Creative Engineering — static motion / accessibility / performance smell scanner.
// Zero dependencies. Node >= 18. Heuristic: findings are leads to verify, not proof.
//
// Usage: node audit-motion.mjs [dir] [--json] [--strict]
//   --json    machine-readable output
//   --strict  exit 1 when any finding has severity "error"

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const strict = args.includes('--strict');
const root = resolve(args.find((a) => !a.startsWith('--')) ?? process.cwd());

const IGNORE = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.nuxt',
  '.svelte-kit',
  'coverage',
  '.turbo',
  'out',
  'vendor',
]);
const CODE = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.vue', '.svelte', '.astro']);
const STYLE = new Set(['.css', '.scss', '.sass', '.less']);
const MARKUP = new Set(['.html']);

const RULES = {
  'reduced-motion-missing': {
    severity: 'error',
    message: 'Project animates but has no prefers-reduced-motion handling anywhere.',
    fix: 'Add a `@media (prefers-reduced-motion: reduce)` block or a JS check (matchMedia / useReducedMotion / prefersReducedMotion()) and define a policy per pattern: skip, fade or minimal.',
  },
  'non-passive-listener': {
    severity: 'warn',
    message: 'scroll/touch/wheel listener without { passive: true }.',
    fix: 'Pass `{ passive: true }` unless you call preventDefault() — and if you do, question why.',
  },
  'state-in-frame-loop': {
    severity: 'warn',
    message: 'Framework state setter called inside requestAnimationFrame or a scroll handler.',
    fix: 'Write per-frame values straight to style/transform, a ref, or a CSS variable; keep framework state for discrete changes.',
  },
  'layout-read-in-scroll': {
    severity: 'warn',
    message:
      'Layout read (getBoundingClientRect/offset*/client*/scrollHeight) inside a scroll handler.',
    fix: 'Measure on resize (ResizeObserver) and cache; per scroll only read scroll position and do arithmetic.',
  },
  'transition-all': {
    severity: 'warn',
    message: '`transition: all` animates unintended properties (including layout).',
    fix: 'List properties explicitly, e.g. `transition: opacity 150ms, transform 150ms`.',
  },
  'layout-property-animation': {
    severity: 'warn',
    message:
      'Keyframes animate a layout property (width/height/top/left/right/bottom/margin/padding).',
    fix: 'Animate transform/opacity (or clip-path) instead; use FLIP for layout changes.',
  },
  'outline-removed': {
    severity: 'error',
    message: '`outline: none/0` without any :focus-visible style in the same file.',
    fix: 'Provide a visible :focus-visible indicator (≥3:1 contrast) before removing the default outline.',
  },
  'sticky-overflow-conflict': {
    severity: 'info',
    message:
      'File uses position: sticky and overflow: hidden — an overflow:hidden ancestor breaks sticky.',
    fix: 'Use `overflow: clip` on ancestors of sticky elements, or verify the hidden overflow is not an ancestor.',
  },
  'renderer-not-disposed': {
    severity: 'warn',
    message: 'Three.js renderer created without any .dispose() call in the same file.',
    fix: 'Dispose renderer, geometries, materials and textures on unmount/route change (see @snowbros/scene disposeObject).',
  },
  'listener-not-removed': {
    severity: 'info',
    message:
      'window/document listener added without removeEventListener or an AbortSignal in the same file.',
    fix: 'Remove it in cleanup, or pass `{ signal }` from an AbortController/scope.',
  },
};

function walk(dir, out = []) {
  let names = [];
  try {
    names = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of names) {
    if (IGNORE.has(name)) continue;
    const p = join(dir, name);
    let s;
    try {
      s = statSync(p);
    } catch {
      continue;
    }
    if (s.isDirectory()) walk(p, out);
    else {
      const ext = extname(name);
      if ((CODE.has(ext) || STYLE.has(ext) || MARKUP.has(ext)) && s.size < 1_000_000) out.push(p);
    }
  }
  return out;
}

const findings = [];
const add = (rule, file, line) =>
  findings.push({
    rule,
    severity: RULES[rule].severity,
    file: relative(root, file).replace(/\\/g, '/'),
    line,
    message: RULES[rule].message,
    fix: RULES[rule].fix,
  });

let animates = false;
let reducedHandled = false;
const ANIMATES =
  /@keyframes|\btransition\s*:|\banimation\s*:|requestAnimationFrame|\.animate\(|\bgsap\b|from ['"](motion|framer-motion|@snowbros\/motion|animejs|lenis)/;
const REDUCED =
  /prefers-reduced-motion|useReducedMotion|prefersReducedMotion|motionPreference|reducedMotion|MotionConfig/;
const SCROLL_HANDLER =
  /addEventListener\(\s*['"]scroll['"]|onScroll\s*[=:]|\.on\(\s*['"]scroll['"]|useScroll\(|window\.onscroll/;
const WINDOW_SIZE = 12;

for (const file of walk(root)) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  const ext = extname(file);
  const lines = text.split(/\r?\n/);
  if (ANIMATES.test(text)) animates = true;
  if (REDUCED.test(text)) reducedHandled = true;

  const isCode = CODE.has(ext) || MARKUP.has(ext);
  const hasStyle =
    STYLE.has(ext) ||
    /<style|css`|styled\./.test(text) ||
    ext === '.vue' ||
    ext === '.svelte' ||
    ext === '.astro' ||
    MARKUP.has(ext);

  // Style rules -------------------------------------------------------------------------------
  if (hasStyle) {
    let inKeyframes = false;
    let depth = 0;
    const hasFocusVisible = /:focus-visible/.test(text);
    lines.forEach((line, i) => {
      const n = i + 1;
      if (/transition\s*:\s*all\b/.test(line) || /transition-property\s*:\s*all\b/.test(line))
        add('transition-all', file, n);
      if (/outline\s*:\s*(none|0)\b/.test(line) && !hasFocusVisible)
        add('outline-removed', file, n);
      if (/@keyframes\s/.test(line)) {
        inKeyframes = true;
        depth = 0;
      }
      if (inKeyframes) {
        if (
          /(^|[\s{;])(width|height|top|left|right|bottom|margin(-\w+)?|padding(-\w+)?)\s*:/.test(
            line,
          )
        )
          add('layout-property-animation', file, n);
        depth += (line.match(/{/g) ?? []).length - (line.match(/}/g) ?? []).length;
        if (depth <= 0 && /}/.test(line)) inKeyframes = false;
      }
    });
    const sticky = lines.findIndex((l) => /position\s*:\s*sticky/.test(l));
    if (sticky >= 0 && /overflow(-[xy])?\s*:\s*hidden/.test(text))
      add('sticky-overflow-conflict', file, sticky + 1);
  }

  // Code rules --------------------------------------------------------------------------------
  if (isCode) {
    lines.forEach((line, i) => {
      const n = i + 1;
      const m = /addEventListener\(\s*['"](scroll|touchstart|touchmove|wheel|mousewheel)['"]/.exec(
        line,
      );
      if (m) {
        const stmt = lines.slice(i, i + 4).join(' ');
        if (!/passive/.test(stmt)) add('non-passive-listener', file, n);
      }
      const frameStart = /requestAnimationFrame\(/.test(line) || SCROLL_HANDLER.test(line);
      if (frameStart) {
        const windowText = lines.slice(i, i + WINDOW_SIZE);
        const setterIdx = windowText.findIndex(
          (l) =>
            /\bset[A-Z]\w*\(|\bsetState\(/.test(l) &&
            !/setTimeout|setInterval|setAttribute|setProperty|setPointerCapture/.test(l),
        );
        if (setterIdx >= 0) add('state-in-frame-loop', file, i + setterIdx + 1);
        if (SCROLL_HANDLER.test(line)) {
          const readIdx = windowText.findIndex((l) =>
            /getBoundingClientRect\(|\.offset(Top|Left|Height|Width)\b|\.client(Height|Width)\b|\.scrollHeight\b/.test(
              l,
            ),
          );
          if (readIdx >= 0) add('layout-read-in-scroll', file, i + readIdx + 1);
        }
      }
      if (
        /new\s+(THREE\.)?(WebGLRenderer|WebGPURenderer)\(/.test(line) &&
        !/\.dispose\(/.test(text)
      )
        add('renderer-not-disposed', file, n);
      if (
        /(window|document)\.addEventListener\(/.test(line) &&
        !/removeEventListener|signal/.test(text)
      )
        add('listener-not-removed', file, n);
    });
  }
}

if (animates && !reducedHandled)
  findings.unshift({
    rule: 'reduced-motion-missing',
    severity: 'error',
    file: '.',
    line: 0,
    message: RULES['reduced-motion-missing'].message,
    fix: RULES['reduced-motion-missing'].fix,
  });

// De-duplicate identical rule/file/line.
const seen = new Set();
const unique = findings.filter((f) => {
  const key = `${f.rule}|${f.file}|${f.line}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

const summary = {
  root,
  animates,
  reducedMotionHandled: reducedHandled,
  counts: unique.reduce((acc, f) => {
    acc[f.severity] = (acc[f.severity] ?? 0) + 1;
    return acc;
  }, {}),
  findings: unique,
};

if (asJson) {
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
} else {
  if (unique.length === 0) process.stdout.write('audit-motion: no findings.\n');
  for (const f of unique) {
    process.stdout.write(
      `${f.file}:${f.line} [${f.severity}] ${f.rule} — ${f.message}\n    fix: ${f.fix}\n`,
    );
  }
  process.stdout.write(
    `\n${unique.length} finding(s): ${JSON.stringify(summary.counts)}. Heuristic scan — verify each lead.\n`,
  );
}

if (strict && unique.some((f) => f.severity === 'error')) process.exit(1);
