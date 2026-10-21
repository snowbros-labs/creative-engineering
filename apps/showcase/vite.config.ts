import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url));
const packagesDir = fileURLToPath(new URL('../../packages/', import.meta.url));

// Resolve workspace packages to their sources so the showcase always reflects current code
// (no stale dist) and production builds tree-shake through them.
const alias = readdirSync(packagesDir).flatMap((name) => [
  { find: new RegExp(`^@snowbros/${name}$`), replacement: `${packagesDir}${name}/src/index.ts` },
]);
alias.push({ find: /^@snowbros\/tokens\/tokens\.css$/, replacement: `${packagesDir}tokens/dist/tokens.css` });

export default defineConfig({
  resolve: { alias },
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        dashboard: `${root}dashboard.html`,
        playground: `${root}playground.html`,
      },
    },
  },
});
