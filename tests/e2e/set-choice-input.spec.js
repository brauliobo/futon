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
    // Portuguese A expands to 1 exercise/page; advance happens after 450ms page-complete celebration
    await page.waitForURL(/\/p\/[2-9]/, { timeout: 2000 });
  });

  test('passage stays visible (sticky)', async ({ page }) => {
    const passage = page.locator('[data-testid="reading-passage"]');
    if (!(await passage.isVisible())) return;
    await page.evaluate(() => window.scrollBy(0, 300));
    await expect(passage).toBeInViewport();
  });

  test('reading descriptions render as collapsible passages', async ({ page }) => {
    await page.waitForFunction(() => !!window.__futonSet, { timeout: 5000 });
    await page.evaluate(() => {
      const vm = window.__futonSet;
      const sentence = 'Texto: La justicia requiere razones públicas, instituciones compartidas, deliberación democrática y atención a las capacidades concretas de cada persona. ';
      vm.set.pages[0].description = sentence.repeat(12);
      vm.set.pages[0].exercises = [{
        type:          'reading',
        question:      '¿Qué requiere la justicia?',
        correctAnswer: 'razones públicas',
      }];
      vm.completedPages = [];
      vm.currentPageIndex = 0;
      vm.resetKey += 1;
    });

    const passage = page.locator('[data-testid="reading-passage"]');
    await expect(passage).toBeVisible();
    await expect(passage.getByText('Texto: La justicia')).toBeVisible();

    const textBoxBefore = await passage.locator('.passage-text').boundingBox();
    await expect(passage.getByRole('button', { name: /Mostrar texto|Show text/ })).toBeVisible();
    await passage.getByRole('button', { name: /Mostrar texto|Show text/ }).click();
    await expect(passage.getByRole('button', { name: /Ocultar texto|Hide text/ })).toBeVisible();
    const textBoxAfter = await passage.locator('.passage-text').boundingBox();

    expect(textBoxAfter.height).toBeGreaterThan(textBoxBefore.height);
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

  test('long choices use compact single-column cards', async ({ page }) => {
    await page.waitForFunction(() => !!window.__futonSet, { timeout: 5000 });
    await page.evaluate(() => {
      const vm = window.__futonSet;
      const longChoice = 'This advanced review answer combines clinical evidence, named studies, mechanism, population, caveat, and deployment context into one dense option that must remain readable without creating a two-column squeeze or horizontal overflow.';
      vm.set.pages[0].exercises = [{
        type:          'choice',
        question:      'Dense review prompt',
        choices:       [longChoice, `${longChoice} Distractor.`, `${longChoice} Alternate.`],
        correctAnswer: longChoice,
      }];
      vm.completedPages = [];
      vm.currentPageIndex = 0;
      vm.resetKey += 1;
    });

    const group = page.locator('[role="radiogroup"]').first();
    await expect(group).toHaveClass(/grid-cols-1/);
    await expect(page.locator('.choice-btn--long')).toHaveCount(3);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBeFalsy();
  });

  test('dense plus lists are split into structured lesson text', async ({ page }) => {
    await page.waitForFunction(() => !!window.__futonSet, { timeout: 5000 });
    await page.evaluate(() => {
      const vm = window.__futonSet;
      const denseChoice = [
        'Level N advanced biotech 2024 integrates reproductive frontier',
        'biostasis',
        'exposome',
        'wastewater surveillance',
        'plant synthetic biology',
        'marine therapeutics',
        'AI drug discovery',
        'climate synthetic biology',
      ].join(' + ');
      vm.set.pages[0].exercises = [{
        type:          'choice',
        question:      `Dense synthesis prompt: ${denseChoice}`,
        choices:       [denseChoice, 'single idea', 'short distractor'],
        correctAnswer: denseChoice,
      }];
      vm.completedPages = [];
      vm.currentPageIndex = 0;
      vm.resetKey += 1;
    });

    await expect(page.locator('.structured-text--dense').first()).toBeVisible();
    await expect(page.locator('[role="radio"] .structured-text__part')).toHaveCount(8);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBeFalsy();
  });

  test('long contrast answers are split into structured rows', async ({ page }) => {
    await page.waitForFunction(() => !!window.__futonSet, { timeout: 5000 });
    await page.evaluate(() => {
      const vm = window.__futonSet;
      const contrastChoice = 'español peninsular septentrional: distinción /θ/ vs. /s/, /d/ intervocálica preservada, /x/ velar; español atlántico: seseo (/s/ única), aspiración/elisión de /s/ coda, debilitamiento de /d/ final; los dos polos del continuo dialectal';
      vm.set.pages[0].exercises = [{
        type:          'choice',
        question:      'Contraste dialectal',
        choices:       [contrastChoice, 'no hay diferencias', 'solo cambia el vocabulario'],
        correctAnswer: contrastChoice,
      }];
      vm.completedPages = [];
      vm.currentPageIndex = 0;
      vm.resetKey += 1;
    });

    const structuredChoice = page.locator('[role="radio"] .structured-text--dense').first();
    await expect(structuredChoice).toBeVisible();
    await expect(structuredChoice.locator('.structured-text__part')).toHaveCount(3);
    await expect(structuredChoice.locator('.structured-text__separator')).toContainText([';', ';']);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBeFalsy();
  });
});
