import { test, expect } from '@playwright/test';
import { gotoHomeWithProfile } from '../helpers/navigation.js';
import { getVisibleSets } from '../helpers/app.js';

test.describe('Mastery Gating', () => {
  test.beforeEach(async ({ page }) => {
    await gotoHomeWithProfile(page);
  });

  test('first set always unlocked', async ({ page }) => {
    await expect(page.getByRole('button', { name: /▶|Começar/ }).first()).toBeVisible();
  });

  test('second set locked when first not mastered', async ({ page }) => {
    await expect(page.getByText('🔒').first()).toBeVisible();
  });

  test('mastery unlocks next set', async ({ page }) => {
    const sets = await getVisibleSets(page);
    if (sets.length < 2) return;
    // Set first set to mastery via reactive data
    await page.evaluate((title) => {
      const proxy = document.querySelector('#app').__vue_app__._instance.proxy;
      const set = proxy.sets.find(s => s.title === title);
      if (set) {
        set.status = 'mastery';
        set.attempts = 1;
        set.completed = true;
      }
      // Force LevelList to recalculate by bumping version
      proxy.loadedSetsVersion++;
    }, sets[0].title);
    await page.waitForTimeout(200);
    const startButtons = page.getByRole('button', { name: /▶|Começar/ });
    expect(await startButtons.count()).toBeGreaterThanOrEqual(2);
  });

  test('pass does NOT unlock next set', async ({ page }) => {
    const sets = await getVisibleSets(page);
    if (sets.length < 2) return;
    await page.evaluate((title) => {
      const proxy = document.querySelector('#app').__vue_app__._instance.proxy;
      const set = proxy.sets.find(s => s.title === title);
      if (set) {
        set.status = 'pass';
        set.attempts = 1;
      }
      proxy.loadedSetsVersion++;
    }, sets[0].title);
    await page.waitForTimeout(200);
    await expect(page.getByText('🔒').first()).toBeVisible();
  });
});
