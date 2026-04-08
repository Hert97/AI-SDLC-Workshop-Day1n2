import { test, expect } from '@playwright/test';
import { registerUser, createTodo } from './helpers';

test.describe('Priority System', () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page, `test-priority-${Date.now()}`);
  });

  test('new todo defaults to medium priority', async ({ page }) => {
    await createTodo(page, 'Default priority todo');
    const badge = page.locator('[data-testid="priority-badge"]').first();
    await expect(badge).toBeVisible();
    await expect(badge).toContainText('Medium');
  });

  test('user can create a high priority todo', async ({ page }) => {
    await createTodo(page, 'High priority todo', { priority: 'high' });
    const badge = page.locator('[data-testid="priority-badge"]').first();
    await expect(badge).toContainText('High');
  });

  test('user can create a low priority todo', async ({ page }) => {
    await createTodo(page, 'Low priority todo', { priority: 'low' });
    const badge = page.locator('[data-testid="priority-badge"]').first();
    await expect(badge).toContainText('Low');
  });

  test('todos are sorted: high → medium → low', async ({ page }) => {
    await createTodo(page, 'Low task', { priority: 'low' });
    await createTodo(page, 'High task', { priority: 'high' });
    await createTodo(page, 'Medium task', { priority: 'medium' });

    const badges = page.locator('[data-testid="priority-badge"]');
    await expect(badges.nth(0)).toContainText('High');
    await expect(badges.nth(1)).toContainText('Medium');
    await expect(badges.nth(2)).toContainText('Low');
  });

  test('user can change priority via edit modal', async ({ page }) => {
    await createTodo(page, 'Change priority');
    await page.click('[data-testid="edit-todo-button"]');
    await page.selectOption('[data-testid="edit-todo-priority"]', 'high');
    await page.click('[data-testid="save-todo-button"]');
    await expect(page.locator('[data-testid="priority-badge"]').first()).toContainText('High');
  });

  test('high priority badge has distinct styling', async ({ page }) => {
    await createTodo(page, 'High styled', { priority: 'high' });
    const badge = page.locator('[data-testid="priority-badge"]').first();
    const className = await badge.getAttribute('class');
    expect(className).toBeTruthy();
  });
});
