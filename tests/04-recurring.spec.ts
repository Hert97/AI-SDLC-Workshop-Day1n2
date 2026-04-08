import { test, expect, Page } from '@playwright/test';
import { registerUser } from './helpers';

async function createRecurringTodo(page: Page, title: string, pattern: string): Promise<void> {
  await page.fill('[data-testid="new-todo-input"]', title);
  // Set a future due date (tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  const iso = tomorrow.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
  await page.fill('[data-testid="new-todo-due-date"]', iso);
  await page.check('[data-testid="new-todo-recurring"]');
  await page.selectOption('[data-testid="new-todo-recurrence-pattern"]', pattern);
  await page.click('[data-testid="add-todo-button"]');
  await expect(page.locator('[data-testid="todo-title"]').filter({ hasText: title })).toBeVisible({ timeout: 5_000 });
}

test.describe('Recurring Todos', () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page, `test-recur-${Date.now()}`);
  });

  test('recurring toggle is visible in new todo form', async ({ page }) => {
    await expect(page.locator('[data-testid="new-todo-recurring"]')).toBeVisible();
  });

  test('pattern selector appears when recurring is checked', async ({ page }) => {
    await page.check('[data-testid="new-todo-recurring"]');
    await expect(page.locator('[data-testid="new-todo-recurrence-pattern"]')).toBeVisible();
  });

  test('user can create a daily recurring todo', async ({ page }) => {
    await createRecurringTodo(page, 'Daily standup', 'daily');
    await expect(page.locator('[data-testid="recurrence-badge"]').first()).toContainText(/daily/i);
  });

  test('user can create a weekly recurring todo', async ({ page }) => {
    await createRecurringTodo(page, 'Weekly review', 'weekly');
    await expect(page.locator('[data-testid="recurrence-badge"]').first()).toContainText(/weekly/i);
  });

  test('completing a recurring todo creates a next occurrence', async ({ page }) => {
    await createRecurringTodo(page, 'Recurring task', 'daily');
    const initialCount = await page.locator('[data-testid="todo-title"]').count();
    await page.locator('[data-testid="todo-checkbox"]').first().click();
    // After completing a recurring todo, a new occurrence should appear
    await expect(page.locator('[data-testid="todo-title"]')).toHaveCount(initialCount);
  });

  test('recurring icon is shown on recurring todos', async ({ page }) => {
    await createRecurringTodo(page, 'Show recurring icon', 'weekly');
    await expect(page.locator('[data-testid="recurrence-badge"]').first()).toBeVisible();
  });
});
