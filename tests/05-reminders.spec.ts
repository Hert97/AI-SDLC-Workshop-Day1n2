import { test, expect, Page } from '@playwright/test';
import { registerUser } from './helpers';

async function createTodoWithReminder(page: Page, title: string, reminderMinutes: string): Promise<void> {
  const future = new Date();
  future.setDate(future.getDate() + 1);
  future.setHours(10, 0, 0, 0);
  const iso = future.toISOString().slice(0, 16);

  await page.fill('[data-testid="new-todo-input"]', title);
  await page.fill('[data-testid="new-todo-due-date"]', iso);
  await page.selectOption('[data-testid="new-todo-reminder"]', reminderMinutes);
  await page.click('[data-testid="add-todo-button"]');
  await expect(page.locator('[data-testid="todo-title"]').filter({ hasText: title })).toBeVisible({ timeout: 5_000 });
}

test.describe('Reminders & Notifications', () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page, `test-reminder-${Date.now()}`);
  });

  test('reminder dropdown is visible in new todo form', async ({ page }) => {
    await expect(page.locator('[data-testid="new-todo-reminder"]')).toBeVisible();
  });

  test('user can set a 15-minute reminder', async ({ page }) => {
    await createTodoWithReminder(page, 'Remind me soon', '15');
    await expect(page.locator('[data-testid="reminder-badge"]').first()).toBeVisible();
  });

  test('user can set a 1-hour reminder', async ({ page }) => {
    await createTodoWithReminder(page, 'Remind in 1h', '60');
    await expect(page.locator('[data-testid="reminder-badge"]').first()).toBeVisible();
  });

  test('user can set a 1-day reminder', async ({ page }) => {
    await createTodoWithReminder(page, 'Remind tomorrow', '1440');
    await expect(page.locator('[data-testid="reminder-badge"]').first()).toBeVisible();
  });

  test('notification permission button is visible', async ({ page }) => {
    await expect(page.locator('[data-testid="notification-btn"]')).toBeVisible();
  });

  test('reminder is shown in edit modal', async ({ page }) => {
    await createTodoWithReminder(page, 'Edit reminder', '30');
    await page.click('[data-testid="edit-todo-button"]');
    const editReminder = page.locator('[data-testid="edit-todo-reminder"]');
    await expect(editReminder).toBeVisible();
    await expect(editReminder).toHaveValue('30');
  });
});
