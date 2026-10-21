# Testing recipes

Use the project's runner. If none exists for browser checks, propose `@playwright/test` (Apache-2.0)
and `@axe-core/playwright` (MPL-2.0, dev-only) — ask before adding.

## Unit (logic)

- Easing/spring/progress math, timeline seeking (forward _and_ backward), stagger distributions.
- DOM wiring in happy-dom/jsdom: listeners added/removed, styles restored on dispose, split-text accessibility attributes.
- Drive time deterministically: `ticker.useExternalClock()` then `ticker.tick(ms)` (`@snowbros/core`).

## Browser (Playwright)

```ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('home: accessible, reduced motion, no errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? '')),
  ).toEqual([]);
  expect(errors).toEqual([]);
});

test('pinned story: deterministic both directions', async ({ page }) => {
  await page.goto('/');
  const stage = page.locator('#story .stage');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(300);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await expect(stage).toHaveCSS('position', 'sticky');
});

test('no duplicate effects after client navigation', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Docs' }).click();
  await page.goBack();
  // assert one instance of injected nodes, e.g. a single cursor element
  await expect(page.locator('.sb-cursor')).toHaveCount(1);
});
```

**Long tasks during scroll**
```ts
const longTasks = await page.evaluate(async () => {
  const entries: number[] = [];
  new PerformanceObserver((l) => l.getEntries().forEach((e) => entries.push(e.duration))).observe({
    type: 'longtask',
    buffered: true,
  });
  for (let y = 0; y < document.body.scrollHeight; y += 200) {
    window.scrollTo(0, y);
    await new Promise(requestAnimationFrame);
  }
  return entries;
});
expect(longTasks.filter((d) => d > 50)).toEqual([]); // Chromium only
```

**Keyboard**
```ts
await page.keyboard.press('Tab');
await expect(page.locator(':focus-visible')).toBeVisible();
```

## Visual regression

- `await expect(page).toHaveScreenshot('hero.png', { animations: 'disabled', maxDiffPixelRatio: 0.01 })`.
- Make visuals deterministic: reduced motion or seeked timelines, seeded procedural noise, fixed fonts (wait for `document.fonts.ready`), mask live data/time.
- WebGL screenshots vary by GPU/driver: snapshot the fallback, or compare with a generous threshold on one pinned CI image.
- Capture both 1440×900 and 390×844.

## Checklist per changed interaction

- [ ] forward + reverse scroll
- [ ] resize / orientation
- [ ] route away and back
- [ ] reduced motion
- [ ] keyboard only
- [ ] touch emulation
- [ ] production build
- [ ] console clean
