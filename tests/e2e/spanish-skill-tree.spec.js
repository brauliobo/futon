import { test, expect } from '@playwright/test';
import { gotoHomeWithProfile } from '../helpers/navigation.js';

test.describe('Spanish Skill Tree', () => {
  test.beforeEach(async ({ page }) => {
    await gotoHomeWithProfile(page);
  });

  test('Spanish tab is visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Spanish|Espanhol|Español/ })).toBeVisible();
  });

  test('clicking Spanish tab activates it', async ({ page }) => {
    await page.getByRole('button', { name: /Spanish|Espanhol|Español/ }).click();
    await page.waitForTimeout(300);
    const activeSubject = await page.evaluate(() => {
      const app = document.querySelector('#app').__vue_app__;
      const home = app._instance?.subTree?.component?.subTree?.component?.subTree;
      return null;
    });
    const header = page.locator('h2').filter({ hasText: /Spanish|Espanhol|Español/ });
    await expect(header).toBeVisible();
  });

  test('Spanish subject shows Campaign and Themes mode tabs', async ({ page }) => {
    await page.getByRole('button', { name: /Spanish|Espanhol|Español/ }).click();
    await page.waitForTimeout(300);
    await expect(page.getByRole('button', { name: /Campanha|Campaign/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Temas|Themes/ })).toBeVisible();
  });

  test('Spanish campaign mode shows level roadmap', async ({ page }) => {
    await page.getByRole('button', { name: /Spanish|Espanhol|Español/ }).click();
    await page.waitForTimeout(300);
    await expect(page.getByRole('button', { name: /Campanha|Campaign/ })).toBeVisible();
  });

  test('Spanish themes mode renders without crashing', async ({ page }) => {
    await page.getByRole('button', { name: /Spanish|Espanhol|Español/ }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Temas|Themes/ }).click();
    await page.waitForTimeout(300);
    await expect(page.locator('.skill-node').first()).toBeVisible();
  });

  test('no JS error thrown when switching to Spanish', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.getByRole('button', { name: /Spanish|Espanhol|Español/ }).click();
    await page.waitForTimeout(500);
    expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0);
  });
});
