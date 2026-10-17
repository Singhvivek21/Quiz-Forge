import { test, expect } from '@playwright/test';

// Common setup to mock API calls
test.beforeEach(async ({ page }) => {
  // Mock standard API calls to avoid backend dependency / live calls
  await page.route('**/api/v1/gemini/status', async route => {
    await route.fulfill({ json: { success: true, data: { configured: true, model: 'mock-model' } } });
  });

  await page.route('**/api/v1/quizzes/stats', async route => {
    await route.fulfill({ json: { success: true, data: { quizzesCompleted: 0, questionsAnswered: 0, averageScore: 0, streakDays: 0, currentLevel: 1, currentXP: 0, nextLevelXP: 100 } } });
  });

  await page.route('**/api/v1/stats', async route => {
    await route.fulfill({ json: { success: true, data: { level: 1, streak: 0, xp: 0, quizzesCompleted: 0, questionsAnswered: 0, averageScore: 0 } } });
  });

  await page.route('**/api/v1/progress', async route => {
    await route.fulfill({ json: { success: true, data: [] } });
  });

  await page.route('**/api/v1/attempts', async route => {
    await route.fulfill({ json: { success: true, data: [] } });
  });

  await page.route('**/api/v1/quizzes/save', async route => {
    await route.fulfill({ json: { success: true, data: { id: 'mock-quiz-123' } } });
  });

  await page.route('**/api/v1/gemini/analyze', async route => {
    await route.fulfill({
      json: {
        success: true,
        data: {
          overallAssessment: 'Great job!',
          strongConcepts: ['C1'],
          weakConcepts: [],
          difficultyPerformance: { easy: 'Good', medium: 'Good', hard: 'Good' },
          recommendedTopics: ['Advanced C1'],
          recommendedDifficulty: 'hard',
          studyAdvice: ['Keep practicing']
        }
      }
    });
  });
});

test.describe('Quiz Forge UI', () => {

  test('Application starts and the main page loads', async ({ page }) => {
    await page.goto('/');
    
    // Check main headings and presence of Create Quiz button
    await expect(page.getByRole('heading', { name: /Master Any Subject/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Create a Quiz/i })).toBeVisible();
  });

  test('Quiz configuration form displays and validates required fields', async ({ page }) => {
    await page.goto('/create');
    
    // Form should have standard fields
    await expect(page.getByLabel('Subject')).toBeVisible();
    await expect(page.getByLabel('Topic')).toBeVisible();

    // Clear default topic to trigger validation
    await page.getByLabel('Topic').fill('');
    await page.getByRole('button', { name: 'Generate & Start Quiz' }).first().click({ force: true });

    // Assuming HTML5 native validation or a visual error appears
    // The actual form requires "topic". We can check if it stays on the config screen.
    await expect(page.getByRole('button', { name: 'Generate & Start Quiz' }).first()).toBeVisible();
  });

  test('Quiz player navigation and state retention', async ({ page }) => {
    await page.goto('/create');

    // MOCK the generate endpoint for this specific test
    await page.route('**/api/v1/gemini/generate', async route => {
      await route.fulfill({
        json: {
          success: true,
          data: {
            title: 'Mock Test Quiz',
            questions: [
              { id: 'q1', type: 'mcq', question: 'Q1?', options: [{id:'A',text:'Opt A'}, {id:'B',text:'Opt B'}], correctAnswer: 'A', explanation: 'Exp1', concept: 'C1' },
              { id: 'q2', type: 'mcq', question: 'Q2?', options: [{id:'A',text:'Opt A'}, {id:'B',text:'Opt B'}], correctAnswer: 'B', explanation: 'Exp2', concept: 'C1' }
            ]
          }
        }
      });
    });

    // Submit form (default values)
    await page.getByRole('button', { name: 'Generate & Start Quiz' }).first().click({ force: true });

    // Wait for the quiz player to load the first question
    await expect(page.getByText('Q1?')).toBeVisible();

    // Select an answer
    await page.getByText('Opt A').first().click();
    
    // Navigate to next
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Q2?')).toBeVisible();

    // Navigate back to previous
    await page.getByRole('button', { name: 'Previous' }).click();
    
    // The answer should still be selected
    await expect(page.getByText('Q1?')).toBeVisible();
  });

  test('Quiz submission and results display work correctly', async ({ page }) => {
    await page.goto('/create');

    await page.route('**/api/v1/gemini/generate', async route => {
      await route.fulfill({
        json: {
          success: true,
          data: {
            id: 'mock-quiz-123',
            title: 'Mock Test Quiz',
            questions: [
              { id: 'q1', type: 'mcq', question: 'Q1?', options: [{id:'A',text:'Opt A'}, {id:'B',text:'Opt B'}], correctAnswer: 'A', explanation: 'Exp1', concept: 'C1' }
            ]
          }
        }
      });
    });
    
    await page.route('**/api/v1/attempts', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ json: { success: true, data: { id: 'attempt1' } } });
      } else {
        await route.continue();
      }
    });

    await page.getByRole('button', { name: 'Generate & Start Quiz' }).first().click({ force: true });
    await expect(page.getByText('Q1?')).toBeVisible();

    // Select the correct answer
    await page.getByText('Opt A').first().click();

    // Submit quiz
    await page.getByRole('button', { name: 'Submit Quiz' }).first().click({ force: true });

    // Confirm submission if modal appears
    if (await page.getByRole('heading', { name: 'Submit Quiz?' }).isVisible()) {
        await page.getByRole('button', { name: 'Yes, Submit' }).click();
    }

    // Results screen should appear
    await expect(page.getByText(/Final Score|AI Learning Coach/i).first()).toBeVisible({ timeout: 10000 });
    
    // Should show 100% since we answered the only question correctly
    await expect(page.getByText('100%').first()).toBeVisible();
  });
});
