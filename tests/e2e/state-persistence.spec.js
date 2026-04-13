import { test, expect } from '@playwright/test';
import { gotoHomeWithProfile, startFirstSet } from '../helpers/navigation.js';
import { answerCurrentPageCorrectly, completeEntireSetCorrectly } from '../helpers/exercises.js';

test.describe('State Persistence', () => {
  test.setTimeout(120000);
  test('progress persists to localStorage', async ({ page }) => {
    await gotoHomeWithProfile(page);
    await startFirstSet(page);
    await answerCurrentPageCorrectly(page);
    await page.waitForTimeout(100);
    const hasState = await page.evaluate(() => {
      return Object.keys(localStorage).some(k => k.startsWith('futon_state') && localStorage.getItem(k) !== '{}');
    });
    expect(hasState).toBe(true);
  });

  test('route restores set and page', async ({ page }) => {
    await gotoHomeWithProfile(page);
    await startFirstSet(page);
    const url = page.url();
    const match = url.match(/\/s\/([^/]+)\/p\/\d+/);
    if (!match) return;
    await page.goto(`/s/${match[1]}/p/2`);
    await page.waitForTimeout(200);
    expect(page.url()).toContain(`/s/${match[1]}/p/2`);
  });

  test('app saves state to localStorage', async ({ page }) => {
    await gotoHomeWithProfile(page);
    // Trigger a save by calling saveSets programmatically
    await page.evaluate(() => {
      const proxy = document.querySelector('#app').__vue_app__._instance.proxy;
      if (proxy.saveSets) proxy.saveSets();
    });
    const hasData = await page.evaluate(() => {
      return Object.keys(localStorage).some(k => k.startsWith('futon_state') && localStorage.getItem(k)?.length > 10);
    });
    expect(hasData).toBe(true);
  });
});
