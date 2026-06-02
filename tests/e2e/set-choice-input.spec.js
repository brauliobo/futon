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

  test('examples normalize solved math prompts', async ({ page }) => {
    await page.waitForFunction(() => !!window.__futonSet, { timeout: 5000 });
    await page.evaluate(() => {
      const vm = window.__futonSet;
      vm.set.example = 'Resolva a conta. Ex.: 9 × 4 = → 36. Escolha CA: → CA. Pontue: João estudou muito___ → ..';
      vm.resetKey += 1;
    });

    const example = page.getByTestId('example-alert').first();
    await expect(example).toContainText('9 × 4 = 36');
    await expect(example).toContainText('Escolha CA → CA');
    await expect(example).toContainText('João estudou muito___ → .');
    await expect(example).not.toContainText('= →');
    await expect(example).not.toContainText(': CA');
    await expect(example).not.toContainText('→ ..');
  });

  test('choice buttons rendered', async ({ page }) => {
    const answers = await getCurrentPageAnswers(page);
    if (!answers.length || !answers[0].hasChoices) return;
    await expect(page.getByPlaceholder('Digite sua resposta')).not.toBeVisible();
    await expect(page.getByRole('radio', { name: answers[0].answer, exact: true })).toBeVisible();
  });

  test('early-reading choices use larger pill buttons', async ({ page }) => {
    await page.waitForFunction(() => !!window.__futonSet, { timeout: 5000 });
    await page.evaluate(() => {
      const vm = window.__futonSet;
      vm.set.pages[0].exercises = [{
        type:          'choice',
        question:      'CA',
        choices:       ['CA', 'CO', 'CU'],
        correctAnswer: 'CA',
      }];
      vm.completedPages = [];
      vm.currentPageIndex = 0;
      vm.resetKey += 1;
    });

    const firstChoice = page.getByRole('radio').first();
    await expect(firstChoice).toHaveClass(/choice-btn--reading/);
    await expect(page.locator('[role="radiogroup"]').first()).toHaveClass(/justify-center/);

    const style = await firstChoice.evaluate(el => {
      const computed = getComputedStyle(el);
      return {
        fontSize: parseFloat(computed.fontSize),
        minWidth: parseFloat(computed.minWidth),
      };
    });

    expect(style.fontSize).toBeGreaterThanOrEqual(18);
    expect(style.minWidth).toBeGreaterThanOrEqual(72);

    const shortQuestionSpacing = await page.locator('[id^="q-"]').first()
      .evaluate(el => getComputedStyle(el).letterSpacing);
    expect(['normal', '0px']).toContain(shortQuestionSpacing);

    await page.evaluate(() => {
      const vm = window.__futonSet;
      vm.set.pages[0].exercises = [{
        type:          'choice',
        question:      'FOGO começa com F? (sim/não)',
        choices:       ['sim', 'não'],
        correctAnswer: 'sim',
      }];
      vm.resetKey += 1;
    });

    await expect(page.getByRole('radio').first()).toHaveClass(/choice-btn--reading/);
  });

  test('question blanks render as stable underline markers', async ({ page }) => {
    await page.waitForFunction(() => !!window.__futonSet, { timeout: 5000 });
    await page.evaluate(() => {
      const vm = window.__futonSet;
      vm.set.pages[0].exercises = [{
        type:          'choice',
        question:      "'Hoje é segunda-feira___'",
        choices:       ['.', '?', '!'],
        correctAnswer: '.',
      }];
      vm.completedPages = [];
      vm.currentPageIndex = 0;
      vm.resetKey += 1;
    });

    const blank = page.locator('.structured-text__blank').first();
    await expect(blank).toBeVisible();

    const box = await blank.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(40);
    expect(box?.height).toBeGreaterThanOrEqual(10);

    await page.evaluate(() => {
      const vm = window.__futonSet;
      vm.set.pages[0].exercises = [{
        type:          'choice',
        question:      '_OCA é',
        choices:       ['BOCA', 'DADO'],
        correctAnswer: 'BOCA',
      }];
      vm.resetKey += 1;
    });

    const letterBlank = page.locator('.structured-text__blank--letter').first();
    await expect(letterBlank).toBeVisible();

    const letterBox = await letterBlank.boundingBox();
    expect(letterBox?.width).toBeLessThan(30);
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

  test('portuguese model-text descriptions render for paragraph questions', async ({ page }) => {
    await page.waitForFunction(() => !!window.__futonSet, { timeout: 5000 });
    await page.evaluate(() => {
      const vm = window.__futonSet;
      vm.set.pages[0].description = [
        'Leia e responda:',
        '"A violência escolar tem aumentado nos últimos anos. Isso ocorre porque as escolas carecem de infraestrutura adequada e os estudantes enfrentam pressão social intensa. Portanto, investir em educação integral é fundamental."',
      ].join('\n');
      vm.set.pages[0].exercises = [{
        type:          'paragraph',
        question:      'Qual é a tese desta redação? (violência escolar aumentou/investir em educação integral reduz a violência escolar)',
        correctAnswer: 'investir em educação integral reduz a violência escolar',
      }];
      vm.completedPages = [];
      vm.currentPageIndex = 0;
      vm.resetKey += 1;
    });

    const passage = page.locator('[data-testid="reading-passage"]');
    await expect(passage).toBeVisible();
    await expect(passage).toContainText('A violência escolar tem aumentado');
  });

  test('medium portuguese model-text passages can collapse', async ({ page }) => {
    await page.waitForFunction(() => !!window.__futonSet, { timeout: 5000 });
    await page.evaluate(() => {
      const vm = window.__futonSet;
      vm.set.pages[0].description = [
        'Redação modelo — leia e responda:',
        '"A violência escolar tem aumentado nos últimos anos. Isso ocorre, em parte, porque as escolas carecem de infraestrutura adequada e os estudantes enfrentam pressão social intensa. Além disso, a falta de atividades extracurriculares deixa os jovens sem alternativas. Portanto, investir em educação integral é fundamental para reduzir esse fenômeno."',
      ].join('\n');
      vm.set.pages[0].exercises = [{
        type:          'paragraph',
        question:      'Qual é a tese desta redação? (violência escolar aumentou/investir em educação integral reduz a violência escolar)',
        correctAnswer: 'investir em educação integral reduz a violência escolar',
      }];
      vm.completedPages = [];
      vm.currentPageIndex = 0;
      vm.resetKey += 1;
    });

    const passage = page.locator('[data-testid="reading-passage"]');
    await expect(passage.getByRole('button', { name: /Mostrar texto|Show text/ })).toBeVisible();
    await expect(passage.locator('.passage-text--collapsed')).toBeVisible();
  });

  test('portuguese story descriptions render for paragraph questions', async ({ page }) => {
    await page.waitForFunction(() => !!window.__futonSet, { timeout: 5000 });
    await page.evaluate(() => {
      const vm = window.__futonSet;
      vm.set.pages[0].description = 'História: A família de Ana viajou de avião para a praia. Passaram uma semana lá. O tempo estava ensolarado. Nadaram no mar e comeram frutos do mar. Voltaram de avião. A viagem foi divertida e todos querem voltar.';
      vm.set.pages[0].exercises = [{
        type:          'paragraph',
        question:      'Para onde a família viajou? (praia/parque/escola)',
        correctAnswer: 'praia',
      }];
      vm.completedPages = [];
      vm.currentPageIndex = 0;
      vm.resetKey += 1;
    });

    const passage = page.locator('[data-testid="reading-passage"]');
    await expect(passage).toBeVisible();
    await expect(passage).toContainText('A família de Ana viajou');
  });

  test('digit key 1 selects first choice when group is focused', async ({ page }) => {
    const answers = await getCurrentPageAnswers(page);
    if (!answers.length || !answers[0].hasChoices) return;
    await expect(page.getByText(/tecle 1|press 1/i)).toHaveCount(0);
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

  test('free-text clear control is anchored to its input', async ({ page }) => {
    await page.waitForFunction(() => !!window.__futonSet, { timeout: 5000 });
    await page.evaluate(() => {
      const vm = window.__futonSet;
      vm.set.pages[0].exercises = [{
        type:          'paragraph',
        question:      'Complete a resposta',
        correctAnswer: 'aposto',
      }];
      vm.completedPages = [];
      vm.currentPageIndex = 0;
      vm.resetKey += 1;
    });

    const input = page.getByRole('textbox', { name: 'Complete a resposta' });
    await input.fill('aposto');
    const clearButton = page.getByRole('button', { name: /Limpar|Clear/ });
    await expect(clearButton).toBeVisible();
    await expect(clearButton).toHaveAttribute('title', /Limpar|Clear/);

    const clearButtonIsAnchored = await clearButton.evaluate((button) => {
      const parent = button.parentElement;
      return parent?.classList.contains('relative') && parent.querySelector('input');
    });
    expect(clearButtonIsAnchored).toBeTruthy();
  });

  test('numeric clear control uses a touch-sized target', async ({ page }) => {
    await page.waitForFunction(() => !!window.__futonSet, { timeout: 5000 });
    await page.evaluate(() => {
      const vm = window.__futonSet;
      vm.set.pages[0].exercises = [{
        type:          'math',
        question:      '2 + 2 =',
        correctAnswer: 4,
      }];
      vm.completedPages = [];
      vm.currentPageIndex = 0;
      vm.resetKey += 1;
    });

    const input = page.getByRole('textbox', { name: '2 + 2 =' });
    await input.fill('4');
    const clearButton = page.getByRole('button', { name: /Limpar|Clear/ });
    await expect(clearButton).toBeVisible();

    const box = await clearButton.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(24);
    expect(box?.height).toBeGreaterThanOrEqual(24);
  });

  test('wrong-answer hint labels review answers', async ({ page }) => {
    await page.waitForFunction(() => !!window.__futonSet, { timeout: 5000 });
    await page.evaluate(() => {
      const vm = window.__futonSet;
      vm.set.pages[0].exercises = [{
        type:          'choice',
        question:      'Qual alternativa está correta?',
        choices:       ['certa', 'errada', 'quase'],
        correctAnswer: 'certa',
        answer:        'errada',
      }];
      vm.completedPages = [];
      vm.currentPageIndex = 0;
      vm.isSubmitted = true;
      vm.resetKey += 1;
    });

    const hint = page.locator('.hint-card').first();
    await expect(hint).toBeVisible();
    await expect(hint).toContainText(/Sua resposta|Your answer/);
    await expect(hint).toContainText('errada');
    await expect(hint).toContainText(/Correta|Correct/);
    await expect(hint.locator('.hint-card__user-value')).toHaveCSS('text-decoration-line', 'none');

    const missedChoice = page.locator('.review-choice--miss').first();
    await expect(missedChoice).toBeVisible();
    await expect(missedChoice).toHaveCSS('text-decoration-line', 'none');
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

  test('fraction sums render each term as stacked math text', async ({ page }) => {
    await page.waitForFunction(() => !!window.__futonSet, { timeout: 5000 });
    await page.evaluate(() => {
      const vm = window.__futonSet;
      vm.set.pages[0].exercises = [{
        type:          'fraction_add',
        question:      '1/4 + 2/4 =',
        correctAnswer: '3/4',
      }];
      vm.completedPages = [];
      vm.currentPageIndex = 0;
      vm.resetKey += 1;
    });

    const question = page.locator('[id^="q-"]').first();
    await expect(question.locator('.math-text--fractional')).toBeVisible();
    await expect(question.locator('.math-fraction')).toHaveCount(2);
    await expect(question.locator('.math-fraction__numerator')).toContainText(['1', '2']);
    await expect(question.locator('.math-fraction__denominator')).toContainText(['4', '4']);
  });

  test('math exponents render as superscript text', async ({ page }) => {
    await page.waitForFunction(() => !!window.__futonSet, { timeout: 5000 });
    await page.evaluate(() => {
      const vm = window.__futonSet;
      vm.set.pages[0].exercises = [{
        type:          'choice',
        question:      'x^2 + x^10 =',
        choices:       ['x^12', '2x^10', 'x^20'],
        correctAnswer: 'x^12',
      }];
      vm.completedPages = [];
      vm.currentPageIndex = 0;
      vm.resetKey += 1;
    });

    const question = page.locator('[id^="q-"]').first();
    await expect(question.locator('.math-text__sup')).toContainText(['2', '10']);
    await expect(page.getByRole('radio', { name: 'x^12' }).locator('.math-text__sup')).toContainText('12');
  });

  test('math radicals render with a visual root bar', async ({ page }) => {
    await page.waitForFunction(() => !!window.__futonSet, { timeout: 5000 });
    await page.evaluate(() => {
      const vm = window.__futonSet;
      vm.set.pages[0].exercises = [{
        type:          'choice',
        question:      'Diagonal do quadrado: L√2 =',
        choices:       ['L√2', '2L', '√(L^2+L^2)'],
        correctAnswer: 'L√2',
      }];
      vm.completedPages = [];
      vm.currentPageIndex = 0;
      vm.resetKey += 1;
    });

    const question = page.locator('[id^="q-"]').first();
    await expect(question.locator('.math-radical')).toBeVisible();
    await expect(question.locator('.math-radical__body')).toContainText('2');
    await expect(page.getByRole('radio', { name: '√(L^2+L^2)' }).locator('.math-radical__body')).toContainText('L^2+L^2');
  });

  test('fraction clear control uses a touch-sized target', async ({ page }) => {
    await page.waitForFunction(() => !!window.__futonSet, { timeout: 5000 });
    await page.evaluate(() => {
      const vm = window.__futonSet;
      vm.set.pages[0].exercises = [{
        type:          'fraction_add',
        question:      '1/4 + 2/4 =',
        correctAnswer: '3/4',
      }];
      vm.completedPages = [];
      vm.currentPageIndex = 0;
      vm.resetKey += 1;
    });

    await page.locator('.fraction-answer__number').first().fill('3');
    await expect(page.locator('.fraction-answer__number').first()).toHaveAttribute('aria-label', /Numerador|Numerator/);
    await expect(page.locator('.fraction-answer__number').nth(1)).toHaveAttribute('aria-label', /Denominador|Denominator/);
    await expect(page.locator('.fraction-answer__number').first()).toHaveAttribute('inputmode', 'numeric');
    await expect(page.locator('.fraction-answer__number').first()).toHaveAttribute('pattern', '-?[0-9]*');
    await expect(page.locator('.fraction-answer__number').nth(1)).toHaveAttribute('inputmode', 'numeric');
    await expect(page.locator('.fraction-answer__number').nth(1)).toHaveAttribute('pattern', '[0-9]*');

    const numberBox = await page.locator('.fraction-answer__number').first().boundingBox();
    expect(numberBox?.height).toBeGreaterThanOrEqual(44);

    const clearButton = page.getByRole('button', { name: /Limpar|Clear/ });
    await expect(clearButton).toBeVisible();

    const box = await clearButton.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(24);
    expect(box?.height).toBeGreaterThanOrEqual(24);
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

  test('medium portuguese contrast answers are split into structured rows', async ({ page }) => {
    await page.waitForFunction(() => !!window.__futonSet, { timeout: 5000 });
    await page.evaluate(() => {
      const vm = window.__futonSet;
      const contrastChoice = 'é gênero jornalístico com maior liberdade de estilo; a dissertação ENEM segue formato e competências rígidas da avaliação';
      vm.set.pages[0].exercises = [{
        type:          'choice',
        question:      'Diferença entre gêneros argumentativos',
        choices:       [contrastChoice, 'não tem tese', 'tem rima obrigatória'],
        correctAnswer: contrastChoice,
      }];
      vm.completedPages = [];
      vm.currentPageIndex = 0;
      vm.resetKey += 1;
    });

    const structuredChoice = page.locator('[role="radio"] .structured-text--dense').first();
    await expect(structuredChoice).toBeVisible();
    await expect(structuredChoice.locator('.structured-text__part')).toHaveCount(2);
    await expect(structuredChoice.locator('.structured-text__separator')).toHaveText(';');
  });

  test('portuguese comma enumerations are split into structured rows', async ({ page }) => {
    await page.waitForFunction(() => !!window.__futonSet, { timeout: 5000 });
    await page.evaluate(() => {
      const vm = window.__futonSet;
      const listChoice = 'figuras de linguagem, variação linguística (coloquial), 2ª geração modernista, intertextualidade e função crítica do discurso';
      vm.set.pages[0].exercises = [{
        type:          'choice',
        question:      'Análise integrada',
        choices:       [listChoice, 'apenas literatura modernista', 'apenas análise do discurso'],
        correctAnswer: listChoice,
      }];
      vm.completedPages = [];
      vm.currentPageIndex = 0;
      vm.resetKey += 1;
    });

    const structuredChoice = page.locator('[role="radio"] .structured-text--dense').first();
    await expect(structuredChoice).toBeVisible();
    await expect(structuredChoice.locator('.structured-text__part')).toHaveCount(4);
    await expect(structuredChoice.locator('.structured-text__separator')).toContainText([',', ',', ',']);
  });

  test('long arrow explanations are split into structured rows', async ({ page }) => {
    await page.waitForFunction(() => !!window.__futonSet, { timeout: 5000 });
    await page.evaluate(() => {
      const vm = window.__futonSet;
      const arrowChoice = "en MD, la supletividad de 'ir' se analiza como ítems de vocabulario contextualmente condicionados: /fu-/ gana en pasado, /v-/ en presente indicativo, /i-/ como raíz por defecto → la supletividad emerge de la competencia entre ítems con especificaciones contextuales distintas";
      vm.set.pages[0].exercises = [{
        type:          'choice',
        question:      'Supletividad verbal',
        choices:       [arrowChoice, 'accidente histórico sin análisis', 'no tiene análisis formal'],
        correctAnswer: arrowChoice,
      }];
      vm.completedPages = [];
      vm.currentPageIndex = 0;
      vm.resetKey += 1;
    });

    const structuredChoice = page.locator('[role="radio"] .structured-text--dense').first();
    await expect(structuredChoice).toBeVisible();
    await expect(structuredChoice.locator('.structured-text__part')).toHaveCount(2);
    await expect(structuredChoice.locator('.structured-text__separator')).toHaveText('→');

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBeFalsy();
  });
});
