import { test, expect } from '@playwright/test';
import { gotoHomeWithProfile } from '../helpers/navigation.js';
import { DEFAULT_PROFILE } from '../helpers/storage.js';

test.describe('Profile and state persistence', () => {
  test.beforeEach(async ({ page }) => {
    await gotoHomeWithProfile(page);
  });

  test('profile creation persists across same-session navigation', async ({ page }) => {
    const profileId = await page.evaluate(() => localStorage.getItem('futon_active_profile'));
    await page.goto('/');
    await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 15000 }).catch(() => {});
    const profileIdAfter = await page.evaluate(() => localStorage.getItem('futon_active_profile'));
    expect(profileIdAfter).toBe(profileId);
    expect(profileIdAfter).not.toBeNull();
  });

  test('active profile name appears in header', async ({ page }) => {
    await expect(page.locator('header').getByRole('button', { name: /Test/ })).toBeVisible();
  });

  test('app reads active profile id from localStorage on load', async ({ page }) => {
    const profileId = await page.evaluate(() => localStorage.getItem('futon_active_profile'));
    expect(profileId).toBe(DEFAULT_PROFILE.id);
  });

  test('todaySets is a number in app data', async ({ page }) => {
    const todaySets = await page.evaluate(() => {
      return document.querySelector('#app').__vue_app__._instance.data.todaySets;
    });
    expect(typeof todaySets).toBe('number');
  });

  test('streak is a number in app data', async ({ page }) => {
    const streak = await page.evaluate(() => {
      return document.querySelector('#app').__vue_app__._instance.data.streak;
    });
    expect(typeof streak).toBe('number');
  });

  test('progress store loads existing todaySets on startup', async ({ page }) => {
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

  test('selected discipline persists to localStorage after clicking a tab', async ({ page }) => {
    await page.getByRole('button', { name: /🔢/ }).click();
    await page.waitForTimeout(300);
    const savedDiscipline = await page.evaluate(() => localStorage.getItem('futon_active_discipline'));
    expect(['math', 'portuguese', 'english', 'japanese', 'spanish']).toContain(savedDiscipline);
  });
});
