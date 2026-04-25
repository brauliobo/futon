import { test, expect } from '@playwright/test';
import { gotoHomeWithProfile, selectSubject, selectLevel, waitForLoading } from '../helpers/navigation.js';

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 390, height: 844 },
];

async function expectNoPageOverflow(page, viewport) {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    bodyWidth: document.body.scrollWidth,
  }));

  expect(metrics.clientWidth).toBe(viewport.width);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(viewport.width + 24);
  expect(metrics.bodyWidth).toBeLessThanOrEqual(viewport.width + 24);
}

async function focusedLabel(page) {
  return page.evaluate(() => {
    const el = document.activeElement;
    return (el?.getAttribute('aria-label') || el?.textContent || '').replace(/\s+/g, ' ').trim();
  });
}

async function tabUntilFocused(page, locator, maxTabs = 12) {
  for (let i = 0; i < maxTabs; i++) {
    if (await locator.evaluate(el => el === document.activeElement).catch(() => false)) return;
    await page.keyboard.press('Tab');
  }
  await expect(locator).toBeFocused();
}

test.describe('UX and accessibility smoke', () => {
  test('desktop and mobile home/set layouts fit the viewport', async ({ page }) => {
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await gotoHomeWithProfile(page, {
        id: `ux_${viewport.name}`,
        name: `UX ${viewport.name}`,
        avatar: '🐶',
        createdAt: 1713000000000,
      });

      await expect(page.getByTestId('daily-goal')).toBeVisible();
      await expect(page.getByRole('button', { name: '🔢 Matemática' })).toBeInViewport();
      await expect(page.locator('[data-level-card]').first()).toBeInViewport();
      await expectNoPageOverflow(page, viewport);

      await selectSubject(page, 'Português');
      await selectLevel(page, 'A');
      await waitForLoading(page);
      await page.getByRole('button', { name: /▶|Começar/ }).first().click();
      await page.waitForSelector('[aria-label="Next page"]', { timeout: 10000 });

      await expect(page.locator('[role="group"]').first()).toBeInViewport();
      await expect(page.getByRole('button', { name: /Next page|Próxima página|Finalizar/ })).toBeInViewport();
      await expectNoPageOverflow(page, viewport);
    }
  });

  test('keyboard traversal reaches core controls and exercise ARIA stays intact', async ({ page }) => {
    await gotoHomeWithProfile(page);

    const mathTab = page.getByRole('button', { name: '🔢 Matemática' });
    const portugueseTab = page.getByRole('button', { name: '📖 Português' });
    await tabUntilFocused(page, mathTab);
    await page.keyboard.press('Tab');
    await expect(portugueseTab).toBeFocused();

    await page.keyboard.press('Enter');
    await waitForLoading(page);
    await selectLevel(page, 'A');
    await waitForLoading(page);
    await page.getByRole('button', { name: /▶|Começar/ }).first().click();
    await page.waitForSelector('[aria-label="Next page"]', { timeout: 10000 });

    const group = page.locator('[role="radiogroup"]').first();
    await expect(group).toBeVisible();
    await expect(group).toHaveAttribute('aria-labelledby', /q-/);

    const firstChoice = page.locator('[role="radio"]').first();
    await expect(firstChoice).toHaveAttribute('aria-checked', 'false');
    await expect(firstChoice).toHaveAttribute('tabindex', '0');

    await firstChoice.focus();
    await expect(firstChoice).toBeFocused();
    await page.keyboard.press('ArrowDown');

    const label = await focusedLabel(page);
    expect(label).not.toBe('');
    await expect(page.locator('[role="radio"]').nth(1)).toBeFocused();
  });

  test('reduced motion preference keeps animated UI stable', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await gotoHomeWithProfile(page, {
      id: 'ux_reduce',
      name: 'UX Reduce',
      avatar: '🐶',
      createdAt: 1713000000000,
    });

    await expect(page.getByTestId('daily-goal')).toBeVisible();
    await expect(page.locator('[data-level-card]').first()).toBeVisible();
    const screenshot = await page.screenshot({
      animations: 'disabled',
      fullPage: false,
    });
    expect(screenshot.length).toBeGreaterThan(10000);

    const motion = await page.evaluate(() => {
      const animated = document.querySelector('.animate-slide-up');
      const style = animated ? getComputedStyle(animated) : null;
      return {
        prefersReduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        durationMs: style ? parseFloat(style.animationDuration) * 1000 : 0,
        iterationCount: style?.animationIterationCount || '',
      };
    });

    expect(motion.prefersReduced).toBe(true);
    expect(motion.durationMs).toBeLessThanOrEqual(1);
    expect(motion.iterationCount).toBe('1');
  });
});
