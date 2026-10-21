import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const scripts = join(repo, 'skills', 'snowbros-creative', 'scripts');
const tmpRoot = mkdtempSync(join(tmpdir(), 'snowbros-skill-'));

afterAll(() => rmSync(tmpRoot, { recursive: true, force: true }));

function fixture(name, files) {
  const dir = join(tmpRoot, name);
  for (const [path, content] of Object.entries(files)) {
    const full = join(dir, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, typeof content === 'string' ? content : JSON.stringify(content, null, 2));
  }
  // Stop package-manager detection from walking above the fixture.
  mkdirSync(join(dir, '.git'), { recursive: true });
  return dir;
}

const detect = (dir) =>
  JSON.parse(
    execFileSync(process.execPath, [join(scripts, 'detect-stack.mjs'), dir], { encoding: 'utf8' }),
  );

describe('detect-stack', () => {
  it('detects Next + Tailwind + GSAP + shadcn and recommends using GSAP', () => {
    const dir = fixture('next-app', {
      'package.json': {
        name: 'web',
        dependencies: {
          next: '15.0.0',
          react: '19.0.0',
          gsap: '3.13.0',
          '@radix-ui/react-dialog': '1.0.0',
        },
        devDependencies: {
          tailwindcss: '4.0.0',
          typescript: '5.6.0',
          '@playwright/test': '1.50.0',
        },
      },
      'pnpm-lock.yaml': 'lockfileVersion: 9',
      'components.json': {},
      'tsconfig.json': {},
      'app/page.tsx': 'export default function Page() { return null }',
      'styles/tokens.css': ':root{}',
    });
    const r = detect(dir);
    expect(r.platform).toBe('react-next');
    expect(r.packageManager).toBe('pnpm');
    expect(r.frameworks).toEqual(expect.arrayContaining(['next', 'react']));
    expect(r.ssr).toBe(true);
    expect(r.styling).toContain('tailwind');
    expect(r.animation.map((a) => a.name)).toContain('gsap');
    expect(r.uiKits).toEqual(expect.arrayContaining(['radix', 'shadcn']));
    expect(r.testing).toContain('playwright');
    expect(r.typescript).toBe(true);
    expect(r.designTokens.files).toContain('styles/tokens.css');
    expect(r.recommendations.join('\n')).toMatch(/GSAP is already installed/);
  });

  it('detects Flutter and forbids web libraries', () => {
    const dir = fixture('flutter-app', {
      'pubspec.yaml': 'name: app\ndependencies:\n  flutter:\n    sdk: flutter\n  rive: ^0.13.0\n',
      'lib/main.dart': 'void main() {}',
    });
    const r = detect(dir);
    expect(r.platform).toBe('flutter');
    expect(r.languages).toContain('dart');
    expect(r.animation.map((a) => a.name)).toContain('rive (flutter)');
    expect(r.recommendations.join('\n')).toMatch(/do NOT add @snowbros/);
  });

  it('detects Vue + Vite with npm lockfile', () => {
    const dir = fixture('vue-app', {
      'package.json': {
        dependencies: { vue: '3.5.0' },
        devDependencies: { vite: '6.0.0', vitest: '3.0.0' },
      },
      'package-lock.json': '{}',
      'src/App.vue': '<template><div/></template>',
    });
    const r = detect(dir);
    expect(r.platform).toBe('vue-nuxt');
    expect(r.packageManager).toBe('npm');
    expect(r.frameworks).toEqual(expect.arrayContaining(['vue', 'vite']));
    expect(r.ssr).toBe(false);
    expect(r.testing).toContain('vitest');
  });

  it('aggregates monorepo workspaces and tolerates malformed JSON', () => {
    const dir = fixture('mono', {
      'package.json': {
        name: 'root',
        private: true,
        workspaces: ['packages/*'],
        packageManager: 'yarn@4.5.0',
      },
      'packages/site/package.json': {
        name: 'site',
        dependencies: { svelte: '5.0.0', '@sveltejs/kit': '2.0.0', three: '0.170.0' },
      },
      'packages/ui/package.json': {
        name: 'ui',
        dependencies: { motion: '12.0.0', react: '19.0.0' },
      },
      'packages/broken/package.json': '{ not json',
    });
    const r = detect(dir);
    expect(r.monorepo).toBe(true);
    expect(r.packageManager).toBe('yarn');
    expect(r.packages.map((p) => p.name)).toEqual(expect.arrayContaining(['root', 'site', 'ui']));
    expect(r.frameworks).toEqual(expect.arrayContaining(['svelte', 'sveltekit', 'react']));
    expect(r.graphics.map((g) => g.name)).toContain('three');
    expect(r.recommendations.join('\n')).toMatch(/Malformed JSON skipped/);
  });

  it('inherits the workspace package manager from a parent directory', () => {
    const dir = fixture('ws', {
      'pnpm-workspace.yaml': 'packages:\n  - "apps/*"\n',
      'package.json': { name: 'root', private: true },
      'apps/web/package.json': { name: 'web', dependencies: { vite: '6.0.0' } },
    });
    const r = detect(join(dir, 'apps', 'web'));
    expect(r.packageManager).toBe('pnpm');
    expect(r.workspaceRoot).toBe(dir);
  });

  it('handles an empty directory without throwing', () => {
    const r = detect(fixture('empty', {}));
    expect(r.platform).toBe('unknown');
    expect(r.packageManager).toBeNull();
  });
});

