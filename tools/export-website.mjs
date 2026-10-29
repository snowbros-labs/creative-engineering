#!/usr/bin/env node
/**
 * Export the SNOWBROS studio site (website/: home, lab, founder, /api/contact) as a standalone
 * Vite project that builds outside this monorepo — the source of VED2107/snowbros (snowbros.me).
 *
 * The toolkit sources the site uses are snapshotted into `toolkit/` and aliased, exactly as the
 * monorepo build does. Only paths this script owns are replaced; `.git`, `.env*` and anything else
 * in the target are left alone. Re-run after changing the site or packages, then commit there.
 *
 *   node tools/export-website.mjs <out-dir>
 */
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(process.argv[2] ?? join(root, '..', 'snowbros'));
const PACKAGES = ['core', 'motion', 'fx', 'scene', 'adapters'];
const PAGES = ['index.html', 'lab.html', 'founder.html', 'privacy.html'];
const OWNED = [
  ...PAGES,
  'public',
  'src',
  'api',
  'toolkit',
  'package.json',
  'vite.config.mjs',
  'tsconfig.json',
  'README.md',
  'LICENSE-MIT',
  'LICENSE-APACHE',
  '.gitignore',
  'vercel.json',
];

const tokensCss = join(root, 'packages/tokens/dist/tokens.css');
if (!existsSync(tokensCss)) {
  console.error('packages/tokens/dist/tokens.css missing — run `pnpm build` first.');
  process.exit(1);
}

mkdirSync(out, { recursive: true });
for (const entry of OWNED) rmSync(join(out, entry), { recursive: true, force: true });
const copy = (from, to) => cpSync(join(root, from), join(out, to), { recursive: true });

for (const page of PAGES) copy(`website/${page}`, page);
copy('website/public', 'public');
copy('website/src', 'src');
copy('website/api', 'api');
for (const p of PACKAGES) copy(`packages/${p}/src`, `toolkit/${p}/src`);
mkdirSync(join(out, 'toolkit/tokens'), { recursive: true });
cpSync(tokensCss, join(out, 'toolkit/tokens/tokens.css'));
copy('LICENSE-MIT', 'LICENSE-MIT');
copy('LICENSE-APACHE', 'LICENSE-APACHE');

const sitePkg = JSON.parse(readFileSync(join(root, 'website/package.json'), 'utf8'));
const deps = Object.fromEntries(
  Object.entries(sitePkg.dependencies).filter(([name]) => !name.startsWith('@snowbros/')),
);
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
      name: 'snowbros',
      version: '1.0.0',
      private: true,
      description:
        'snowbros.me — the SNOWBROS studio site: work, lab, founder. Vite, static + one Vercel function.',
      license: '(MIT OR Apache-2.0)',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview',
        typecheck: 'tsc --noEmit',
        test: 'node --test scripts/test-contact.mjs',
      },
      dependencies: deps,
      devDependencies: {
        ...Object.fromEntries(
          Object.entries(sitePkg.devDependencies).filter(([n]) => n.startsWith('@types/')),
        ),
        '@types/node': '^24',
        typescript: '^5',
        vite: sitePkg.devDependencies.vite,
      },
      engines: { node: '>=20.19' },
    },
    null,
    2,
  )}\n`,
);

writeFileSync(
  join(out, 'tsconfig.json'),
  `${JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        lib: ['ES2023', 'DOM', 'DOM.Iterable'],
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        types: ['vite/client', 'node'],
        paths: Object.fromEntries(
          PACKAGES.map((n) => [`@snowbros/${n}`, [`./toolkit/${n}/src/index.ts`]]),
        ),
      },
      include: ['src', 'api', 'toolkit'],
    },
    null,
    2,
  )}\n`,
);

// The monorepo's vite.config.ts, re-pointed at the toolkit snapshot.
const monoConfig = readFileSync(join(root, 'website/vite.config.ts'), 'utf8');
const pluginsSrc = monoConfig.slice(
  monoConfig.indexOf('/** Work section and case studies'),
  monoConfig.indexOf('export default defineConfig'),
);
writeFileSync(
  join(out, 'vite.config.mjs'),
  `import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import { renderWork } from './src/studio/render.ts';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));

