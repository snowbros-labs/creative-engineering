#!/usr/bin/env node
// SNOWBROS Creative Engineering — project reconnaissance.
// Zero dependencies. Node >= 18. Never throws on malformed input; reports what it can see.
//
// Usage: node detect-stack.mjs [projectDir] [--pretty]
// Output: JSON describing languages, frameworks, styling, animation/3D libraries, UI kits,
// testing tools, token files and recommendations for which tools to use.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';

const args = process.argv.slice(2);
const pretty = args.includes('--pretty');
const root = resolve(args.find((a) => !a.startsWith('--')) ?? process.cwd());

const IGNORE = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.nuxt',
  '.svelte-kit',
  '.turbo',
  'coverage',
  '.dart_tool',
  'Pods',
  '.gradle',
  'target',
]);

function readText(file) {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

function readJson(file) {
  const text = readText(file);
  if (text == null) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { __invalid: true };
  }
}

function list(dir) {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

function isDir(p) {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/** Shallow recursive file walk (bounded) used for file-type signals. */
function walk(dir, depth = 4, out = [], limit = 4000) {
  if (depth < 0 || out.length >= limit) return out;
  for (const name of list(dir)) {
    if (IGNORE.has(name)) continue;
    const p = join(dir, name);
    if (isDir(p)) walk(p, depth - 1, out, limit);
    else out.push(p);
    if (out.length >= limit) break;
  }
  return out;
}

/** Expand simple workspace globs like "packages/*" or "apps/**". */
function expandWorkspaces(patterns) {
  const dirs = [];
  for (const pattern of patterns) {
    if (typeof pattern !== 'string' || pattern.startsWith('!')) continue;
    const clean = pattern.replace(/\/\*\*?$/, '').replace(/\/$/, '');
    if (pattern.endsWith('*')) {
      for (const name of list(join(root, clean))) {
        const p = join(root, clean, name);
        if (isDir(p)) dirs.push(p);
      }
    } else if (isDir(join(root, clean))) {
      dirs.push(join(root, clean));
    }
  }
  return dirs;
}

function workspacePatterns(pkg) {
  const fromPkg = Array.isArray(pkg?.workspaces) ? pkg.workspaces : pkg?.workspaces?.packages;
  const patterns = Array.isArray(fromPkg) ? [...fromPkg] : [];
  const pnpmWs = readText(join(root, 'pnpm-workspace.yaml'));
  if (pnpmWs) {
    for (const m of pnpmWs.matchAll(/^\s*-\s*["']?([^"'\n#]+)["']?/gm)) patterns.push(m[1].trim());
  }
  return patterns;
}

// ---------------------------------------------------------------------------------------------
const rootPkg = readJson(join(root, 'package.json'));
const pkgDirs = [root, ...expandWorkspaces(workspacePatterns(rootPkg))];
const packages = [];
const deps = new Map(); // name -> version (first seen)
const invalidJson = [];

for (const dir of pkgDirs) {
  const pkg = readJson(join(dir, 'package.json'));
  if (!pkg) continue;
  if (pkg.__invalid) {
    invalidJson.push(join(dir, 'package.json'));
    continue;
  }
  packages.push({
    dir: dir === root ? '.' : dir.slice(root.length + 1).replace(/\\/g, '/'),
    name: pkg.name ?? null,
  });
  for (const field of [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
  ]) {
    const block = pkg[field];
    if (!block || typeof block !== 'object') continue;
    for (const [name, version] of Object.entries(block))
      if (!deps.has(name)) deps.set(name, String(version));
  }
}

const has = (name) => deps.has(name);
const hasPrefix = (prefix) => [...deps.keys()].some((d) => d.startsWith(prefix));
const version = (name) => deps.get(name) ?? null;
const files = walk(root);
const rel = (p) => p.slice(root.length + 1).replace(/\\/g, '/');
const fileNames = files.map((f) => basename(f));
const anyFile = (re) => files.some((f) => re.test(rel(f)));
const rootHas = (name) => existsSync(join(root, name));

// Package manager -----------------------------------------------------------------------------
// Walk up from the project dir: a package inside a workspace inherits the workspace's manager.
function detectPackageManager() {
  let dir = root;
  for (let i = 0; i < 12; i++) {
    const pkg = readJson(join(dir, 'package.json'));
    if (pkg && !pkg.__invalid && pkg.packageManager) {
      return { name: String(pkg.packageManager).split('@')[0], at: dir };
    }
    const at = (f) => existsSync(join(dir, f));
    if (at('pnpm-lock.yaml') || at('pnpm-workspace.yaml')) return { name: 'pnpm', at: dir };
    if (at('yarn.lock') || at('.yarnrc.yml')) return { name: 'yarn', at: dir };
    if (at('bun.lockb') || at('bun.lock')) return { name: 'bun', at: dir };
    if (at('package-lock.json')) return { name: 'npm', at: dir };
    if (at('.git')) break; // repository root reached
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return rootPkg ? { name: 'npm', at: root } : null;
}
const pmInfo = detectPackageManager();
const packageManager = pmInfo?.name ?? null;
const workspaceRoot = pmInfo && pmInfo.at !== root ? pmInfo.at : null;

// Languages -----------------------------------------------------------------------------------
const extCount = (re) => files.filter((f) => re.test(f)).length;
const languages = [];
if (has('typescript') || rootHas('tsconfig.json') || extCount(/\.(ts|tsx|mts|cts)$/) > 0)
  languages.push('typescript');
if (extCount(/\.(js|jsx|mjs|cjs)$/) > 0 || rootPkg) languages.push('javascript');
if (extCount(/\.dart$/) > 0 || rootHas('pubspec.yaml')) languages.push('dart');
if (extCount(/\.swift$/) > 0 || rootHas('Package.swift')) languages.push('swift');
if (extCount(/\.kt(s)?$/) > 0) languages.push('kotlin');
if (extCount(/\.rs$/) > 0 || rootHas('Cargo.toml')) languages.push('rust');
if (extCount(/\.py$/) > 0) languages.push('python');
if (extCount(/\.go$/) > 0) languages.push('go');
if (extCount(/\.vue$/) > 0) languages.push('vue-sfc');
if (extCount(/\.svelte$/) > 0) languages.push('svelte');

// Frameworks ----------------------------------------------------------------------------------
const frameworks = [];
const fw = (cond, name) => cond && frameworks.push(name);
fw(has('next'), 'next');
fw(has('react') || has('preact'), has('preact') && !has('react') ? 'preact' : 'react');
fw(has('nuxt'), 'nuxt');
fw(has('vue'), 'vue');
fw(has('@sveltejs/kit'), 'sveltekit');
fw(has('svelte'), 'svelte');
fw(has('astro'), 'astro');
fw(has('solid-js'), 'solid');
fw(has('@angular/core'), 'angular');
fw(
  has('@remix-run/react') ||
    has('@remix-run/node') ||
    (has('react-router') && has('@react-router/dev')),
  'remix/react-router',
);
fw(has('lit'), 'lit');
fw(has('vite'), 'vite');
fw(has('webpack'), 'webpack');
fw(has('electron'), 'electron');
fw(has('@tauri-apps/api') || rootHas('src-tauri'), 'tauri');
fw(has('react-native') || has('expo'), has('expo') ? 'expo' : 'react-native');

const pubspec = readText(join(root, 'pubspec.yaml'));
if (pubspec) frameworks.push('flutter');
const swiftProject =
  rootHas('Package.swift') ||
  list(root).some((n) => n.endsWith('.xcodeproj') || n.endsWith('.xcworkspace'));
const swiftUI = files.some(
  (f) => f.endsWith('.swift') && /import\s+SwiftUI/.test(readText(f) ?? ''),
);
if (swiftProject || swiftUI) frameworks.push(swiftUI ? 'swiftui' : 'swift');
const gradleFiles = files.filter(
  (f) => /build\.gradle(\.kts)?$/.test(f) || /libs\.versions\.toml$/.test(f),
);
const gradleText = gradleFiles.map((f) => readText(f) ?? '').join('\n');
if (gradleFiles.length) {
  frameworks.push('android');
  if (/compose/i.test(gradleText)) frameworks.push('jetpack-compose');
}

// Styling -------------------------------------------------------------------------------------
const styling = [];
const st = (cond, name) => cond && styling.push(name);
st(has('tailwindcss') || fileNames.some((n) => /^tailwind\.config\./.test(n)), 'tailwind');
st(anyFile(/\.module\.(css|scss|sass)$/), 'css-modules');
st(has('styled-components'), 'styled-components');
st(hasPrefix('@emotion/'), 'emotion');
st(hasPrefix('@vanilla-extract/'), 'vanilla-extract');
st(has('sass') || anyFile(/\.(scss|sass)$/), 'sass');
st(hasPrefix('@pandacss/'), 'panda');
st(has('@stylexjs/stylex'), 'stylex');
st(has('unocss'), 'unocss');

// Animation, 3D, graphics ---------------------------------------------------------------------
const animationNames = [
  'gsap',
  'motion',
  'framer-motion',
  'motion-v',
  'lenis',
  '@studio-freight/lenis',
  'animejs',
  '@react-spring/web',
  'react-spring',
  'popmotion',
  '@theatre/core',
  '@theatre/studio',
  'lottie-web',
  'lottie-react',
  '@lottiefiles/dotlottie-web',
  '@rive-app/canvas',
  '@rive-app/react-canvas',
  '@rive-app/webgl2',
  'locomotive-scroll',
  '@barba/core',
  'swup',
  '@formkit/auto-animate',
  'auto-animate',
];
const graphicsNames = [
  'three',
  '@react-three/fiber',
  '@react-three/drei',
  '@react-three/postprocessing',
  '@threlte/core',
  'ogl',
  'pixi.js',
  'babylonjs',
  '@babylonjs/core',
  '@splinetool/runtime',
  'd3',
  'd3-scale',
  'd3-shape',
  'visx',
  '@visx/visx',
  'recharts',
  'chart.js',
  'echarts',
  '@observablehq/plot',
  'deck.gl',
  'mapbox-gl',
  'maplibre-gl',
];
const pick = (names) => names.filter(has).map((n) => ({ name: n, version: version(n) }));
const animation = pick(animationNames);
const graphics = pick(graphicsNames);
const snowbros = [...deps.keys()].filter((d) => d.startsWith('@snowbros/'));
if (pubspec && /\brive\b/.test(pubspec)) animation.push({ name: 'rive (flutter)', version: null });
if (pubspec && /\blottie\b/.test(pubspec))
  animation.push({ name: 'lottie (flutter)', version: null });
if (/lottie/i.test(gradleText)) animation.push({ name: 'lottie (android)', version: null });

// UI kits -------------------------------------------------------------------------------------
const ui = [];
const u = (cond, name) => cond && ui.push(name);
u(hasPrefix('@radix-ui/') || has('radix-ui'), 'radix');
u(
  rootHas('components.json') ||
    packages.some((p) => existsSync(join(root, p.dir, 'components.json'))),
  'shadcn',
);
u(has('@headlessui/react') || has('@headlessui/vue'), 'headlessui');
u(hasPrefix('@mui/'), 'mui');
u(hasPrefix('@chakra-ui/'), 'chakra');
u(hasPrefix('@mantine/'), 'mantine');
u(has('react-aria') || has('react-aria-components') || hasPrefix('@react-aria/'), 'react-aria');
u(has('@ark-ui/react') || has('@ark-ui/vue'), 'ark');
u(has('vuetify'), 'vuetify');
u(has('@nuxt/ui'), 'nuxt-ui');
u(has('bits-ui') || has('melt'), 'bits/melt');
u(hasPrefix('@angular/material'), 'angular-material');

// Testing -------------------------------------------------------------------------------------
const testing = [];
const t = (cond, name) => cond && testing.push(name);
t(has('vitest'), 'vitest');
t(has('jest'), 'jest');
t(has('@playwright/test') || has('playwright'), 'playwright');
t(has('cypress'), 'cypress');
t(hasPrefix('@testing-library/'), 'testing-library');
t(hasPrefix('@axe-core/') || has('axe-core'), 'axe');
t(has('@storybook/react') || hasPrefix('@storybook/'), 'storybook');
t(has('@chromatic-com/storybook') || has('chromatic'), 'chromatic');
t(has('lighthouse') || has('@lhci/cli'), 'lighthouse');

// Design tokens -------------------------------------------------------------------------------
const tokenFiles = files
  .map(rel)
  .filter(
    (r) =>
      /(^|\/)(tokens?|design-tokens)(\.[a-z]+)?\.(json|ya?ml|ts|js|css)$/i.test(r) ||
      /\.tokens\.json$/i.test(r) ||
      /(^|\/)tokens\/.*\.(json|css)$/i.test(r) ||
      /theme\.(ts|js|json)$/i.test(r),
  )
  .slice(0, 20);
const styleDictionary = has('style-dictionary');

// Rendering mode ------------------------------------------------------------------------------
const ssr =
  has('next') ||
  has('nuxt') ||
  has('@sveltejs/kit') ||
  has('astro') ||
  has('@remix-run/node') ||
  has('@react-router/dev') ||
  has('@angular/ssr') ||
  has('@builder.io/qwik-city');

// Platform profile ----------------------------------------------------------------------------
let platform = 'unknown';
if (frameworks.includes('flutter')) platform = 'flutter';
else if (frameworks.includes('swiftui') || frameworks.includes('swift')) platform = 'swiftui';
else if (frameworks.includes('jetpack-compose') || frameworks.includes('android'))
  platform = 'jetpack-compose';
else if (frameworks.includes('react-native') || frameworks.includes('expo'))
  platform = 'react-native';
else if (frameworks.includes('electron') || frameworks.includes('tauri')) platform = 'desktop-web';
else if (frameworks.includes('next') || frameworks.includes('react')) platform = 'react-next';
else if (frameworks.includes('nuxt') || frameworks.includes('vue')) platform = 'vue-nuxt';
else if (frameworks.includes('svelte') || frameworks.includes('sveltekit')) platform = 'svelte';
else if (frameworks.includes('astro')) platform = 'web-vanilla';
else if (frameworks.includes('lit')) platform = 'web-components';
else if (rootPkg || anyFile(/\.html$/)) platform = 'web-vanilla';
const isWeb = !['flutter', 'swiftui', 'jetpack-compose', 'react-native', 'unknown'].includes(
  platform,
);

// Recommendations -----------------------------------------------------------------------------
const recommendations = [];
const rec = (s) => recommendations.push(s);
const names = new Set(animation.map((a) => a.name));
if (!isWeb && platform !== 'unknown') {
  rec(
    `Native platform (${platform}): do NOT add @snowbros/* or any browser library. Use native primitives — load references/platforms/${platform === 'react-native' ? 'react-next' : platform}.md.`,
  );
}
if (names.has('motion') || names.has('framer-motion')) {
  rec(
    "Motion is already installed → keep it for React component/layout motion (AnimatePresence, layout). Add @snowbros/motion only for scroll choreography/pinning if Motion's scroll APIs are insufficient.",
  );
}
if (names.has('gsap')) {
  rec(
    'GSAP is already installed → implement timelines/ScrollTrigger with GSAP; do not add a second timeline engine. Note: GSAP uses a non-OSI "standard no-charge" license.',
  );
}
if (names.has('lenis') || names.has('@studio-freight/lenis')) {
  rec(
    'Lenis is present → route all scroll-linked effects through the Lenis instance (one scroll source). If adding @snowbros, drive its ticker from Lenis via ticker.useExternalClock().',
  );
}
if (names.has('locomotive-scroll'))
  rec(
    'locomotive-scroll present → audit for scroll-jacking and accessibility regressions before adding effects.',
  );
if (graphics.some((g) => g.name === '@react-three/fiber')) {
  rec(
    'React Three Fiber present → build 3D inside R3F (useFrame, Drei). Use @snowbros/scene utilities only where they do not duplicate R3F lifecycle.',
  );
} else if (graphics.some((g) => g.name === 'three')) {
  rec(
    'three is present (no R3F) → @snowbros/scene can manage stage lifecycle, DPR caps, offscreen pause and disposal.',
  );
}
if (isWeb && animation.length === 0 && snowbros.length === 0) {
  rec(
    'No animation library detected → prefer CSS transitions/WAAPI for functional UI; add @snowbros/motion (zero runtime deps beyond @snowbros/core) only for timelines, scroll choreography, text reveals or FLIP.',
  );
}
if (styling.includes('tailwind'))
  rec(
    'Tailwind present → express tokens as theme extensions/CSS variables; keep motion durations/easings in tokens, not inline arbitrary values.',
  );
if (
  ui.includes('radix') ||
  ui.includes('shadcn') ||
  ui.includes('react-aria') ||
  ui.includes('headlessui')
) {
  rec(
    'Headless/accessible UI kit present → animate via its data-state attributes; never replace its focus management.',
  );
}
if (ssr)
  rec(
    'SSR framework → run animation setup in client-only effects; render final-state markup on the server so content is visible without JS.',
  );
if (!testing.includes('playwright') && isWeb)
  rec(
    'No Playwright detected → add it (dev-only) for reduced-motion, keyboard and visual checks if the task changes interaction.',
  );
if (tokenFiles.length)
  rec(
    `Design tokens found (${tokenFiles.slice(0, 3).join(', ')}${tokenFiles.length > 3 ? ', …' : ''}) → extend these; do not create a parallel token system.`,
  );
if (invalidJson.length) rec(`Malformed JSON skipped: ${invalidJson.map(rel).join(', ')}`);

const result = {
  root,
  platform,
  packageManager,
  workspaceRoot,
  monorepo: packages.length > 1,
  packages,
  languages,
  typescript: languages.includes('typescript'),
  frameworks,
  ssr,
  styling,
  animation,
  graphics,
  uiKits: ui,
  testing,
  designTokens: { files: tokenFiles, styleDictionary },
  snowbros,
  recommendations,
};

process.stdout.write(`${JSON.stringify(result, null, pretty ? 2 : 0)}\n`);
