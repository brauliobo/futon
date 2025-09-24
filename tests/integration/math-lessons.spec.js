import { test, expect } from '@playwright/test';

test.describe('Math Lessons - Basic Tests', () => {
  
  test('should load home page', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Check basic page elements
    await expect(page).toHaveTitle('Futon');
    await expect(page.getByRole('heading', { name: 'Escolha um caderno' })).toBeVisible();
    await expect(page.getByText('Matemática')).toBeVisible();
  });

  test('should navigate to math lesson', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Click on level 1A 
    await page.getByText('71AAdição e Subtração até').click();
    
    // Verify we see the first lesson
    await expect(page.getByText('Adição e Subtração 0–10')).toBeVisible();
    
    // Click start button
    await page.getByRole('button', { name: 'Começar' }).first().click();
    
    // Verify we're in lesson page by checking for main heading
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Adição e Subtração');
  });

  test('should display lesson interface', async ({ page }) => {
    // Navigate to lesson
    await page.goto('http://localhost:5173');
    await page.getByText('71AAdição e Subtração até').click();
    await page.getByRole('button', { name: 'Começar' }).first().click();
    
    // Check lesson interface elements
    await expect(page.getByText('Blocos Completados')).toBeVisible();
    await expect(page.getByText('Tentativas')).toBeVisible(); 
    await expect(page.getByText('Última Nota')).toBeVisible();
    await expect(page.getByText('Exemplo:')).toBeVisible();
  });

  test('should show math questions', async ({ page }) => {
    // Navigate to lesson  
    await page.goto('http://localhost:5173');
    await page.getByText('71AAdição e Subtração até').click();
    await page.getByRole('button', { name: 'Começar' }).first().click();
    
    // Check for math questions (look for equals signs)
    await expect(page.getByText('1 + 4 =')).toBeVisible();
    await expect(page.getByText('2 + 6 =')).toBeVisible();
  });

  test('should have input fields for answers', async ({ page }) => {
    // Navigate to lesson
    await page.goto('http://localhost:5173');
    await page.getByText('71AAdição e Subtração até').click();
    await page.getByRole('button', { name: 'Começar' }).first().click();
    
    // Check for textbox inputs
    const textboxes = page.getByRole('textbox');
    await expect(textboxes.first()).toBeVisible();
    
    // Try to interact with first textbox
    await textboxes.first().fill('5');
    await expect(textboxes.first()).toHaveValue('5');
  });

  test('should have navigation controls', async ({ page }) => {
    // Navigate to lesson
    await page.goto('http://localhost:5173');
    await page.getByText('71AAdição e Subtração até').click();
    await page.getByRole('button', { name: 'Começar' }).first().click();
    
    // Check navigation buttons (they may be disabled but still visible)
    await expect(page.getByText('Anterior')).toBeVisible();
    await expect(page.getByText('Próxima')).toBeVisible();
    
    // Check page selector dropdown
    await expect(page.getByRole('combobox')).toBeVisible();
  });

  test('should have reset button', async ({ page }) => {
    // Navigate to lesson
    await page.goto('http://localhost:5173');
    await page.getByText('71AAdição e Subtração até').click();
    await page.getByRole('button', { name: 'Começar' }).first().click();
    
    // Check reset button
    await expect(page.getByRole('button', { name: 'Reiniciar' })).toBeVisible();
  });

  test('should display progress elements', async ({ page }) => {
    // Navigate to lesson
    await page.goto('http://localhost:5173');
    await page.getByText('71AAdição e Subtração até').click();
    await page.getByRole('button', { name: 'Começar' }).first().click();
    
    // Check progress bar
    await expect(page.getByRole('progressbar')).toBeVisible();
    
    // Check timer (⏱ emoji)
    await expect(page.getByText('⏱')).toBeVisible();
  });
});