// @snowbros/* resolve to the toolkit snapshot in ./toolkit (sources, tree-shaken by Vite).
const alias = ${JSON.stringify(PACKAGES)}.map((name) => ({
  find: new RegExp(\`^@snowbros/\${name}$\`),
  replacement: here(\`./toolkit/\${name}/src/index.ts\`),
}));
alias.push({ find: /^@snowbros\\/tokens\\/tokens\\.css$/, replacement: here('./toolkit/tokens/tokens.css') });

${pluginsSrc
  .replace(/: Plugin/g, '')
  .replace(/\(\s*html\s*\)/, '(html)')
  .replace(/const chunks: Buffer\[\] = \[\];/, 'const chunks = [];')
  .replace(/chunks\.push\(c as Buffer\)/, 'chunks.push(c)')
  .replace(/const out: Response = /, 'const out = ')}
export default defineConfig({
  resolve: { alias },
  plugins: [renderStudio(), devContact()],
  build: {
    target: 'es2022',
    rollupOptions: {
      input: { index: here('./index.html'), lab: here('./lab.html'), founder: here('./founder.html'), privacy: here('./privacy.html') },
    },
  },
});
`,
);

writeFileSync(
  join(out, '.gitignore'),
  'node_modules/\ndist/\n.vercel/\n*.log\n.env\n.env.*\n!.env.example\n.playwright-mcp/\nbrand/content/out/\n',
);
writeFileSync(
  join(out, 'vercel.json'),
  `${JSON.stringify({ framework: 'vite', buildCommand: 'npm run build', outputDirectory: 'dist' }, null, 2)}\n`,
);
writeFileSync(
  join(out, '.env.example'),
  'RESEND_API_KEY=\nCONTACT_TO_EMAIL=\nCONTACT_FROM_EMAIL=\n# CONTACT_CONFIRM=false\n# SITE_URL=https://snowbros.me\n',
);
writeFileSync(
  join(out, 'README.md'),
  `# snowbros.me

The SNOWBROS studio site: selected work and case studies, the lab (working benches from our
open-source [Creative Engineering](https://github.com/snowbros-labs/creative-engineering) toolkit)
and the founder page. Vite, static pages plus one Vercel function for the contact form.

**Source of truth:** \`website/\` in
[snowbros-labs/creative-engineering](https://github.com/snowbros-labs/creative-engineering).
Changes are made there and exported here:

\`\`\`bash
# in creative-engineering
pnpm build
node tools/export-website.mjs ../snowbros
\`\`\`

## Run

\`\`\`bash
npm install
cp .env.example .env.local   # Resend keys, for the contact form in dev
npm run dev                   # http://localhost:5173 — /, /lab.html, /founder.html
npm run build                 # static output in dist/
\`\`\`

## Deploy (Vercel)

Import the repository; Vercel detects Vite (\`vercel.json\` pins build and output). \`api/contact.ts\`
deploys as a function. Set \`RESEND_API_KEY\`, \`CONTACT_TO_EMAIL\` and \`CONTACT_FROM_EMAIL\` in the
project settings. Node ≥ 20.19.

## Layout

- \`index.html\`, \`lab.html\`, \`founder.html\`, \`src/\` — the pages (work rendered from \`src/studio/projects.ts\` at build time)
- \`api/contact.ts\` — the brief form: Resend notification + themed confirmation
- \`public/work\` — captures of the projects themselves; \`public/email\` — email art
- \`toolkit/\` — snapshot of \`@snowbros/core\`, \`motion\`, \`fx\`, \`scene\`, \`adapters\` sources and the tokens CSS

Exported from creative-engineering commit \`${commit}\`. Dual-licensed MIT OR Apache-2.0.
`,
);

console.log(`exported → ${out}`);
