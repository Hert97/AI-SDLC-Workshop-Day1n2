import { test, expect } from '@playwright/test';
import { registerUser, createTodo } from './helpers';

test.describe('Todo CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page, `test-crud-${Date.now()}`);
  });

  test('main page shows todo input and add button', async ({ page }) => {
    await expect(page.locator('[data-testid="new-todo-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="add-todo-button"]')).toBeVisible();
  });

  test('user can create a new todo', async ({ page }) => {
    await createTodo(page, 'My first todo');
    await expect(page.locator('[data-testid="todo-title"]').filter({ hasText: 'My first todo' })).toBeVisible();
  });

  test('todo title is trimmed before saving', async ({ page }) => {
    await page.fill('[data-testid="new-todo-input"]', '  Trimmed title  ');
    await page.click('[data-testid="add-todo-button"]');
    await expect(page.locator('[data-testid="todo-title"]').filter({ hasText: 'Trimmed title' })).toBeVisible();
  });

  test('empty title is not submitted', async ({ page }) => {
    await page.fill('[data-testid="new-todo-input"]', '   ');
    await page.click('[data-testid="add-todo-button"]');
    await expect(page.locator('[data-testid="todo-title"]')).toHaveCount(0);
  });

  test('todo count increases after adding todos', async ({ page }) => {
    await createTodo(page, 'Todo one');
    await createTodo(page, 'Todo two');
    await expect(page.locator('[data-testid="todo-title"]')).toHaveCount(2);
  });

  test('user can mark a todo as complete', async ({ page }) => {
    await createTodo(page, 'Complete me');
    await page.click('[data-testid="todo-checkbox"]');
    await expect(page.locator('[data-testid="todo-title"]').filter({ hasText: 'Complete me' })).toBeVisible();
  });

  test('user can edit a todo title', async ({ page }) => {
    await createTodo(page, 'Original title');
    await page.click('[data-testid="edit-todo-button"]');
    await page.fill('[data-testid="edit-todo-title"]', 'Updated title');
    await page.click('[data-testid="save-todo-button"]');
    await expect(page.locator('[data-testid="todo-title"]').filter({ hasText: 'Updated title' })).toBeVisible();
  });

  test('user can delete a todo', async ({ page }) => {
    await createTodo(page, 'Delete me');
    await expect(page.locator('[data-testid="todo-title"]').filter({ hasText: 'Delete me' })).toBeVisible();
    await page.click('[data-testid="delete-todo-button"]');
    await expect(page.locator('[data-testid="todo-title"]').filter({ hasText: 'Delete me' })).toHaveCount(0);
  });

  test('completed todos appear in completed section', async ({ page }) => {
    await createTodo(page, 'Will be completed');
    await page.click('[data-testid="todo-checkbox"]');
    await expect(page.locator('[data-testid="completed-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="completed-section"]').locator('[data-testid="todo-title"]').filter({ hasText: 'Will be completed' })).toBeVisible();
  });
});
