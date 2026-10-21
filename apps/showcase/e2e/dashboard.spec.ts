import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

const REGISTRY = '**/registry.npmjs.org/**';

async function open(page: Page) {
  // Never hit the real registry from tests.
  await page.route(REGISTRY, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        'dist-tags': { latest: '9.9.9' },
        time: { '9.9.9': '2026-09-06T02:44:30.000Z' },
      }),
    }),
  );
  await page.goto('/dashboard.html');
  await expect(page.locator('[data-pkg-body] tr')).toHaveCount(8);
}

const rowNames = (page: Page) =>
  page
    .locator('[data-pkg-body] tr:not([hidden])')
    .evaluateAll((rows) => rows.map((r) => (r as HTMLElement).dataset.pkg));

test.describe('Toolkit Ops dashboard', () => {
  test('has no serious or critical axe violations', async ({ page }) => {
    await open(page);
    const results = await new AxeBuilder({ page }).analyze();
    const severe = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(
      severe,
      JSON.stringify(
        severe.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
        null,
        2,
      ),
    ).toEqual([]);
  });

  test('sorting reorders rows and sets aria-sort', async ({ page }) => {
    await open(page);
    const th = page.locator('th[data-sort-key="tests"]');
    await th.getByRole('button').click();
    await expect(th).toHaveAttribute('aria-sort', 'ascending');
    expect((await rowNames(page))[0]).toBe('tokens'); // no tests sorts first ascending
    await th.getByRole('button').click();
    await expect(th).toHaveAttribute('aria-sort', 'descending');
    expect((await rowNames(page))[0]).toBe('core');
    await expect(page.locator('th[data-sort-key="name"]')).toHaveAttribute('aria-sort', 'none');
  });

  test('filtering shows an empty state that can be reset', async ({ page }) => {
    await open(page);
    const filter = page.getByLabel('Filter packages');
    await filter.fill('scene');
    await expect(page.locator('[data-result-count]')).toHaveText('1 package');
    await filter.fill('zzz-nothing');
    await expect(page.locator('[data-empty]')).toBeVisible();
    await expect(page.locator('[data-result-count]')).toHaveText('0 packages');
    await page.getByRole('button', { name: 'Reset filters' }).click();
    await expect(page.locator('[data-empty]')).toBeHidden();
    await expect(page.locator('[data-result-count]')).toHaveText('8 packages');
    await expect(filter).toBeFocused();
  });

  test('status segmented control filters and supports arrow keys', async ({ page }) => {
    await open(page);
    await page.getByRole('radio', { name: 'Stable' }).check();
    expect(await rowNames(page)).toEqual(['tokens']);
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('radio', { name: 'Beta' })).toBeChecked();
    await expect(page.getByRole('radio', { name: 'Beta' })).toBeFocused();
  });

  test('command palette: opens with shortcut, filters, runs on Enter, Escape restores focus', async ({
    page,
  }) => {
    await open(page);
    const filter = page.getByLabel('Filter packages');
    await filter.focus();
    await page.keyboard.press('ControlOrMeta+k');
    const dialog = page.getByRole('dialog', { name: 'Command palette' });
    await expect(dialog).toBeVisible();
    const input = dialog.getByRole('combobox');
    await expect(input).toBeFocused();
    await input.fill('sort tests');
    await expect(dialog.getByRole('option').first()).toHaveText(/Sort packages by tests/);
    await expect(input).toHaveAttribute('aria-activedescendant', 'pal-sort-tests');
    await page.keyboard.press('Enter');
    await expect(dialog).toBeHidden();
    await expect(page.locator('th[data-sort-key="tests"]')).toHaveAttribute(
      'aria-sort',
      'descending',
    );

    await page.keyboard.press('ControlOrMeta+k');
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(input).toBeFocused(); // focus stays trapped
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(filter).toBeFocused();
  });

  test('settings validation marks invalid fields and keeps input', async ({ page }) => {
    await open(page);
    const budget = page.getByLabel('Frame budget');
    await budget.fill('99');
    await page.getByLabel(/Notification email/).fill('not-an-email');
    await page.getByRole('button', { name: 'Save settings' }).click();
    await expect(budget).toHaveAttribute('aria-invalid', 'true');
    await expect(budget).toBeFocused();
    await expect(page.locator('#set-budget-error')).toContainText('between 4 and 50');
    await expect(page.getByLabel(/Notification email/)).toHaveAttribute('aria-invalid', 'true');
    await expect(budget).toHaveValue('99');
    await budget.fill('20');
    await page.getByLabel(/Notification email/).fill('');
    await page.getByRole('button', { name: 'Save settings' }).click();
    await expect(budget).not.toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('.ops-toast').first()).toContainText('Settings saved');
  });

  test('reduce-motion switch toggles the site preference', async ({ page }) => {
    await open(page);
    const sw = page.getByRole('switch', { name: 'Reduce motion' });
    await sw.click();
    await expect(sw).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('.ops-caps')).toContainText('reduced');
  });

  test('registry check shows success, and error with retry', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Check npm registry' }).click();
    await expect(page.locator('[data-registry-state]')).toHaveAttribute(
      'data-registry-state',
      'success',
    );
    await expect(page.locator('[data-registry-version]')).toHaveText('9.9.9');

    await page.unroute(REGISTRY);
    await page.route(REGISTRY, (route) => route.fulfill({ status: 503, body: 'down' }));
    await page.getByRole('button', { name: 'Check npm registry' }).click();
    await expect(page.locator('[data-registry-state]')).toHaveAttribute(
      'data-registry-state',
      'error',
    );
    await expect(page.getByRole('alert')).toContainText('503');
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  });

  test('frame sampling produces live readouts and can be paused', async ({ page }) => {
    await open(page);
    await page.locator('#performance').scrollIntoViewIfNeeded();
    await expect(page.locator('[data-readout="p95"]')).not.toHaveText('—', { timeout: 5000 });
    await page.getByRole('button', { name: 'Pause sampling' }).click();
    await expect(page.locator('[data-readout="state"]')).toHaveText('paused');
  });

  test('works at 390px without horizontal overflow; menu opens and closes', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page);
    const overflow = await page.evaluate(
      () => document.scrollingElement!.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const toggle = page.locator('[data-menu-toggle]');
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(page.locator('#menu')).toHaveAttribute('data-open', 'true');
    await page.keyboard.press('Escape');
    await expect(page.locator('#menu')).toHaveAttribute('data-open', 'false');
    await expect(toggle).toBeFocused();
  });

  test('stays functional with reduced motion emulated', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await open(page);
    await expect(page.getByRole('switch', { name: 'Reduce motion' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await page.getByLabel('Filter packages').fill('react');
    await expect(page.locator('[data-result-count]')).toHaveText('1 package');
    await page.keyboard.press('ControlOrMeta+k');
    await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
  });
});
