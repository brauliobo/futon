import { test, expect } from '@playwright/test';
import { clearFutonStorage, setupTestProfile, injectProfiles } from '../helpers/storage.js';
import { gotoHomeWithProfile } from '../helpers/navigation.js';

test.describe('Profile Flow', () => {
  test('first visit shows create form', async ({ page }) => {
    await clearFutonStorage(page);
    await page.goto('/');
    await expect(page.locator('[data-testid="profile-selector"]')).toBeVisible();
    await expect(page.getByPlaceholder('Digite o nome...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Criar' })).toBeVisible();
  });

  test('create profile enters app', async ({ page }) => {
    await clearFutonStorage(page);
    await page.goto('/');
    await page.getByPlaceholder('Digite o nome...').fill('Ana');
    await page.getByRole('button', { name: 'Criar' }).click();
    await expect(page.locator('[data-testid="profile-selector"]')).not.toBeVisible();
    await expect(page.getByText('Ana')).toBeVisible();
    await expect(page.getByRole('button', { name: '🔢 Matemática' })).toBeVisible();
  });

  test('select existing profile loads app', async ({ page }) => {
    await injectProfiles(page, [
      { id: 'p1', name: 'Maria', avatar: '🐶', createdAt: Date.now() },
      { id: 'p2', name: 'João', avatar: '🐱', createdAt: Date.now() },
    ]);
    await page.goto('/');
    await page.getByRole('button', { name: /Maria/ }).click();
    await expect(page.getByRole('button', { name: '🔢 Matemática' })).toBeVisible();
  });

  test('switch profile via header avatar', async ({ page }) => {
    await gotoHomeWithProfile(page);
    await page.getByRole('button', { name: /Test/ }).click();
    await expect(page.locator('[data-testid="profile-selector"]')).toBeVisible();
  });
});
