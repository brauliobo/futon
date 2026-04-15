import { test, expect } from '@playwright/test';
import { gotoHomeWithProfile, startFirstSet } from '../helpers/navigation.js';
import { completeEntireSetCorrectly, completeEntireSetWithErrors } from '../helpers/exercises.js';

test.describe('Submission and Results', () => {
  test.setTimeout(120000);

  test('correct answers show results with score', async ({ page }) => {
    await gotoHomeWithProfile(page);
    await startFirstSet(page);
    await completeEntireSetCorrectly(page);
    const results = page.locator('[data-testid="results"]');
    await expect(results).toBeVisible({ timeout: 15000 });
    // Wait for score text to appear (status propagation through Vue's emit chain)
    await expect(results.getByText('/')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="speed-gauge"]')).toBeVisible();

    // Test Reiniciar
    await page.getByRole('button', { name: /Reiniciar/ }).click();
    await page.waitForTimeout(100);
    expect(page.url()).toMatch(/\/p\/1/);
    await expect(results).not.toBeVisible();
  });

  test('wrong answers show review with errors', async ({ page }) => {
    await gotoHomeWithProfile(page);
    await startFirstSet(page);
    await completeEntireSetWithErrors(page, 8);
    const results = page.locator('[data-testid="results"]');
    await expect(results).toBeVisible({ timeout: 15000 });
    await expect(results.getByText('/')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Revisar Respostas')).toBeVisible();
    // Navigate to page 1 where the wrong answers are
    const prevBtn = page.locator('[aria-label="Previous page"]');
    while (await prevBtn.isEnabled().catch(() => false)) {
      await prevBtn.click();
      await page.waitForTimeout(100);
    }
    // New empathy UX: amber hint cards instead of red ❌ for wrong answers
    await expect(page.locator('.hint-card').first()).toBeVisible();
  });

  test('per-page review summary badge shows correct/total', async ({ page }) => {
    await gotoHomeWithProfile(page);
    await startFirstSet(page);
    await completeEntireSetWithErrors(page, 1);
    await expect(page.locator('[data-testid="results"]')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/✓\s*\d+\s*\/\s*\d+/).first()).toBeVisible();
  });

  test('Voltar returns to home', async ({ page }) => {
    await gotoHomeWithProfile(page);
    await startFirstSet(page);
    await completeEntireSetCorrectly(page);
    // Wait for results and the Voltar button
    await page.waitForTimeout(500);
    const voltarBtn = page.getByRole('button', { name: /Voltar/ }).first();
    await voltarBtn.waitFor({ state: 'visible', timeout: 10000 });
    await voltarBtn.click();
    await expect(page.getByRole('button', { name: '🔢 Matemática' })).toBeVisible();
  });
});
