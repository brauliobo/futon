// tests/helpers/exercises.js — Exercise interaction utilities for E2E tests

/**
 * Reads correct answers for the current page from Vue's runtime state.
 */
export async function getCurrentPageAnswers(page) {
  return page.evaluate(() => {
    const proxy = document.querySelector('#app')?.__vue_app__?._instance?.proxy;
    if (!proxy?.selectedSet) return [];
    const pageNum = Number(proxy.$route?.params?.page) || 1;
    const exercises = proxy.selectedSet.pages?.[pageNum - 1]?.exercises || [];
    return exercises.map(ex => ({
      answer: String(ex.correctAnswer),
      hasChoices: !!(ex.choices?.length),
    }));
  });
}

/**
 * Completes a set by setting answers and calling submitAnswers directly.
 * Bypasses the page-by-page UI flow entirely.
 */
export async function completeEntireSetCorrectly(page) {
  await page.waitForFunction(() => !!window.__futonSet, { timeout: 5000 });
  await page.evaluate(() => {
    const vm = window.__futonSet;
    // Set answers on all exercises
    vm.set.pages.forEach(p => p.exercises.forEach(ex => { ex.answer = String(ex.correctAnswer); }));
    // Mark all pages completed
    vm.completedPages = vm.pages.map((_, i) => i + 1);
    // Navigate to last page so submitAnswers computes correctly
    vm.currentPageIndex = vm.totalPages - 1;
    // Set isSubmitted and call submitAnswers
    vm.submitAnswers();
  });
  // Wait for Vue to process the emit chain and render results
  await page.waitForTimeout(500);
}

/**
 * Completes a set with some wrong answers.
 */
export async function completeEntireSetWithErrors(page, errorCount = 3) {
  await page.waitForFunction(() => !!window.__futonSet, { timeout: 5000 });
  await page.evaluate((errCount) => {
    const vm = window.__futonSet;
    let errors = errCount;
    vm.set.pages.forEach(p => p.exercises.forEach(ex => {
      if (errors > 0) {
        errors--;
        const correct = String(ex.correctAnswer);
        ex.answer = isNaN(Number(correct)) ? 'wrong' : String(Number(correct) + 1);
      } else {
        ex.answer = String(ex.correctAnswer);
      }
    }));
    vm.completedPages = vm.pages.map((_, i) => i + 1);
    vm.currentPageIndex = vm.totalPages - 1;
    vm.submitAnswers();
  }, errorCount);
  await page.waitForTimeout(500);
}

/**
 * Answers the current page exercises via UI (for testing the actual input flow).
 */
export async function answerCurrentPageCorrectly(page) {
  const answers = await getCurrentPageAnswers(page);
  for (const { answer, hasChoices } of answers) {
    if (hasChoices) {
      await page.getByRole('button', { name: answer, exact: true }).click();
    } else {
      await page.waitForTimeout(50);
      await page.evaluate(() => {
        const inputs = document.querySelectorAll('input[placeholder]');
        for (const inp of inputs) { if (!inp.disabled && !inp.value) { inp.focus(); return; } }
      });
      await page.keyboard.type(answer);
      await page.keyboard.press('Enter');
    }
    await page.waitForTimeout(50);
  }
}
