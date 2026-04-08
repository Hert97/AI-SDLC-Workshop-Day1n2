import { test, expect } from '@playwright/test';
import { registerUser, createTodo } from './helpers';

test.describe('Subtasks & Progress Tracking', () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page, `test-subtask-${Date.now()}`);
    await createTodo(page, 'Parent todo');
  });

  test('subtask input appears when expanding a todo', async ({ page }) => {
    await page.click('[data-testid="expand-subtasks-button"]');
    await expect(page.locator('[data-testid="subtask-input"]')).toBeVisible();
  });

  test('user can add a subtask', async ({ page }) => {
    await page.click('[data-testid="expand-subtasks-button"]');
    await page.fill('[data-testid="subtask-input"]', 'First subtask');
    await page.click('[data-testid="add-subtask-button"]');
    await expect(page.locator('[data-testid="subtask-title"]').filter({ hasText: 'First subtask' })).toBeVisible();
  });

  test('progress bar appears when subtasks exist', async ({ page }) => {
    await page.click('[data-testid="expand-subtasks-button"]');
    await page.fill('[data-testid="subtask-input"]', 'Sub one');
    await page.click('[data-testid="add-subtask-button"]');
    await expect(page.locator('[data-testid="subtask-progress"]')).toBeVisible();
  });

  test('progress updates when subtask is completed', async ({ page }) => {
    await page.click('[data-testid="expand-subtasks-button"]');
    await page.fill('[data-testid="subtask-input"]', 'Sub A');
    await page.click('[data-testid="add-subtask-button"]');
    await page.fill('[data-testid="subtask-input"]', 'Sub B');
    await page.click('[data-testid="add-subtask-button"]');

    const progress = page.locator('[data-testid="subtask-progress"]');
    await expect(progress).toContainText('0/2');
    await page.locator('[data-testid="subtask-checkbox"]').first().click();
    await expect(progress).toContainText('1/2');
  });

  test('user can delete a subtask', async ({ page }) => {
    await page.click('[data-testid="expand-subtasks-button"]');
    await page.fill('[data-testid="subtask-input"]', 'Delete subtask');
    await page.click('[data-testid="add-subtask-button"]');
    await expect(page.locator('[data-testid="subtask-title"]').filter({ hasText: 'Delete subtask' })).toBeVisible();
    await page.click('[data-testid="delete-subtask-button"]');
    await expect(page.locator('[data-testid="subtask-title"]').filter({ hasText: 'Delete subtask' })).toHaveCount(0);
  });

  test('subtask count shows on collapsed todo', async ({ page }) => {
    await page.click('[data-testid="expand-subtasks-button"]');
    await page.fill('[data-testid="subtask-input"]', 'Count sub 1');
    await page.click('[data-testid="add-subtask-button"]');
    await page.fill('[data-testid="subtask-input"]', 'Count sub 2');
    await page.click('[data-testid="add-subtask-button"]');
    await expect(page.locator('[data-testid="subtask-count"]')).toContainText('0/2');
  });
});
