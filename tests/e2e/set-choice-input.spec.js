import { test, expect } from '@playwright/test';
import { gotoHomeWithProfile, selectSubject, selectLevel, waitForLoading } from '../helpers/navigation.js';
import { getCurrentPageAnswers } from '../helpers/exercises.js';

test.describe('Set Exercise Flow - Choice Input', () => {
  test.beforeEach(async ({ page }) => {
    await gotoHomeWithProfile(page);
    await selectSubject(page, 'Português');
    await selectLevel(page, 'A');
    await waitForLoading(page);
    await page.getByRole('button', { name: /▶|Começar/ }).first().click();
    await page.waitForTimeout(100);
  });

  test('reading passage visible', async ({ page }) => {
    const passage = page.locator('[data-testid="reading-passage"]');
    if (await passage.isVisible()) {
      await expect(passage.getByText('Leia com atenção')).toBeVisible();
    }
  });

  test('choice buttons rendered', async ({ page }) => {
    const answers = await getCurrentPageAnswers(page);
    if (!answers.length || !answers[0].hasChoices) return;
    await expect(page.getByPlaceholder('Digite sua resposta')).not.toBeVisible();
    await expect(page.getByRole('radio', { name: answers[0].answer, exact: true })).toBeVisible();
  });

  test('clicking choice advances', async ({ page }) => {
    const answers = await getCurrentPageAnswers(page);
    if (!answers.length || !answers[0].hasChoices) return;
    await page.getByRole('radio', { name: answers[0].answer, exact: true }).click();
    await page.waitForTimeout(100);
    // Portuguese A expands to 1 exercise/page, so clicking advances to next page
    expect(page.url()).toMatch(/\/p\/[2-9]/);
  });

  test('passage stays visible (sticky)', async ({ page }) => {
    const passage = page.locator('[data-testid="reading-passage"]');
    if (!(await passage.isVisible())) return;
    await page.evaluate(() => window.scrollBy(0, 300));
    await expect(passage).toBeInViewport();
  });

  test('digit key 1 selects first choice when group is focused', async ({ page }) => {
    const answers = await getCurrentPageAnswers(page);
    if (!answers.length || !answers[0].hasChoices) return;
    const firstChoice = await page.locator('[role="radio"]').first().textContent();
    await page.locator('[role="radio"]').first().focus();
    await page.keyboard.press('1');
    await page.waitForTimeout(150);
    const saved = await page.evaluate(() => window.__futonSet?.set?.pages?.[0]?.exercises?.[0]?.answer);
    expect(String(firstChoice || '')).toContain(String(saved || ''));
  });

  test('arrow keys move focus across choice buttons (radiogroup pattern)', async ({ page }) => {
    const answers = await getCurrentPageAnswers(page);
    if (!answers.length || !answers[0].hasChoices) return;
    const buttons = page.locator('[role="radio"]');
    if ((await buttons.count()) < 2) return;
    await buttons.first().focus();
    await page.keyboard.press('ArrowDown');
    await expect(buttons.nth(1)).toBeFocused();
  });

  test('choice buttons expose radiogroup ARIA semantics', async ({ page }) => {
    const answers = await getCurrentPageAnswers(page);
    if (!answers.length || !answers[0].hasChoices) return;
    await expect(page.locator('[role="radiogroup"]').first()).toBeVisible();
    const first = page.locator('[role="radio"]').first();
    await expect(first).toHaveAttribute('aria-checked', 'false');
    await expect(first).toHaveAttribute('tabindex', '0');
  });
});
