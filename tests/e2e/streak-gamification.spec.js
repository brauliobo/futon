import { test, expect } from '@playwright/test';
import { gotoHomeWithProfile } from '../helpers/navigation.js';

test.describe('Streak Gamification', () => {
  test('streak badge shows when > 1 day', async ({ page }) => {
    await gotoHomeWithProfile(page);
    await page.evaluate(() => {
      document.querySelector('#app').__vue_app__._instance.data.streak = 3;
    });
    await page.waitForTimeout(100);
    const hasFire = await page.evaluate(() => document.querySelector('header').textContent.includes('🔥'));
    expect(hasFire).toBe(true);
  });

  test('no streak badge when fresh profile', async ({ page }) => {
    await gotoHomeWithProfile(page);
    const hasFire = await page.evaluate(() => document.querySelector('header').textContent.includes('🔥'));
    expect(hasFire).toBe(false);
  });

  test('daily goal reflects activity count', async ({ page }) => {
    await gotoHomeWithProfile(page);
    await page.evaluate(() => {
      document.querySelector('#app').__vue_app__._instance.data.todaySets = 2;
    });
    await page.waitForTimeout(100);
    await expect(page.locator('[data-testid="daily-goal"]').getByText('2/3')).toBeVisible();
  });
});
