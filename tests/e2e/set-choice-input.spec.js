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
    await expect(page.getByRole('button', { name: answers[0].answer, exact: true })).toBeVisible();
  });

  test('clicking choice advances', async ({ page }) => {
    const answers = await getCurrentPageAnswers(page);
    if (!answers.length || !answers[0].hasChoices) return;
    await page.getByRole('button', { name: answers[0].answer, exact: true }).click();
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
});
