import { test, expect } from '@playwright/test';
import { gotoHomeWithProfile } from '../helpers/navigation.js';
import { injectSetStatus } from '../helpers/app.js';

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
    await expect(page.getByText('Counting').first()).toBeVisible();
  });

  test('first node unlocked, downstream nodes locked', async ({ page }) => {
    await page.getByRole('button', { name: /Temas|Themes/ }).click();
    await page.waitForTimeout(100);
    // Counting is the first node — no prereqs, should be enabled
    const countingBtn = page.getByRole('button').filter({ hasText: /^.*Counting.*0\/20/ }).first();
    await expect(countingBtn).toBeEnabled();
    // Multiplication requires prereqs — should be disabled
    const multBtn = page.getByRole('button').filter({ hasText: /Multiplication.*Precisa/ }).first();
    await expect(multBtn).toBeDisabled();
  });

  test('clicking unlocked node reveals its sets', async ({ page }) => {
    await page.getByRole('button', { name: /Temas|Themes/ }).click();
    await page.waitForTimeout(100);
    const countingBtn = page.getByRole('button').filter({ hasText: /^.*Counting.*0\/20/ }).first();
    await countingBtn.click();
    await page.waitForTimeout(800);
    // SetCard should appear (via LevelList)
    await expect(page.getByRole('button', { name: /▶|Começar/ }).first()).toBeVisible();
  });
});
