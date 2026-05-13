import { test, expect } from '@playwright/test';
import { gotoHomeWithProfile } from '../helpers/navigation.js';

// Mirrors spanish-skill-tree.spec.js — verifies Biology integration after
// the iter 153/155 wiring: Discipline.ALL registration, SubjectBranding
// icon/color, Levels.BIOLOGY registry, and DisciplineRegistry LEVEL_ORDER.
test.describe('Biology Skill Tree', () => {
  test.beforeEach(async ({ page }) => {
    await gotoHomeWithProfile(page);
  });

  test('Biology tab is visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Biology|Biologia/ })).toBeVisible();
  });

  test('clicking Biology tab activates it', async ({ page }) => {
    await page.getByRole('button', { name: /Biology|Biologia/ }).click();
    await page.waitForTimeout(300);
    const header = page.locator('h2').filter({ hasText: /Biology|Biologia/ });
    await expect(header).toBeVisible();
  });

  test('Biology subject shows Campaign and Themes mode tabs', async ({ page }) => {
    await page.getByRole('button', { name: /Biology|Biologia/ }).click();
    await page.waitForTimeout(300);
    await expect(page.getByRole('button', { name: /Campanha|Campaign/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Temas|Themes/ })).toBeVisible();
  });

  test('Biology themes mode renders without crashing', async ({ page }) => {
    await page.getByRole('button', { name: /Biology|Biologia/ }).click();
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Temas|Themes/ }).click();
    await page.waitForTimeout(300);
    await expect(page.locator('section')).toBeVisible();
  });

  test('no JS error thrown when switching to Biology', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.getByRole('button', { name: /Biology|Biologia/ }).click();
    await page.waitForTimeout(500);
    expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0);
  });
});
