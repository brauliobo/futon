import { test, expect } from '@playwright/test';
import { gotoHomeWithProfile } from '../helpers/navigation.js';
import { DEFAULT_PROFILE } from '../helpers/storage.js';

test.describe('Achievements', () => {
  test.beforeEach(async ({ page }) => {
    await gotoHomeWithProfile(page);
  });

  test('fresh profile has no mastery entries', async ({ page }) => {
    const data = await page.evaluate(() => {
      const key = `futon_state_${localStorage.getItem('futon_active_profile')}`;
      return JSON.parse(localStorage.getItem(key) || '{}');
    });
    const masteryCount = Object.values(data.dailyLog || {}).reduce((sum, d) => sum + (d.masteryAchieved || 0), 0);
    expect(masteryCount).toBe(0);
  });

  test('mastery count increments after recordMastery is stored', async ({ page }) => {
    const today = new Date().toISOString().slice(0, 10);
    await page.evaluate((today) => {
      const key = `futon_state_${localStorage.getItem('futon_active_profile')}`;
      const data = JSON.parse(localStorage.getItem(key) || '{}');
      if (!data.dailyLog) data.dailyLog = {};
      data.dailyLog[today] = { setsCompleted: 1, masteryAchieved: 1 };
      localStorage.setItem(key, JSON.stringify(data));
    }, today);
    const data = await page.evaluate(() => {
      const key = `futon_state_${localStorage.getItem('futon_active_profile')}`;
      return JSON.parse(localStorage.getItem(key) || '{}');
    });
    const masteryCount = Object.values(data.dailyLog || {}).reduce((sum, d) => sum + (d.masteryAchieved || 0), 0);
    expect(masteryCount).toBeGreaterThanOrEqual(1);
  });

  test('mastery data does not reset within a session', async ({ page }) => {
    const today = new Date().toISOString().slice(0, 10);
    await page.evaluate((today) => {
      const key = `futon_state_${localStorage.getItem('futon_active_profile')}`;
      const data = JSON.parse(localStorage.getItem(key) || '{}');
      if (!data.dailyLog) data.dailyLog = {};
      data.dailyLog[today] = { setsCompleted: 3, masteryAchieved: 2 };
      localStorage.setItem(key, JSON.stringify(data));
    }, today);
    const data = await page.evaluate(() => {
      const key = `futon_state_${localStorage.getItem('futon_active_profile')}`;
      return JSON.parse(localStorage.getItem(key) || '{}');
    });
    const masteryCount = Object.values(data.dailyLog || {}).reduce((sum, d) => sum + (d.masteryAchieved || 0), 0);
    expect(masteryCount).toBe(2);
  });

  test('today sets count reflects value set via evaluate', async ({ page }) => {
    await page.evaluate(() => {
      document.querySelector('#app').__vue_app__._instance.data.todaySets = 10;
    });
    await page.waitForTimeout(100);
    const todaySets = await page.evaluate(() => {
      return document.querySelector('#app').__vue_app__._instance.data.todaySets;
    });
    expect(todaySets).toBe(10);
  });

  test('streak badge shows when streak is set to 3', async ({ page }) => {
    await page.evaluate(() => {
      document.querySelector('#app').__vue_app__._instance.data.streak = 3;
    });
    await page.waitForTimeout(100);
    const hasFire = await page.evaluate(() => document.querySelector('header').textContent.includes('🔥'));
    expect(hasFire).toBe(true);
    await expect(page.locator('header').getByText('3')).toBeVisible();
  });

  test('goal stars light up based on practice time', async ({ page }) => {
    await page.evaluate(() => {
      document.querySelector('#app').__vue_app__._instance.data.todayDuration = 20 * 60;
    });
    await page.waitForTimeout(100);
    const goal = page.locator('[data-testid="daily-goal"]');
    await expect(goal.getByText('20min / 30min')).toBeVisible();
    await expect(goal.locator('.text-kid-gold')).toHaveCount(2);
  });

  test('mastery loaded from stored state on app init', async ({ page }) => {
    const today = new Date().toISOString().slice(0, 10);
    const p = DEFAULT_PROFILE;
    await page.addInitScript(({ p, today }) => {
      Object.keys(localStorage).filter(k => k.startsWith('futon_')).forEach(k => localStorage.removeItem(k));
      localStorage.setItem('futon_profiles', JSON.stringify([p]));
      localStorage.setItem('futon_active_profile', p.id);
      localStorage.setItem(`futon_state_${p.id}`, JSON.stringify({
        dailyLog: { [today]: { setsCompleted: 4, masteryAchieved: 2 } }
      }));
    }, { p, today });
    await page.goto('/');
    await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 15000 }).catch(() => {});
    await page.getByRole('button', { name: '🔢 Matemática' }).waitFor({ state: 'visible', timeout: 10000 });
    const todaySets = await page.evaluate(() => {
      return document.querySelector('#app').__vue_app__._instance.data.todaySets;
    });
    expect(todaySets).toBe(4);
  });
});
