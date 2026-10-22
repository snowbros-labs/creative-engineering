#!/usr/bin/env node
/**
 * inspect-render — capture a page across a viewport matrix and report visual defects that a build
 * cannot catch. Part of the snowbros-creative skill (references/visual-qa.md).
 *
 *   node inspect-render.mjs <url> [--out <dir>] [--widths 320,360,375,390,430,768,1024,1440]
 *                                 [--reduced] [--menu "<selector>"] [--json]
 *
 * For each width: scrolls the whole page in viewport steps (wheel input, so scroll-linked effects
 * run), saves one screenshot per step, then reports
 *   - horizontal overflow (html scrollWidth > clientWidth) and the elements that cause it
 *   - text rendered below 12 px
 *   - interactive targets smaller than 44 × 44 px on phone widths (< 600 px)
 *   - console errors and failed requests
 *   - idle animation frames over 2 s after settling (a page at rest should schedule none)
 * Optionally opens a menu (`--menu`) and captures it.
 *
 * Needs Playwright: resolved from the project (`npm i -D playwright`) or `npx playwright`.
 * Zero other dependencies. Exit code 1 when overflow or console errors are found.
 */
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith('--'));
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
if (!url) {
  console.error(
    'usage: inspect-render.mjs <url> [--out dir] [--widths 320,390,1440] [--reduced] [--menu sel] [--json]',
  );
  process.exit(2);
}
const out = resolve(opt('out', 'inspect-render-out'));
const widths = opt('widths', '320,360,375,390,430,768,1024,1440').split(',').map(Number);
const heightFor = (w) =>
  w < 600 ? Math.round(w * 2.16) : w < 1100 ? Math.round(w * 0.75 + 256) : 900;
const reduced = args.includes('--reduced');
const menuSel = opt('menu', null);
const asJson = args.includes('--json');

// Resolve Playwright from the project first (`playwright` or `@playwright/test`), then globally.
let chromium;
const req = createRequire(join(process.cwd(), 'package.json'));
for (const name of ['playwright', '@playwright/test']) {
  try {
    ({ chromium } = req(name));
    break;
  } catch {
    try {
      ({ chromium } = await import(name));
      break;
    } catch {
      // try the next one
    }
  }
}
if (!chromium) {
  console.error(
    '[inspect-render] Playwright not found. Install it: npm i -D playwright && npx playwright install chromium',
  );
  process.exit(2);
}

mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const report = { url, reduced, widths: {} };
let failed = false;

for (const width of widths) {
  const height = heightFor(width);
  const context = await browser.newContext({
    viewport: { width, height },
    reducedMotion: reduced ? 'reduce' : 'no-preference',
    hasTouch: width < 600,
    isMobile: width < 600,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)));
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  page.on('requestfailed', (r) => errors.push(`request failed: ${r.url().slice(0, 120)}`));
  await page.addInitScript(() => {
    window.__sbRaf = 0;
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => {
      window.__sbRaf++;
      return raf(cb);
    };
  });
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(2500);

  const shots = [];
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  let y = 0;
  let i = 0;
  await page.mouse.move(width / 2, height / 2);
  while (y < total && i < 60) {
    const file = join(out, `w${width}-${String(i).padStart(2, '0')}.png`);
    await page.screenshot({ path: file });
    shots.push(file);
    await page.mouse.wheel(0, height * 0.9);
    await page.waitForTimeout(500);
    const next = await page.evaluate(() => scrollY);
    if (next === y) break;
    y = next;
    i++;
  }

  const checks = await page.evaluate((phone) => {
    const doc = document.documentElement;
    const vw = doc.clientWidth;
    const overflow = [];
    const small = [];
    const tiny = [];
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      // Content inside a clipping ancestor (marquees, masks) doesn't overflow the page.
      let clipped = false;
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const o = getComputedStyle(p);
        if (/(hidden|clip)/.test(o.overflowX + o.overflow)) {
          clipped = true;
          break;
        }
      }
      if (!clipped && r.right > vw + 1)
        overflow.push(
          `${el.tagName.toLowerCase()}.${String(el.className?.baseVal ?? el.className).split(' ')[0]} → ${Math.round(r.right)}px`,
        );
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (own && Number.parseFloat(cs.fontSize) < 12 && el.closest('[aria-hidden="true"]') === null)
        tiny.push(
          `${el.tagName.toLowerCase()} ${cs.fontSize} "${el.textContent.trim().slice(0, 30)}"`,
        );
      if (
        phone &&
        el.matches('a[href], button, input, select, [role="button"]') &&
        (r.width < 44 || r.height < 44) &&
        cs.display !== 'inline'
      )
        small.push(
          `${el.tagName.toLowerCase()} ${Math.round(r.width)}×${Math.round(r.height)} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24)}"`,
        );
    }
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: vw,
      overflow: overflow.slice(0, 15),
      tinyText: tiny.slice(0, 15),
      smallTargets: small.slice(0, 20),
    };
  }, width < 600);

  const before = await page.evaluate(() => window.__sbRaf);
  await page.waitForTimeout(2000);
  const idleFrames = (await page.evaluate(() => window.__sbRaf)) - before;

  let menuShot = null;
  if (menuSel) {
    await page.evaluate(() => scrollTo(0, 0));
    const btn = page.locator(menuSel).first();
    if ((await btn.count()) && (await btn.isVisible())) {
      await btn.click();
      await page.waitForTimeout(1200);
      menuShot = join(out, `w${width}-menu.png`);
      await page.screenshot({ path: menuShot });
      await page.keyboard.press('Escape');
    }
  }

  const hasOverflow = checks.scrollWidth > checks.clientWidth;
  if (hasOverflow || errors.length) failed = true;
  report.widths[width] = {
    height,
    shots: shots.length,
    menuShot,
    ...checks,
    hasOverflow,
    idleFrames,
    errors: errors.slice(0, 10),
  };
  await context.close();
}
await browser.close();

if (asJson) console.log(JSON.stringify(report, null, 2));
else {
  console.log(`inspect-render ${url}${reduced ? ' (reduced motion)' : ''} → ${out}`);
  for (const [w, r] of Object.entries(report.widths)) {
    console.log(
      `\n${w}×${r.height}: ${r.shots} frames${r.menuShot ? ' + menu' : ''}, idle rAF/2s at page end: ${r.idleFrames}${r.idleFrames ? ' (fine only if something visibly animates, e.g. a marquee)' : ''}`,
    );
    console.log(
      `  overflow: ${r.hasOverflow ? `YES (${r.scrollWidth} > ${r.clientWidth})` : 'no'}`,
    );
    if (r.hasOverflow) for (const o of r.overflow) console.log(`    ${o}`);
    if (r.tinyText.length)
      console.log(
        `  text < 12px: ${r.tinyText.length}\n    ${r.tinyText.slice(0, 5).join('\n    ')}`,
      );
    if (r.smallTargets.length)
      console.log(
        `  targets < 44px: ${r.smallTargets.length}\n    ${r.smallTargets.slice(0, 6).join('\n    ')}`,
      );
    if (r.errors.length) console.log(`  console/network errors:\n    ${r.errors.join('\n    ')}`);
  }
  console.log('\nNow open the screenshots and answer the questions in references/visual-qa.md §3.');
}
process.exit(failed ? 1 : 0);
