import { test, expect } from '@playwright/test';
import { gotoHomeWithProfile, selectSubject, waitForLoading } from '../helpers/navigation.js';
import { getVisibleSets } from '../helpers/app.js';

test.describe('Home Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await gotoHomeWithProfile(page);
  });

  test('displays subject tabs', async ({ page }) => {
    await expect(page.getByRole('button', { name: '🔢 Matemática' })).toBeVisible();
    await expect(page.getByRole('button', { name: '📖 Português' })).toBeVisible();
    await expect(page.getByRole('button', { name: '🌍 Inglês' })).toBeVisible();
  });

  test('clicking tab switches subject', async ({ page }) => {
    await selectSubject(page, 'Português');
    await expect(page.locator('[data-level-card]').first()).toBeVisible();
  });

  test('level roadmap cards are clickable', async ({ page }) => {
    const firstCard = page.locator('[data-level-card]').first();
    await firstCard.click();
    await waitForLoading(page);
    await expect(page.getByRole('button', { name: /▶|Começar|↺|Reiniciar/ }).first()).toBeVisible();
  });

  test('daily goal widget visible with counter', async ({ page }) => {
    const goal = page.locator('[data-testid="daily-goal"]');
    await expect(goal).toBeVisible();
    await expect(goal.getByText('0min / 30min')).toBeVisible();
  });

  test('daily goal reflects injected activity', async ({ page }) => {
    await page.evaluate(() => {
      document.querySelector('#app').__vue_app__._instance.data.todayDuration = 20 * 60;
    });
    await page.waitForTimeout(100);
    const goal = page.locator('[data-testid="daily-goal"]');
    await expect(goal.getByText('20min / 30min')).toBeVisible();
    await expect(goal.locator('.text-kid-gold')).toHaveCount(2);
  });

  test('set cards show star ratings from status', async ({ page }) => {
    const sets = await getVisibleSets(page);
    if (sets.length > 0) {
      await page.evaluate((title) => {
        const proxy = document.querySelector('#app').__vue_app__._instance.proxy;
        const set = proxy.sets.find(s => s.title === title);
        if (set) { set.status = 'mastery'; set.attempts = 1; set.completed = true; }
        proxy.loadedSetsVersion++;
      }, sets[0].title);
      await page.waitForTimeout(200);
      const goldStars = page.locator('.text-kid-gold');
      expect(await goldStars.count()).toBeGreaterThanOrEqual(3);
    }
  });

  test('URL hash updates on subject and level change', async ({ page }) => {
    await selectSubject(page, 'Português');
    const firstLevel = page.locator('[data-level-card]').first();
    const levelName = await firstLevel.getAttribute('data-level-card');
    await firstLevel.click();
    await waitForLoading(page);
    expect(page.url()).toContain(`#portuguese-${levelName}`);
  });
});
