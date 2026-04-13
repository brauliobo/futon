import { test, expect } from '@playwright/test';
import { gotoHomeWithProfile, startFirstSet } from '../helpers/navigation.js';
import { getCurrentPageAnswers, answerCurrentPageCorrectly, completeEntireSetCorrectly } from '../helpers/exercises.js';

test.describe('Set Exercise Flow - Text Input', () => {
  test.beforeEach(async ({ page }) => {
    await gotoHomeWithProfile(page);
    await startFirstSet(page);
  });

  test('page header shows dots and timer', async ({ page }) => {
    await expect(page.getByText('⏱')).toBeVisible();
    await expect(page.locator('span.rounded-full').first()).toBeVisible();
  });

  test('example alert shown', async ({ page }) => {
    await expect(page.getByText('Exemplo:')).toBeVisible();
  });

  test('type answer and Enter advances to next', async ({ page }) => {
    const answers = await getCurrentPageAnswers(page);
    if (!answers.length || answers[0].hasChoices) return;
    const input = page.getByPlaceholder('Digite sua resposta').first();
    await input.fill(answers[0].answer);
    await input.press('Enter');
    await expect(page.getByText('✓').first()).toBeVisible();
  });

  test('exercises enable sequentially', async ({ page }) => {
    const answers = await getCurrentPageAnswers(page);
    if (answers.length < 2 || answers[0].hasChoices) return;
    const inputs = page.getByPlaceholder('Digite sua resposta');
    await expect(inputs.first()).toBeEnabled();
    await inputs.first().fill(answers[0].answer);
    await inputs.first().press('Enter');
    await page.waitForTimeout(50);
    await expect(inputs.first()).toBeEnabled();
  });

  test('golden path: complete set end-to-end', { timeout: 120000 }, async ({ page }) => {
    await completeEntireSetCorrectly(page);
    await expect(page.locator('[data-testid="results"]')).toBeVisible({ timeout: 10000 });
    // Should show score
    await expect(page.locator('[data-testid="results"]').getByText('/')).toBeVisible();
  });
});
