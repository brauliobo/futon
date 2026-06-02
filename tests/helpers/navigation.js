// tests/helpers/navigation.js — Navigation utilities for E2E tests

import { setupTestProfile } from './storage.js';

export const PAGE_ACTION_SELECTOR = [
  '[aria-label="Próxima página"]',
  '[aria-label="Next page"]',
  '[aria-label="Ir para a próxima questão"]',
  '[aria-label="Jump to next unanswered question"]',
  '[aria-label="Finalizar"]',
  '[aria-label="Finish"]',
].join(', ');

/**
 * Sets up a test profile and navigates to home. Waits for the app to load.
 */
export async function gotoHomeWithProfile(page, profile) {
  await setupTestProfile(page, profile);
  await page.goto('/');
  await waitForAppReady(page);
}

/**
 * Waits for the app to finish loading (spinner gone, subject tabs visible).
 */
export async function waitForAppReady(page) {
  await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 15000 }).catch(() => {});
  await page.getByRole('button', { name: '🔢 Matemática' }).waitFor({ state: 'visible', timeout: 10000 });
}

/**
 * Clicks a subject tab by name. Icons come from src/utils/SubjectBranding.js.
 */
export async function selectSubject(page, label) {
  const icons = {
    'Matemática': '🔢', 'Math': '🔢',
    'Português': '📖', 'Portuguese': '📖',
    'Inglês': '🌍', 'English': '🌍',
    'Japonês': '🗾', 'Japanese': '🗾',
    'Espanhol': '🌶️', 'Spanish': '🌶️',
    'Biologia': '🧬', 'Biology': '🧬',
  };
  const icon = icons[label] || '';
  await page.getByRole('button', { name: `${icon} ${label}` }).click();
  await waitForLoading(page);
}

/**
 * Clicks a level card in the LevelRoadmap.
 */
export async function selectLevel(page, level) {
  await page.locator(`[data-level-card="${level}"]`).click();
  await waitForLoading(page);
}

/**
 * Clicks the first available "Start" button in the set list.
 */
export async function startFirstSet(page) {
  await page.getByRole('button', { name: /▶|Começar/ }).first().click();
  await page.waitForSelector(PAGE_ACTION_SELECTOR, { timeout: 10000 });
}

/**
 * Waits for any loading spinner to disappear.
 */
export async function waitForLoading(page) {
  await page.waitForSelector('.animate-spin', { state: 'detached', timeout: 10000 }).catch(() => {});
}
