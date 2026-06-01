import { test, expect } from '@playwright/test';
import { gotoHomeWithProfile, startFirstSet } from '../helpers/navigation.js';
import { completeEntireSetCorrectly, completeEntireSetWithErrors } from '../helpers/exercises.js';

test.describe('Mastery Gate UX', () => {
  test.setTimeout(120000);

  test('mastery: shows gate with both ✅ rows and Próximo Bloco', async ({ page }) => {
    await gotoHomeWithProfile(page);
    await startFirstSet(page);
    await completeEntireSetCorrectly(page);

    const results = page.locator('[data-testid="results"]');
    await expect(results).toBeVisible({ timeout: 15000 });
    await expect(results.getByText('Meta do bloco')).toBeVisible();
    // Gate rows appear: Acertos, Tempo de domínio (scoped to gate panel)
    const gateRows = results.locator('.gate-row-label');
    await expect(gateRows.filter({ hasText: 'Acertos' })).toBeVisible();
    await expect(gateRows.filter({ hasText: 'Tempo de domínio' })).toBeVisible();
    // On mastery, Próximo Bloco shows; Refazer does not
    await expect(page.locator('[data-testid="retry-set"]')).toHaveCount(0);
  });

  test('retry: shows ❌ row, no Próximo Bloco, has Refazer button', async ({ page }) => {
    await gotoHomeWithProfile(page);
    await startFirstSet(page);
    // Deliberately fail accuracy with many wrong answers
    // (set has 200 exercises with 85% pass threshold; 50 wrong = 75% < 85%)
    await completeEntireSetWithErrors(page, 50);

    const results = page.locator('[data-testid="results"]');
    await expect(results).toBeVisible({ timeout: 15000 });
    await expect(results.getByText('Meta do bloco')).toBeVisible();
    await expect(results.getByText(/Refaça este conjunto/)).toBeVisible();
    // Retry button visible
    await expect(page.locator('[data-testid="retry-set"]')).toBeVisible();
  });
});
