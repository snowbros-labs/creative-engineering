#!/usr/bin/env node
/**
 * Export the flagship website (+ the showcase demos at /demos/) as a self-contained Vite project
 * that builds outside this monorepo — for hosting on Vercel/Netlify from its own repository.
 *
 * The toolkit sources the site uses are snapshotted into `toolkit/` and aliased, exactly as the
 * monorepo build does. Re-run after changing the site or packages, then commit the output.
 *
 *   node tools/export-website.mjs <out-dir>
 */
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(process.argv[2] ?? join(root, '..', 'snowbros-website-export'));
const PACKAGES = ['core', 'motion', 'fx', 'scene', 'adapters'];

const tokensCss = join(root, 'packages/tokens/dist/tokens.css');
if (!existsSync(tokensCss)) {
  console.error('packages/tokens/dist/tokens.css missing — run `pnpm build` first.');
  process.exit(1);
}

// Keep the output's git history: clear everything except .git.
if (existsSync(out)) {
  for (const entry of [
    'index.html',
    'public',
    'src',
    'demos',
    'toolkit',
    'package.json',
    'vite.config.mjs',
    'README.md',
    'LICENSE-MIT',
    'LICENSE-APACHE',
    '.gitignore',
    'vercel.json',
  ]) {
    rmSync(join(out, entry), { recursive: true, force: true });
  }
}
mkdirSync(out, { recursive: true });
const copy = (from, to) => cpSync(join(root, from), join(out, to), { recursive: true });

// Site
copy('website/index.html', 'index.html');
copy('website/public', 'public');
copy('website/src', 'src');

// Demos (showcase) under /demos/
mkdirSync(join(out, 'demos'), { recursive: true });
copy('apps/showcase/src', 'demos/src');
for (const page of ['dashboard.html', 'playground.html']) {
  const html = readFileSync(join(root, 'apps/showcase', page), 'utf8').replaceAll(
    'src="/src/',
    'src="./src/',
  );
  writeFileSync(join(out, 'demos', page), html);
}

// Toolkit snapshot
for (const p of PACKAGES) copy(`packages/${p}/src`, `toolkit/${p}/src`);
mkdirSync(join(out, 'toolkit/tokens'), { recursive: true });
cpSync(tokensCss, join(out, 'toolkit/tokens/tokens.css'));
copy('LICENSE-MIT', 'LICENSE-MIT');
copy('LICENSE-APACHE', 'LICENSE-APACHE');

const siteDeps = JSON.parse(readFileSync(join(root, 'website/package.json'), 'utf8')).dependencies;
const { three, gsap } = siteDeps;
const vite = JSON.parse(readFileSync(join(root, 'website/package.json'), 'utf8')).devDependencies
  .vite;
const commit = (() => {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim();
  } catch {
    return 'unknown';
  }
})();

writeFileSync(
  join(out, 'package.json'),
  `${JSON.stringify(
    {
      name: 'snowbros-creative-engineering-site',
      version: '0.1.0',
      private: true,
      description:
        'The SNOWBROS Creative Engineering website — exported from snowbros-labs/creative-engineering.',
      license: '(MIT OR Apache-2.0)',
      type: 'module',
      scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
      dependencies: { gsap, three },
      devDependencies: { vite },
      engines: { node: '>=20.19' },
    },
    null,
    2,
  )}\n`,
);

writeFileSync(
  join(out, 'vite.config.mjs'),
  `import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));

// @snowbros/* resolve to the toolkit snapshot in ./toolkit (sources, tree-shaken by Vite).
const alias = ${JSON.stringify(PACKAGES)}.map((name) => ({
  find: new RegExp(\`^@snowbros/\${name}$\`),
  replacement: here(\`./toolkit/\${name}/src/index.ts\`),
}));
alias.push({ find: /^@snowbros\\/tokens\\/tokens\\.css$/, replacement: here('./toolkit/tokens/tokens.css') });

export default defineConfig({
  resolve: { alias },
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        index: here('./index.html'),
        dashboard: here('./demos/dashboard.html'),
        playground: here('./demos/playground.html'),
      },
    },
  },
});
`,
);

writeFileSync(join(out, '.gitignore'), 'node_modules/\ndist/\n.vercel/\n*.log\n');
writeFileSync(
  join(out, 'vercel.json'),
  `${JSON.stringify({ framework: 'vite', buildCommand: 'npm run build', outputDirectory: 'dist' }, null, 2)}\n`,
);
writeFileSync(
  join(out, 'README.md'),
  `# SNOWBROS Creative Engineering — website

The flagship site for [snowbros-labs/creative-engineering](https://github.com/snowbros-labs/creative-engineering),
exported as a standalone Vite project for hosting. **Do not edit here** — changes belong in the
main repository (\`website/\`, \`apps/showcase/\`, \`packages/*\`). Regenerate with:

\`\`\`bash
# in the main repo
pnpm build
node tools/export-website.mjs ../<this-repo>
\`\`\`

## Run

\`\`\`bash
npm install
npm run dev      # http://localhost:5173  (demos at /demos/dashboard.html, /demos/playground.html)
npm run build    # static output in dist/
\`\`\`

## Deploy (Vercel)

Import the repository; Vercel detects Vite. Build command \`npm run build\`, output \`dist\`
(also pinned in \`vercel.json\`). Node ≥ 20.19.

## Layout

- \`index.html\`, \`src/\` — the flagship page
- \`demos/\` — the Toolkit Ops dashboard and the pattern playground
- \`toolkit/\` — snapshot of \`@snowbros/core\`, \`motion\`, \`fx\`, \`scene\`, \`adapters\` sources and the tokens CSS

Exported from main-repo commit \`${commit}\`.
Dual-licensed MIT OR Apache-2.0.
`,
);

console.log(`exported → ${out}`);
