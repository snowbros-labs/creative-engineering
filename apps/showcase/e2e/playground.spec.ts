import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

const PATTERNS = [
  'easing',
  'text-reveal',
  'stagger',
  'spring',
  'magnetic',
  'scramble',
  'flow-field',
  'path-draw',
  '3d',
  'scroll-scrub',
];

/** Collect console errors and uncaught exceptions for the whole test. */
function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !/favicon/.test(msg.text())) errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

test.describe('playground', () => {
  test('has no serious or critical axe violations', async ({ page }) => {
    await page.goto('/playground.html');
    await expect(page.locator('#pg-stage-body > *')).toHaveCount(1);
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(
      serious,
      JSON.stringify(
        serious.map((v) => [v.id, v.nodes.length]),
        null,
        2,
      ),
    ).toEqual([]);
  });

  test('every pattern mounts and renders without errors', async ({ page }) => {
    test.setTimeout(90_000);
    const errors = trackErrors(page);
    await page.goto('/playground.html');
    for (const id of PATTERNS) {
      await page.locator(`#pg-tab-${id}`).click();
      await expect(page.locator(`#pg-tab-${id}`)).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('#pg-stage-body > *')).toHaveCount(1);
      await expect(page.locator('#pg-lifecycle')).toContainText(id);
      await expect(page.locator('#pg-code')).toContainText('@snowbros/');
      await page.waitForTimeout(300);
    }
    expect(errors).toEqual([]);
  });

  test('3D stage renders WebGL or an explained fallback, and disposes on switch', async ({
    page,
  }) => {
    test.setTimeout(90_000); // software WebGL in headless CI is slow to compile shaders
    const errors = trackErrors(page);
    await page.goto('/playground.html#pattern=3d');
    const host = page.locator('.pg-three');
    await expect(host).toHaveAttribute('data-sb-render', /3d|fallback/);
    if ((await host.getAttribute('data-sb-render')) === '3d') {
      await expect(host.locator('canvas')).toHaveCount(1);
      await page.locator('#pg-tab-easing').click();
      await expect(page.locator('#pg-lifecycle')).toContainText('disposed stage');
      await expect(page.locator('canvas')).toHaveCount(0);
    } else {
      await expect(host.locator('.pg-fallback')).toBeVisible();
    }
    expect(errors).toEqual([]);
  });

  // Regression: createStage used to leave WebGL contexts alive after dispose, so the browser
  // evicted the oldest one ("Too many active WebGL contexts") after ~16 mounts.
  test('repeated 3D mounts release their WebGL contexts', async ({ page }) => {
    test.setTimeout(240_000);
    const contextWarnings: string[] = [];
    page.on('console', (msg) => {
      if (/WebGL context/i.test(msg.text())) contextWarnings.push(msg.text());
    });
    await page.goto('/playground.html#pattern=3d');
    const host = page.locator('.pg-three');
    await expect(host).toHaveAttribute('data-sb-render', /3d|fallback/);
    test.skip((await host.getAttribute('data-sb-render')) !== '3d', 'no WebGL in this browser');
    // Chrome keeps at most 16 live contexts; 18 mounts would evict one if any leaked.
    for (let i = 0; i < 18; i++) {
      await page.locator('#pg-tab-easing').click();
      await expect(page.locator('canvas')).toHaveCount(0);
      await page.locator('#pg-tab-3d').click();
      await expect(page.locator('.pg-three canvas')).toHaveCount(1);
    }
    expect(contextWarnings).toEqual([]);
  });

  test('hash deep-link selects a pattern', async ({ page }) => {
    await page.goto('/playground.html#pattern=scramble');
    await expect(page.locator('#pg-tab-scramble')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#pg-pattern-title')).toHaveText('Scramble');
  });

  test('arrow keys move between tabs (roving tabindex)', async ({ page }) => {
    await page.goto('/playground.html');
    await page.locator('#pg-tab-easing').focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('#pg-tab-text-reveal')).toBeFocused();
    await expect(page.locator('#pg-tab-text-reveal')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#pg-tab-text-reveal')).toHaveAttribute('tabindex', '0');
    await page.keyboard.press('End');
    await expect(page.locator('#pg-tab-scroll-scrub')).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('#pg-tab-easing')).toBeFocused();
    await expect(page).toHaveURL(/#pattern=easing/);
  });

  test('changing a control rebuilds and updates the snippet', async ({ page }) => {
    await page.goto('/playground.html#pattern=stagger');
    await page.locator('#pg-c-stagger-from').selectOption('end');
    await expect(page.locator('#pg-code')).toContainText("from: 'end'");
  });

  test('copy button announces the result', async ({ page, context, browserName }) => {
    if (browserName === 'chromium')
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/playground.html');
    await page.locator('#pg-copy').click();
    await expect(page.locator('#pg-status')).toHaveText(/Copied|Copy failed/);
  });

  test('no horizontal overflow at 390px', async ({ page }) => {
    test.setTimeout(90_000); // mounts the 3D pattern: slow on headless SwiftShader
    await page.setViewportSize({ width: 390, height: 844 });
    for (const id of ['easing', '3d', 'scroll-scrub']) {
      await page.goto(`/playground.html#pattern=${id}`);
      await page.waitForTimeout(300);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, id).toBeLessThanOrEqual(0);
    }
  });

  test('reduced motion shows the banner and uses the 3D fallback', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/playground.html#pattern=3d');
    await expect(page.locator('#pg-banner')).toBeVisible();
    await expect(page.locator('.pg-three')).toHaveAttribute('data-sb-render', 'fallback');
    await expect(page.locator('.pg-fallback')).toContainText('reduced-motion');
  });
});
