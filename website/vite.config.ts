import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { renderWork } from './src/studio/render';

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

/** Work section and case studies are static HTML generated from src/studio/projects.ts. */
function renderStudio(): Plugin {
  return {
    name: 'snowbros-render-studio',
    transformIndexHtml(html) {
      if (!html.includes('<!--render:')) return html;
      const out = renderWork();
      return html
        .replace('<!--render:cases-->', out.cases)
        .replace('<!--render:also-->', out.also)
        .replace('<!--render:docs-->', out.docs);
    },
  };
}

/**
 * Dev only: serve /api/contact with the same handler Vercel runs in production, reading
 * RESEND_API_KEY / CONTACT_TO_EMAIL / CONTACT_FROM_EMAIL from .env.local.
 */
function devContact(): Plugin {
  return {
    name: 'snowbros-dev-contact',
    apply: 'serve',
    configureServer(server) {
      Object.assign(
        process.env,
        loadEnv('development', server.config.root, ['RESEND_', 'CONTACT_']),
      );
      server.middlewares.use('/api/contact', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end();
          return;
        }
        const chunks: Buffer[] = [];
        for await (const c of req) chunks.push(c as Buffer);
        const { POST } = await server.ssrLoadModule('/api/contact.ts');
        const out: Response = await POST(
          new Request('http://localhost/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: Buffer.concat(chunks).toString('utf8'),
          }),
        );
        res.statusCode = out.status;
        res.setHeader('Content-Type', 'application/json');
        res.end(await out.text());
      });
    },
  };
}

export default defineConfig({
  resolve: { alias },
  plugins: [renderStudio(), devContact()],
  // Showcase demos (apps/showcase) are served at /demos/; in dev, proxy to its server.
  server: { port: 5173, proxy: { '/demos': 'http://localhost:5180' } },
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL('./index.html', import.meta.url)),
        lab: fileURLToPath(new URL('./lab.html', import.meta.url)),
        founder: fileURLToPath(new URL('./founder.html', import.meta.url)),
        privacy: fileURLToPath(new URL('./privacy.html', import.meta.url)),
      },
    },
  },
});
