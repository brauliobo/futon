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
});
