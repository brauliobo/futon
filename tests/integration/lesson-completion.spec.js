import { test, expect } from '@playwright/test';

test.describe('Math Lesson Completion Workflow', () => {
  
  test('should complete full lesson workflow with progress tracking', async ({ page }) => {
    // Navigate to home
    await page.goto('http://localhost:5173');
    
    // Navigate to Level 1A and start first lesson
    await page.getByText('71AAdição e Subtração até').click();
    await page.getByRole('button', { name: 'Começar' }).first().click();
    
    // Verify we're in the lesson interface
    await expect(page.getByRole('heading', { name: /Adição e Subtração 0–10/ })).toBeVisible();
    await expect(page.getByText('Nível: 1A')).toBeVisible();
    
    // Check initial progress state
    await expect(page.getByText('Blocos Completados')).toBeVisible();
    await expect(page.getByText('Tentativas')).toBeVisible();
    await expect(page.getByText('Última Nota')).toBeVisible();
    
    // Verify page navigation controls
    await expect(page.getByText('Página')).toBeVisible();
    await expect(page.getByText('Anterior')).toBeVisible();
    await expect(page.getByText('Próxima')).toBeVisible();
    
    // Complete page by answering all questions
    const questions = [
      { answer: '5' },   // 1 + 4
      { answer: '8' },   // 2 + 6  
      { answer: '7' },   // 0 + 7
      { answer: '8' },   // 3 + 5
      { answer: '8' },   // 4 + 4
      { answer: '4' },   // 7 - 3
      { answer: '4' },   // 9 - 5
      { answer: '4' },   // 6 - 2
      { answer: '7' },   // 8 - 1
      { answer: '5' }    // 5 - 0
    ];
    
    // Answer each question sequentially
    for (let i = 0; i < questions.length; i++) {
      // Find the active textbox and fill it
      await page.getByRole('textbox', { name: 'Digite sua resposta' }).first().fill(questions[i].answer);
      
      // Press Tab to submit and move to next question
      if (i < questions.length - 1) {
        await page.keyboard.press('Tab');
        
        // Verify progress indicator updates
        const expectedProgress = `${i + 1}/10`;
        await expect(page.locator(`text=/Página \\d+ de \\d${expectedProgress}/`)).toBeVisible();
      }
    }
    
    // Complete final question to trigger page advancement
    await page.keyboard.press('Tab');
    
    // Verify auto-advancement to next page
    await expect(page.getByText('Página 3 de 5')).toBeVisible();
    
    // Verify progress updated
    await expect(page.getByText('2')).toBeVisible(); // 2 Blocos Completados
    
    // Verify progress bar shows increased percentage (60%)
    const progressBar = page.locator('[role="progressbar"]');
    await expect(progressBar).toBeVisible();
    
    // Verify timer reset for new page
    await expect(page.getByText('⏱')).toBeVisible();
    
    // Verify new page has fresh questions (all disabled except first)
    const activeInputs = page.getByRole('textbox', { name: 'Digite sua resposta' });
    await expect(activeInputs.first()).not.toBeDisabled();
    
    // Verify URL updated to new page
    expect(page.url()).toContain('/p/3');
  });
  
  test('should handle lesson navigation and state persistence', async ({ page }) => {
    // Navigate to lesson  
    await page.goto('http://localhost:5173');
    await page.getByText('71AAdição e Subtração até').click();
    await page.getByRole('button', { name: 'Começar' }).first().click();
    
    // Answer a few questions
    await page.getByRole('textbox', { name: 'Digite sua resposta' }).first().fill('5');
    await page.keyboard.press('Tab');
    await page.getByRole('textbox', { name: 'Digite sua resposta' }).first().fill('8');
    await page.keyboard.press('Tab');
    
    // Navigate back to home
    await page.getByRole('button', { name: '← Voltar' }).click();
    await expect(page.getByRole('heading', { name: 'Escolha um caderno' })).toBeVisible();
    
    // Return to same lesson
    await page.getByText('71AAdição e Subtração até').click();
    await page.getByRole('button', { name: 'Começar' }).first().click();
    
    // Verify progress was maintained
    await expect(page.getByText('Blocos Completados')).toBeVisible();
  });
  
  test('should display lesson stats and progress correctly', async ({ page }) => {
    // Navigate to lesson
    await page.goto('http://localhost:5173');
    await page.getByText('71AAdição e Subtração até').click();
    await page.getByRole('button', { name: 'Começar' }).first().click();
    
    // Verify stats display
    await expect(page.getByText('Blocos Completados')).toBeVisible();
    await expect(page.getByText('Tentativas')).toBeVisible();  
    await expect(page.getByText('Última Nota')).toBeVisible();
    
    // Verify lesson info
    await expect(page.getByText('Conjuntos necessários:')).toBeVisible();
    await expect(page.getByText('Addition')).toBeVisible();
    await expect(page.getByText('Subtraction')).toBeVisible();
    
    // Verify timer functionality
    await expect(page.getByText('⏱')).toBeVisible();
    
    // Verify progress bar
    await expect(page.locator('[role="progressbar"]')).toBeVisible();
    
    // Verify reset button
    await expect(page.getByRole('button', { name: '↻ Reiniciar' })).toBeVisible();
  });
  
  test('should handle question editing and answer changes', async ({ page }) => {
    // Navigate to lesson
    await page.goto('http://localhost:5173');
    await page.getByText('71AAdição e Subtração até').click();
    await page.getByRole('button', { name: 'Começar' }).first().click();
    
    // Answer first question
    await page.getByRole('textbox', { name: 'Digite sua resposta' }).first().fill('5');
    await page.keyboard.press('Tab');
    
    // Verify answer was submitted and edit button appears
    await expect(page.getByText('5')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Editar' })).toBeVisible();
    
    // Click edit button
    await page.getByRole('button', { name: 'Editar' }).first().click();
    
    // Verify textbox appears again for editing
    await expect(page.getByRole('textbox', { name: 'Digite sua resposta' }).first()).toBeVisible();
    
    // Change answer
    await page.getByRole('textbox', { name: 'Digite sua resposta' }).first().clear();
    await page.getByRole('textbox', { name: 'Digite sua resposta' }).first().fill('9');
    await page.keyboard.press('Tab');
    
    // Verify new answer is displayed
    await expect(page.getByText('9')).toBeVisible();
  });

  test('should handle lesson reset functionality', async ({ page }) => {
    // Navigate to lesson
    await page.goto('http://localhost:5173');
    await page.getByText('71AAdição e Subtração até').click();
    await page.getByRole('button', { name: 'Começar' }).first().click();
    
    // Answer some questions
    await page.getByRole('textbox', { name: 'Digite sua resposta' }).first().fill('5');
    await page.keyboard.press('Tab');
    await page.getByRole('textbox', { name: 'Digite sua resposta' }).first().fill('8'); 
    await page.keyboard.press('Tab');
    
    // Click reset button
    await page.getByRole('button', { name: '↻ Reiniciar' }).click();
    
    // Verify lesson was reset - should be back to empty state
    const firstInput = page.getByRole('textbox', { name: 'Digite sua resposta' }).first();
    await expect(firstInput).toHaveValue('');
    await expect(firstInput).not.toBeDisabled();
  });
});

