import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

/** Scroll through the whole page so every lab lazy-loads and mounts. */
async function visitAll(page: Page) {
  for (const id of [
    '#lab-motion',
    '#lab-interaction',
    '#lab-space',
    '#lab-interface',
    '#lab-effects',
    '#system',
    '#start',
  ]) {
    await page.locator(id).scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
  }
}

test.describe('flagship', () => {
  test('desktop: pins the instrument, upgrades to WebGL, no console errors', async ({ page }) => {
    test.setTimeout(90_000);
    const errors = trackErrors(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.locator('[data-instrument]')).toHaveAttribute('data-mode', 'pinned');
    await expect(page.locator('[data-lattice]')).toHaveAttribute('data-render', 'webgl', {
      timeout: 20_000,
    });
    await expect(page.locator('[data-hero-ctas]')).toHaveCSS('opacity', '1');
    await visitAll(page);
    expect(errors).toEqual([]);
  });

  test('the clock drives chapters: scrolling to 40 % shows chapter 3 and its callouts', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.locator('[data-instrument]')).toHaveAttribute('data-mode', 'pinned');
    await page.evaluate(() => {
      const s = document.querySelector<HTMLElement>('[data-instrument]')!;
      window.scrollTo(0, s.offsetTop + (s.offsetHeight - innerHeight) * 0.42);
    });
    await expect(page.locator('.dim[data-dim="2"]')).toHaveAttribute('data-active', '', {
      timeout: 5000,
    });
    await expect(page.locator('[data-callout="0"]')).toHaveCSS('opacity', '1');
  });

  test('reduced motion: no pin, readable chapters with glyphs, static SVG lattice', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.locator('[data-instrument]')).not.toHaveAttribute('data-mode', 'pinned');
    await expect(page.locator('[data-lattice] svg')).toHaveCount(1);
    await expect(page.locator('.dim-glyph svg')).toHaveCount(6);
    await expect(page.locator('[data-hero-lede]')).toBeVisible();
    for (const d of await page.locator('.dim').all()) await expect(d).toBeVisible();
  });

  test('mobile 390 px: flow layout and no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await visitAll(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('no serious or critical axe violations', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await visitAll(page);
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(
      serious,
      JSON.stringify(
        serious.map((v) => [v.id, v.nodes.map((n) => n.target)]),
        null,
        2,
      ),
    ).toEqual([]);
  });

  test('motion lab: changing controls rewrites the code and scrubbing seeks the timeline', async ({
    page,
  }) => {
    await page.goto('/#lab-motion');
    const code = page.locator('[data-code="ml"]');
    await expect(code).toContainText("by: ['words']");
    await page.locator('#lab-motion label', { hasText: 'Chars' }).click();
    await expect(code).toContainText("by: ['chars']");
    await page.locator('[data-ml-scrub]').fill('0.5');
    await expect(page.locator('[data-ml-scrub-out]')).toHaveText('0.500');
  });

  test('interaction lab: hold-to-ship completes from the keyboard and rewinds when released early', async ({
    page,
  }) => {
    await page.goto('/#lab-interaction');
    const hold = page.locator('[data-ix-hold]');
    await hold.focus();
    await page.keyboard.down('Space');
    await page.waitForTimeout(300);
    await page.keyboard.up('Space');
    await expect(page.locator('[data-hold-status]')).toHaveText('Released early: rewound.');
    await page.keyboard.down('Space');
    await expect(page.locator('[data-hold-status]')).toContainText('Shipped', { timeout: 3000 });
    await page.keyboard.up('Space');
    await expect(hold).toHaveAttribute('data-done', 'true');
  });

  test('space lab: renders on demand and remounts cleanly', async ({ page }) => {
    test.setTimeout(120_000);
    const contextWarnings: string[] = [];
    page.on('console', (m) => {
      if (/WebGL context/i.test(m.text())) contextWarnings.push(m.text());
    });
    await page.goto('/#lab-space');
    const mode = page.locator('[data-sr="mode"]');
    await expect(mode).not.toHaveText('pending', { timeout: 20_000 });
    test.skip((await mode.textContent()) !== 'webgl', 'no WebGL in this browser');
    // Idle: the frame counter must stop moving.
    await page.waitForTimeout(1500);
    const a = await page.locator('[data-sr="frames"]').textContent();
    await page.waitForTimeout(1000);
    expect(await page.locator('[data-sr="frames"]').textContent()).toBe(a);
    for (let i = 0; i < 18; i++) {
      await page.locator('[data-space-remount]').click();
      await expect(page.locator('[data-space-host] canvas')).toHaveCount(1, { timeout: 15_000 });
    }
    await expect(page.locator('[data-space-log]')).toContainText('WebGL context released');
    expect(contextWarnings).toEqual([]);
  });

  test('interface lab: composer validates and composes real commands', async ({ page }) => {
    await page.goto('/#lab-interface');
    const form = page.locator('[data-compose]');
    await form.getByRole('button', { name: 'Compose' }).click();
    await expect(page.locator('#c-stack')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#c-stack')).toBeFocused();
    await page.locator('#c-stack').selectOption('react');
    await page.locator('#c-pm').selectOption('pnpm');
    await form.getByRole('button', { name: 'Compose' }).click();
    await expect(page.locator('[data-code="compose"]')).toContainText(
      'pnpm add @snowbros/core @snowbros/motion @snowbros/react',
    );
  });

  test('system map: selecting react lights its whole dependency closure', async ({ page }) => {
    await page.goto('/#system');
    await page.locator('[data-node="react"]').click();
    await expect(page.locator('[data-node="react"]')).toHaveAttribute('aria-pressed', 'true');
    for (const dep of ['core', 'motion', 'fx'])
      await expect(page.locator(`[data-node="${dep}"]`)).toHaveAttribute('data-on', 'true');
    await expect(page.locator('[data-node="scene"]')).toHaveAttribute('data-on', 'false');
    await expect(page.locator('[data-system-detail]')).toContainText('@snowbros/react');
  });

  test('menu: opens as a dialog, focuses the first entry, glyph answers hover, Escape restores focus', async ({
    page,
  }) => {
    await page.goto('/');
    const toggle = page.locator('[data-menu-toggle]');
    await toggle.click();
    const menu = page.locator('[data-menu]');
    await expect(menu).toHaveAttribute('data-open', 'true');
    await expect(page.locator('.menu-index a').first()).toBeFocused();
    await page.locator('.menu-index a[href="#system"]').hover();
    await expect(page.locator('[data-menu-glyph] svg')).toHaveClass(/has-focus/);
    await page.keyboard.press('Escape');
    await expect(menu).toHaveAttribute('data-open', 'false');
    await expect(toggle).toBeFocused();
    await toggle.click();
    await page.locator('.menu-index a[href="#labs"]').click();
    await expect(menu).toHaveAttribute('data-open', 'false');
    await expect(page).toHaveURL(/#labs$/);
  });

  test('labs orbit on desktop, plain row under reduced motion; redlines draw', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/#labs');
    await expect(page.locator('[data-orbit]')).toHaveAttribute('data-orbit', 'on');
    await expect(page.locator('[data-orbit-guide] ellipse')).toHaveCount(1);
    // Chips remain real links in document order.
    await expect(page.locator('.lab-index a').first()).toHaveAttribute('href', '#lab-motion');
    // Two pen passes per line; the italic may wrap onto two lines in orbit layout.
    expect(
      await page.locator('#labs-title [data-redline] svg path').count(),
    ).toBeGreaterThanOrEqual(2);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.locator('[data-orbit]')).not.toHaveAttribute('data-orbit', 'on');
  });

  test('internal links resolve (site + composed demos)', async ({ page, request }) => {
    await page.goto('/');
    const hrefs = await page.$$eval('a[href^="./"], a[href^="#"]', (as) =>
      as.map((a) => (a as HTMLAnchorElement).getAttribute('href')!),
    );
    for (const href of new Set(hrefs)) {
      if (href.startsWith('#')) {
        if (href.length > 1) expect(await page.locator(href).count(), href).toBe(1);
        continue;
      }
      const res = await request.get(
        new URL(href.split('#')[0]!, 'http://localhost:4174/').toString(),
      );
      expect(res.status(), href).toBe(200);
    }
  });
});
