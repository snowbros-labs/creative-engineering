import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const packagesDir = fileURLToPath(new URL('../packages/', import.meta.url));

// Workspace packages resolve to sources: the site always reflects current library code.
const alias = readdirSync(packagesDir).map((name) => ({
  find: new RegExp(`^@snowbros/${name}$`),
  replacement: `${packagesDir}${name}/src/index.ts`,
}));
alias.push({
  find: /^@snowbros\/tokens\/tokens\.css$/,
  replacement: `${packagesDir}tokens/dist/tokens.css`,
});

export default defineConfig({
  resolve: { alias },
  // Showcase demos (apps/showcase) are served at /demos/; in dev, proxy to its server.
  server: { port: 5173, proxy: { '/demos': 'http://localhost:5180' } },
  build: { target: 'es2022' },
});