describe('audit-motion', () => {
  it('reports known smells with rule ids', () => {
    const dir = fixture('smelly', {
      'src/app.js': [
        "window.addEventListener('scroll', () => {",
        '  const r = el.getBoundingClientRect();',
        '  setOffset(r.top);',
        '});',
        'requestAnimationFrame(() => setFrame(1));',
        "import * as THREE from 'three';",
        'const renderer = new THREE.WebGLRenderer();',
      ].join('\n'),
      'src/styles.css': [
        '.card { transition: all 300ms; }',
        'button:focus { outline: none; }',
        '@keyframes grow {',
        '  from { width: 0; }',
        '  to { width: 100px; }',
        '}',
        '.wrap { overflow: hidden; }',
        '.stage { position: sticky; top: 0; }',
      ].join('\n'),
    });
    const out = JSON.parse(
      execFileSync(process.execPath, [join(scripts, 'audit-motion.mjs'), dir, '--json'], {
        encoding: 'utf8',
      }),
    );
    const rules = new Set(out.findings.map((f) => f.rule));
    for (const id of [
      'reduced-motion-missing',
      'non-passive-listener',
      'state-in-frame-loop',
      'layout-read-in-scroll',
      'transition-all',
      'layout-property-animation',
      'outline-removed',
      'sticky-overflow-conflict',
      'renderer-not-disposed',
      'listener-not-removed',
    ]) {
      expect(rules, id).toContain(id);
    }
    const strict = spawnSync(
      process.execPath,
      [join(scripts, 'audit-motion.mjs'), dir, '--strict'],
      { encoding: 'utf8' },
    );
    expect(strict.status).toBe(1);
  });

  it('is quiet on a clean project', () => {
    const dir = fixture('clean', {
      'src/app.js': [
        'const ac = new AbortController();',
        "window.addEventListener('scroll', onScroll, { passive: true, signal: ac.signal });",
      ].join('\n'),
      'src/styles.css': [
        '.card { transition: opacity 150ms, transform 150ms; }',
        '@media (prefers-reduced-motion: reduce) { .card { transition: none; } }',
        'button:focus-visible { outline: 2px solid currentColor; }',
      ].join('\n'),
    });
    const out = JSON.parse(
      execFileSync(process.execPath, [join(scripts, 'audit-motion.mjs'), dir, '--json'], {
        encoding: 'utf8',
      }),
    );
    expect(out.findings).toEqual([]);
    expect(out.reducedMotionHandled).toBe(true);
  });
});

describe('validate-skill', () => {
  it('passes on the repository skills directory', () => {
    const r = spawnSync(process.execPath, [join(repo, 'tools', 'validate-skill.mjs')], {
      encoding: 'utf8',
    });
    expect(r.stdout).toMatch(/0 error\(s\)/);
    expect(r.status).toBe(0);
  });

  it('fails on a broken skill', () => {
    const dir = fixture('bad-skills', {
      'Bad_Skill/SKILL.md': '---\nname: other-name\n---\n\nSee [missing](references/nope.md).\n',
    });
    const r = spawnSync(process.execPath, [join(repo, 'tools', 'validate-skill.mjs'), dir], {
      encoding: 'utf8',
    });
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/description missing/);
    expect(r.stdout).toMatch(/must match folder/);
    expect(r.stdout).toMatch(/broken link/);
  });
});
