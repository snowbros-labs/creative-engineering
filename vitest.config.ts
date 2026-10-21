import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Tests run against package sources, not built dist, so `pnpm test` works without a build.
const packagesDir = fileURLToPath(new URL('./packages/', import.meta.url));
const alias = readdirSync(packagesDir).map((name) => ({
  find: new RegExp(`^@snowbros/${name}$`),
  replacement: `${packagesDir}${name}/src/index.ts`,
}));

export default defineConfig({
  resolve: { alias },
  test: {
    environment: 'happy-dom',
    include: ['packages/*/test/**/*.test.ts', 'packages/*/test/**/*.test.tsx', 'tools/test/**/*.test.mjs'],
  },
});
