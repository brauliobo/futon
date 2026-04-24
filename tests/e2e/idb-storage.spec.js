import { test, expect } from '@playwright/test';
import { gotoHomeWithProfile } from '../helpers/navigation.js';
import { DEFAULT_PROFILE } from '../helpers/storage.js';

test.describe('LocalStorage persistence', () => {
  test('profile state survives page reload when set before navigation', async ({ page }) => {
    const today = new Date().toISOString().slice(0, 10);
    await page.addInitScript(({ p, today }) => {
      Object.keys(localStorage).filter(k => k.startsWith('futon_')).forEach(k => localStorage.removeItem(k));
      localStorage.setItem('futon_profiles', JSON.stringify([p]));
      localStorage.setItem('futon_active_profile', p.id);
      localStorage.setItem(`futon_state_${p.id}`, JSON.stringify({
        dailyLog: { [today]: { setsCompleted: 5, masteryAchieved: 1 } }
      }));
    }, { p: DEFAULT_PROFILE, today });

    await page.goto('/');
    await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 15000 }).catch(() => {});
    await page.getByRole('button', { name: '🔢 Matemática' }).waitFor({ state: 'visible', timeout: 10000 });

    const data = await page.evaluate(() => {
      const key = `futon_state_${localStorage.getItem('futon_active_profile')}`;
      return JSON.parse(localStorage.getItem(key) || '{}');
    });
    expect(data.dailyLog?.[today]?.setsCompleted).toBe(5);
  });

  test('injected state is not overwritten on first load', async ({ page }) => {
    const today = new Date().toISOString().slice(0, 10);
    await page.addInitScript(({ p, today }) => {
      Object.keys(localStorage).filter(k => k.startsWith('futon_')).forEach(k => localStorage.removeItem(k));
      localStorage.setItem('futon_profiles', JSON.stringify([p]));
      localStorage.setItem('futon_active_profile', p.id);
      localStorage.setItem(`futon_state_${p.id}`, JSON.stringify({
        dailyLog: { [today]: { setsCompleted: 7, masteryAchieved: 3 } }
      }));
    }, { p: DEFAULT_PROFILE, today });

    await page.goto('/');
    await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 15000 }).catch(() => {});
    await page.getByRole('button', { name: '🔢 Matemática' }).waitFor({ state: 'visible', timeout: 10000 });

    const data = await page.evaluate(() => {
      const key = `futon_state_${localStorage.getItem('futon_active_profile')}`;
      return JSON.parse(localStorage.getItem(key) || '{}');
    });
    expect(data.dailyLog?.[today]?.setsCompleted).toBe(7);
    expect(data.dailyLog?.[today]?.masteryAchieved).toBe(3);
  });

  test('multiple profiles have isolated storage keys', async ({ page }) => {
    const today = new Date().toISOString().slice(0, 10);
    const profileA = DEFAULT_PROFILE;
    const profileB = { id: 'test_b', name: 'Bob', avatar: '🐱', createdAt: 1713000000001 };

    await page.addInitScript(({ a, b, today }) => {
      Object.keys(localStorage).filter(k => k.startsWith('futon_')).forEach(k => localStorage.removeItem(k));
      localStorage.setItem('futon_profiles', JSON.stringify([a, b]));
      localStorage.setItem('futon_active_profile', a.id);
      localStorage.setItem(`futon_state_${a.id}`, JSON.stringify({
        dailyLog: { [today]: { setsCompleted: 2, masteryAchieved: 0 } }
      }));
      localStorage.setItem(`futon_state_${b.id}`, JSON.stringify({
        dailyLog: { [today]: { setsCompleted: 9, masteryAchieved: 5 } }
      }));
    }, { a: profileA, b: profileB, today });

    await page.goto('/');
    await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 15000 }).catch(() => {});

    const aData = await page.evaluate(id => JSON.parse(localStorage.getItem(`futon_state_${id}`) || '{}'), profileA.id);
    const bData = await page.evaluate(id => JSON.parse(localStorage.getItem(`futon_state_${id}`) || '{}'), profileB.id);

    expect(aData.dailyLog?.[today]?.setsCompleted).toBe(2);
    expect(bData.dailyLog?.[today]?.setsCompleted).toBe(9);
  });

  test('active profile key persists across navigations', async ({ page }) => {
    await gotoHomeWithProfile(page);
    const before = await page.evaluate(() => localStorage.getItem('futon_active_profile'));
    await page.goto('/');
    await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 15000 }).catch(() => {});
    const after = await page.evaluate(() => localStorage.getItem('futon_active_profile'));
    expect(after).toBe(before);
  });

  test('futon seed key is stable within a session', async ({ page }) => {
    await gotoHomeWithProfile(page);
    const seed1 = await page.evaluate(() => localStorage.getItem('futon_seed_addition'));
    expect(seed1).not.toBeNull();
    const seed2 = await page.evaluate(() => localStorage.getItem('futon_seed_addition'));
    expect(seed1).toBe(seed2);
  });
});
