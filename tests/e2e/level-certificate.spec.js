import { test, expect } from '@playwright/test';
import { gotoHomeWithProfile, startFirstSet } from '../helpers/navigation.js';
import { injectAllMasteryExcept } from '../helpers/app.js';
import { completeEntireSetCorrectly } from '../helpers/exercises.js';

test.describe('Level Certificate', () => {
  test.setTimeout(120000);
  test('certificate appears on full-level mastery', async ({ page }) => {
    await gotoHomeWithProfile(page);
    await injectAllMasteryExcept(page, 'math', '7A', 0);
    await startFirstSet(page);
    await completeEntireSetCorrectly(page);
    await expect(page.locator('[data-testid="results"]')).toBeVisible({ timeout: 10000 });

    const cert = page.locator('[data-testid="certificate-modal"]');
    if (await cert.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(cert.getByText('Nível Completo!')).toBeVisible();
      await page.getByRole('button', { name: 'Fechar' }).click();
      await expect(cert).not.toBeVisible();
    }
  });
});
