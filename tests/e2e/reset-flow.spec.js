import { test, expect } from '@playwright/test';
import { gotoHomeWithProfile, startFirstSet } from '../helpers/navigation.js';
import { completeEntireSetCorrectly } from '../helpers/exercises.js';

test.describe('Reset Flow', () => {
  test.setTimeout(120000);
  test('reset clears answers and returns to page 1', async ({ page }) => {
    await gotoHomeWithProfile(page);
    await startFirstSet(page);
    await completeEntireSetCorrectly(page);
    await expect(page.locator('[data-testid="results"]')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Reiniciar/ }).click();
    await page.getByRole('button', { name: /restart|reiniciar/i }).click();
    await page.waitForTimeout(100);
    expect(page.url()).toMatch(/\/p\/1/);
    await expect(page.locator('[data-testid="results"]')).not.toBeVisible();
  });

  test('timer restarts on reset', async ({ page }) => {
    await gotoHomeWithProfile(page);
    await startFirstSet(page);
    await completeEntireSetCorrectly(page);
    await expect(page.locator('[data-testid="results"]')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Reiniciar/ }).click();
    await page.getByRole('button', { name: /restart|reiniciar/i }).click();
    await page.waitForTimeout(100);
    await expect(page.getByText('0:0')).toBeVisible();
  });

  test('timer resets when resuming on a later day', async ({ page }) => {
    await gotoHomeWithProfile(page);
    await page.evaluate(() => {
      const app = document.querySelector('#app').__vue_app__._instance.proxy;
      const set = app.sets[0];
      const key = `futon_state_${localStorage.getItem('futon_active_profile')}`;
      const data = JSON.parse(localStorage.getItem(key) || '{}');
      data.timers = { ...(data.timers || {}), [set.title]: Date.now() - 36 * 60 * 60 * 1000 };
      localStorage.setItem(key, JSON.stringify(data));
    });
    await startFirstSet(page);
    await expect(page.getByText('0:0')).toBeVisible();
  });
});
