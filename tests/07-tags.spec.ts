import { test, expect } from '@playwright/test';
import { registerUser, createTodo } from './helpers';

test.describe('Tag System', () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page, `test-tags-${Date.now()}`);
  });

  test('tag management button is visible', async ({ page }) => {
    await expect(page.locator('[data-testid="manage-tags-button"]')).toBeVisible();
  });

  test('user can create a new tag', async ({ page }) => {
    await page.click('[data-testid="manage-tags-button"]');
    await page.fill('[data-testid="new-tag-input"]', 'Work');
    await page.click('[data-testid="create-tag-button"]');
    await expect(page.locator('[data-testid="tag-item"]').filter({ hasText: 'Work' })).toBeVisible();
  });

  test('duplicate tag name is rejected', async ({ page }) => {
    await page.click('[data-testid="manage-tags-button"]');
    await page.fill('[data-testid="new-tag-input"]', 'Unique');
    await page.click('[data-testid="create-tag-button"]');
    await page.fill('[data-testid="new-tag-input"]', 'Unique');
    await page.click('[data-testid="create-tag-button"]');
    await expect(page.locator('[data-testid="tag-item"]').filter({ hasText: 'Unique' })).toHaveCount(1);
  });

  test('user can assign tag to a todo', async ({ page }) => {
    await page.click('[data-testid="manage-tags-button"]');
    await page.fill('[data-testid="new-tag-input"]', 'Personal');
    await page.click('[data-testid="create-tag-button"]');
    await page.keyboard.press('Escape');

    await createTodo(page, 'Tagged todo');
    await page.click('[data-testid="edit-todo-button"]');
    await page.click('[data-testid="tag-checkbox-option"]');
    await page.click('[data-testid="save-todo-button"]');
    await expect(page.locator('[data-testid="todo-tag"]').filter({ hasText: 'Personal' })).toBeVisible();
  });

  test('user can delete a tag', async ({ page }) => {
    await page.click('[data-testid="manage-tags-button"]');
    await page.fill('[data-testid="new-tag-input"]', 'DeleteMe');
    await page.click('[data-testid="create-tag-button"]');
    await page.click('[data-testid="delete-tag-button"]');
    await expect(page.locator('[data-testid="tag-item"]').filter({ hasText: 'DeleteMe' })).toHaveCount(0);
  });

  test('tags appear as chips on todos', async ({ page }) => {
    await page.click('[data-testid="manage-tags-button"]');
    await page.fill('[data-testid="new-tag-input"]', 'Chip');
    await page.click('[data-testid="create-tag-button"]');
    await page.keyboard.press('Escape');

    await createTodo(page, 'Todo with chip');
    await page.click('[data-testid="edit-todo-button"]');
    await page.click('[data-testid="tag-checkbox-option"]');
    await page.click('[data-testid="save-todo-button"]');
    await expect(page.locator('[data-testid="todo-tag"]')).toBeVisible();
  });
});
