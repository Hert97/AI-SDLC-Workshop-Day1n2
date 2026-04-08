import { test, expect } from '@playwright/test';
import { registerUser, createTodo } from './helpers';

test.describe('Template System', () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page, `test-templates-${Date.now()}`);
  });

  test('save template button is visible', async ({ page }) => {
    await expect(page.locator('[data-testid="save-template-button"]')).toBeVisible();
  });

  test('use template button is visible', async ({ page }) => {
    await expect(page.locator('[data-testid="use-template-button"]')).toBeVisible();
  });

  test('user can save current form as template', async ({ page }) => {
    await page.fill('[data-testid="new-todo-input"]', 'Template todo');
    await page.click('[data-testid="save-template-button"]');
    await expect(page.locator('[data-testid="template-name-input"]')).toBeVisible();
    await page.fill('[data-testid="template-name-input"]', 'My Template');
    await page.click('[data-testid="confirm-save-template"]');
    await expect(page.locator('[data-testid="template-saved-message"]')).toBeVisible();
  });

  test('user can view saved templates', async ({ page }) => {
    // Save a template first
    await page.fill('[data-testid="new-todo-input"]', 'Template todo');
    await page.click('[data-testid="save-template-button"]');
    await page.fill('[data-testid="template-name-input"]', 'View Template');
    await page.click('[data-testid="confirm-save-template"]');

    await page.click('[data-testid="use-template-button"]');
    await expect(page.locator('[data-testid="template-item"]').filter({ hasText: 'View Template' })).toBeVisible();
  });

  test('user can create todo from template', async ({ page }) => {
    await page.fill('[data-testid="new-todo-input"]', 'From template');
    await page.click('[data-testid="save-template-button"]');
    await page.fill('[data-testid="template-name-input"]', 'Quick Template');
    await page.click('[data-testid="confirm-save-template"]');

    await page.click('[data-testid="use-template-button"]');
    await page.click('[data-testid="apply-template-button"]');
    await expect(page.locator('[data-testid="todo-title"]').filter({ hasText: 'From template' })).toBeVisible();
  });

  test('user can delete a template', async ({ page }) => {
    await page.fill('[data-testid="new-todo-input"]', 'Delete template');
    await page.click('[data-testid="save-template-button"]');
    await page.fill('[data-testid="template-name-input"]', 'Delete Me');
    await page.click('[data-testid="confirm-save-template"]');

    await page.click('[data-testid="use-template-button"]');
    await page.click('[data-testid="delete-template-button"]');
    await expect(page.locator('[data-testid="template-item"]').filter({ hasText: 'Delete Me' })).toHaveCount(0);
  });

  test('template count shows in template manager', async ({ page }) => {
    await page.fill('[data-testid="new-todo-input"]', 'Template count test');
    await page.click('[data-testid="save-template-button"]');
    await page.fill('[data-testid="template-name-input"]', 'Count Template');
    await page.click('[data-testid="confirm-save-template"]');

    await page.click('[data-testid="use-template-button"]');
    await expect(page.locator('[data-testid="template-item"]')).toHaveCount(1);
  });

  test('todos created from template appear in pending list', async ({ page }) => {
    await createTodo(page, 'Pre-existing');
    await page.fill('[data-testid="new-todo-input"]', 'Template task title');
    await page.click('[data-testid="save-template-button"]');
    await page.fill('[data-testid="template-name-input"]', 'Task Template');
    await page.click('[data-testid="confirm-save-template"]');

    await page.click('[data-testid="use-template-button"]');
    await page.click('[data-testid="apply-template-button"]');
    await expect(page.locator('[data-testid="todo-title"]')).toHaveCount(2);
  });
});
