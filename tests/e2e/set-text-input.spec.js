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
    await expect(page.locator('[role="progressbar"]').first()).toBeVisible();
  });

  test('example alert shown', async ({ page }) => {
    await expect(page.getByText('Exemplo:')).toBeVisible();
  });

  test('type answer and Enter advances to next', async ({ page }) => {
    const answers = await getCurrentPageAnswers(page);
    if (!answers.length || answers[0].hasChoices) return;
    const input = page.locator('input[inputmode]').first();
    await input.fill(answers[0].answer);
    await input.press('Enter');
    await expect(page.getByText('✓').first()).toBeVisible();
  });

  test('all inputs enabled from start (no sequential gate)', async ({ page }) => {
    const answers = await getCurrentPageAnswers(page);
    if (answers.length < 2 || answers[0].hasChoices) return;
    const inputs = page.locator('input[inputmode]');
    const count = await inputs.count();
    for (let i = 0; i < count; i++) {
      await expect(inputs.nth(i)).toBeEnabled();
    }
  });

  test('user can click directly into any exercise input', async ({ page }) => {
    const answers = await getCurrentPageAnswers(page);
    if (answers.length < 3 || answers[0].hasChoices) return;
    const inputs = page.locator('input[inputmode]');
    await inputs.nth(2).click();
    await expect(inputs.nth(2)).toBeFocused();
    await page.keyboard.type(answers[2].answer);
    await expect(inputs.nth(2)).toHaveValue(answers[2].answer);
  });

  test('typing then clicking away persists the answer (blur commit)', async ({ page }) => {
    const answers = await getCurrentPageAnswers(page);
    if (answers.length < 2 || answers[0].hasChoices) return;
    const inputs = page.locator('input[inputmode]');
    await inputs.first().click();
    await page.keyboard.type(answers[0].answer);
    await inputs.nth(1).click();
    const saved = await page.evaluate(() => window.__futonSet?.set?.pages?.[0]?.exercises?.[0]?.answer);
    expect(String(saved)).toBe(answers[0].answer);
  });

  test('golden path: complete set end-to-end', { timeout: 120000 }, async ({ page }) => {
    await completeEntireSetCorrectly(page);
    await expect(page.locator('[data-testid="results"]')).toBeVisible({ timeout: 10000 });
    // Should show score
    await expect(page.locator('[data-testid="results"]').getByText('/')).toBeVisible();
  });

  test('per-page progress bar shows answered/total', async ({ page }) => {
    const answers = await getCurrentPageAnswers(page);
    if (!answers.length) return;
    await expect(page.locator('[role="progressbar"]')).toBeVisible();
    await expect(page.getByText(`0 / ${answers.length}`)).toBeVisible();
  });

  test('Tab from text input does NOT submit (no Tab footgun)', async ({ page }) => {
    const answers = await getCurrentPageAnswers(page);
    if (!answers.length || answers[0].hasChoices) return;
    const inputs = page.locator('input[inputmode]');
    if ((await inputs.count()) < 2) return;
    await inputs.first().click();
    await page.keyboard.type(answers[0].answer);
    await page.keyboard.press('Tab');
    await page.waitForTimeout(120);
    // Tab should commit the answer (blur-style commit) without auto-advancing past page
    const saved = await page.evaluate(() => window.__futonSet?.set?.pages?.[0]?.exercises?.[0]?.answer);
    expect(String(saved)).toBe(answers[0].answer);
    // The first input should still exist on the same page
    await expect(inputs.first()).toBeVisible();
  });

  test('clear button (×) appears while editing and resets the input', async ({ page }) => {
    const answers = await getCurrentPageAnswers(page);
    if (!answers.length || answers[0].hasChoices) return;
    const input = page.locator('input[inputmode]').first();
    await input.click();
    await page.keyboard.type(answers[0].answer);
    const clearBtn = page.locator('button[aria-label="Limpar"], button[aria-label="Clear"]').first();
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();
    await expect(input).toHaveValue('');
  });
});
