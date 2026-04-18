import { test, expect } from '@playwright/test';
import { gotoHomeWithProfile } from '../helpers/navigation.js';

test.describe('Skill Tree (Themes mode)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoHomeWithProfile(page);
  });

  test('mode tabs visible under subject', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Campanha|Campaign/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Temas|Themes/ })).toBeVisible();
  });

  test('campaign is default mode', async ({ page }) => {
    await expect(page.locator('[data-level-card]').first()).toBeVisible();
  });

  test('switching to themes shows skill tree nodes', async ({ page }) => {
    await page.getByRole('button', { name: /Temas|Themes/ }).click();
    await page.waitForTimeout(100);
    await expect(page.getByText(/Counting|Contagem/).first()).toBeVisible();
  });

  test('every node is unlocked (no gating in themes mode)', async ({ page }) => {
    await page.getByRole('button', { name: /Temas|Themes/ }).click();
    await page.waitForTimeout(100);
    const nodeButtons = page.locator('button').filter({ hasText: /Counting|Contagem|Multiplication|Multiplicação|Division|Divisão|Fractions|Frações/ });
    const count = await nodeButtons.count();
    for (let i = 0; i < count; i++) {
      await expect(nodeButtons.nth(i)).toBeEnabled();
    }
  });

  test('no padlock icon renders in themes mode', async ({ page }) => {
    await page.getByRole('button', { name: /Temas|Themes/ }).click();
    await page.waitForTimeout(100);
    await expect(page.getByText('🔒', { exact: true })).toHaveCount(0);
  });

  test('downstream nodes (e.g. Multiplication) are enabled without prereqs', async ({ page }) => {
    await page.getByRole('button', { name: /Temas|Themes/ }).click();
    await page.waitForTimeout(100);
    const multBtn = page.getByRole('button').filter({ hasText: /Multiplication|Multiplicação/ }).first();
    await expect(multBtn).toBeEnabled();
  });

  test('clicking unlocked node reveals its sets', async ({ page }) => {
    await page.getByRole('button', { name: /Temas|Themes/ }).click();
    await page.waitForTimeout(100);
    const countingBtn = page.getByRole('button').filter({ hasText: /Counting|Contagem/ }).first();
    await countingBtn.click();
    await page.waitForTimeout(800);
    await expect(page.getByRole('button', { name: /▶|Começar/ }).first()).toBeVisible();
  });
});
