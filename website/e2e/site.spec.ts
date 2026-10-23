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

const frostAwake = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { __frost?: { awake(): boolean } }).__frost?.awake() ?? null,
  );

test.describe('studio home', () => {
  test('renders the work statically and has no console errors', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Software that holds its shape.' }),
    ).toBeVisible();
    await expect(page.locator('.case-name')).toHaveCount(6);
    await expect(page.locator('html')).toHaveClass(/frost-on/);
    for (const id of ['#studio', '#work', '#build', '#contact']) {
      await page.locator(id).scrollIntoViewIfNeeded();
      await page.waitForTimeout(250);
    }
    expect(errors).toEqual([]);
  });

  test('content is complete without JavaScript', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.locator('.case-name')).toHaveCount(6);
    await page.goto('/#case-amr');
    await expect(page.locator('#case-amr')).toBeVisible();
    await context.close();
  });

  test('frost thaws along a swept path and goes back to sleep', async ({ page }) => {
    await page.goto('/');
    await expect.poll(() => frostAwake(page), { timeout: 15_000 }).toBe(false);
    await page.mouse.move(40, 300);
    await page.mouse.move(1200, 320, { steps: 4 });
    await expect.poll(() => frostAwake(page)).toBe(true);
    await expect.poll(() => frostAwake(page), { timeout: 15_000 }).toBe(false);
  });

  test('case study opens, moves to the next, closes with Escape, restores focus and history', async ({
    page,
  }) => {
    const errors = trackErrors(page);
    await page.goto('/');
    const open = page.locator('[data-case-open="nova"]').first();
    await open.click();
    await expect(page.locator('.case-dialog')).toHaveAttribute('open', '');
    await expect(page).toHaveURL(/#case-nova$/);
    await page.locator('.case-dialog [data-case-open]').click();
    await expect(page).toHaveURL(/#case-accounic$/);
    await page.keyboard.press('Escape');
    await expect(page.locator('.case-dialog')).not.toHaveAttribute('open', '');
    await expect(open).toBeFocused();
    expect(errors).toEqual([]);
  });

  test('reduced motion: field draws once and stays asleep under input', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('/');
    await page.mouse.move(40, 300);
    await page.mouse.move(1200, 320, { steps: 4 });
    await expect.poll(() => frostAwake(page), { timeout: 10_000 }).toBe(false);
    await context.close();
  });

  test('accessibility: no serious or critical axe violations', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page }).analyze();
    const bad = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(bad.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });
});

test.describe('phone', () => {
  test.use({ viewport: { width: 360, height: 780 }, hasTouch: true, isMobile: true });

  test('no horizontal overflow and the menu navigates', async ({ page }) => {
    await page.goto('/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      360,
    );
    await page.getByRole('button', { name: 'Menu' }).click();
    await expect(page.locator('[data-menu]')).toHaveAttribute('open', '');
    await page.locator('[data-menu-link][href="#work"]').click();
    await expect(page.locator('[data-menu]')).not.toHaveAttribute('open', '');
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(400);
  });

  test('lab has no horizontal overflow', async ({ page }) => {
    await page.goto('/lab.html');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      360,
    );
  });
});

test.describe('lab', () => {
  test('benches mount on approach without console errors', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/lab.html');
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
    await expect(page.locator('[data-ml-text]')).toBeVisible();
    await expect(page.locator('[data-sr="mode"]')).not.toHaveText('pending', { timeout: 20_000 });
    expect(errors).toEqual([]);
  });

  test('accessibility: no serious or critical axe violations', async ({ page }) => {
    await page.goto('/lab.html');
    const results = await new AxeBuilder({ page }).analyze();
    const bad = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(bad.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });
});

test.describe('founder', () => {
  test('loads, prints its output, links the portfolio, no console errors', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/founder.html');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Ved Chauhan builds three kinds of things.' }),
    ).toBeVisible();
    await page.locator('[data-println]').scrollIntoViewIfNeeded();
    await expect(page.locator('[data-println]')).toHaveClass(/is-done/, { timeout: 10_000 });
    await expect(page.locator('a[href="https://ved.exe.snowbros.me"]').first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('accessibility: no serious or critical axe violations', async ({ page }) => {
    await page.goto('/founder.html');
    const results = await new AxeBuilder({ page }).analyze();
    const bad = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(bad.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });
});

test.describe('controls', () => {
  test('dropdown: keyboard opens, moves, picks, and writes the native select', async ({ page }) => {
    await page.goto('/#contact');
    const trigger = page.locator('#b-timeline').locator('xpath=..').locator('.dd-trigger');
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#b-timeline')).toHaveValue('in one to three months');
    await expect(trigger).toBeFocused();
  });

  test('brief form validates, then sends through /api/contact', async ({ page }) => {
    await page.route('**/api/contact', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }),
    );
    await page.goto('/#contact');
    await page.locator('[data-brief-send]').click();
    await expect(page.locator('[data-brief-status]')).toHaveText('Tell us your name.');
    await expect(page.locator('#b-name')).toBeFocused();
    await page.fill('#b-name', 'Test Person');
    await page.fill('#b-email', 'test@example.com');
    await page.fill('#b-message', 'It has to work offline and in two currencies.');
    await page.locator('[data-brief-send]').click();
    await expect(page.locator('[data-brief-status]')).toHaveText(
      'Sent. We will reply to test@example.com.',
    );
  });
});
