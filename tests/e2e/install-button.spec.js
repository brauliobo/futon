import { test, expect } from '@playwright/test';
import { gotoHomeWithProfile } from '../helpers/navigation.js';

test.describe('Install Button', () => {
  test('renders in header with Save Offline label', async ({ page }) => {
    await gotoHomeWithProfile(page);
    const btn = page.getByRole('button', { name: /Instalar/i });
    await expect(btn).toBeVisible();
  });

  test('clicking shows download progress and marks ready', async ({ page }) => {
    await gotoHomeWithProfile(page);
    const btn = page.getByRole('button', { name: /Instalar/i });
    await btn.click();
    await expect(page.locator('svg').first()).toBeVisible({ timeout: 2000 });
    await expect(page.getByText('Baixando lições…')).toBeHidden({ timeout: 120000 });
    await expect(page.getByRole('button', { name: /Instalar/i })).toBeVisible();
  });
});
