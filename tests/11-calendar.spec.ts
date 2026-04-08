import { test, expect } from '@playwright/test';
import { registerUser, createTodo } from './helpers';
import { getSingaporeNow } from '../lib/timezone';

function getSingaporeDateStr(): string {
  const now = new Date();
  const sgOptions = { timeZone: 'Asia/Singapore' };
  const year = new Intl.DateTimeFormat('en', { year: 'numeric', ...sgOptions }).format(now);
  const month = new Intl.DateTimeFormat('en', { month: '2-digit', ...sgOptions }).format(now);
  const day = new Intl.DateTimeFormat('en', { day: '2-digit', ...sgOptions }).format(now);
  return `${year}-${month}-${day}`;
}

test.describe('Calendar View', () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page, `test-calendar-${Date.now()}`);
  });

  test('calendar page is accessible', async ({ page }) => {
    await page.goto('/calendar');
    await expect(page).toHaveURL('/calendar');
  });

  test('calendar shows current month label', async ({ page }) => {
    await page.goto('/calendar');
    await expect(page.locator('[data-testid="calendar-month-label"]')).toBeVisible();
  });

  test('previous month button works', async ({ page }) => {
    await page.goto('/calendar');
    const initialLabel = await page.locator('[data-testid="calendar-month-label"]').textContent();
    await page.click('[data-testid="prev-month-btn"]');
    const newLabel = await page.locator('[data-testid="calendar-month-label"]').textContent();
    expect(newLabel).not.toBe(initialLabel);
  });

  test('next month button works', async ({ page }) => {
    await page.goto('/calendar');
    const initialLabel = await page.locator('[data-testid="calendar-month-label"]').textContent();
    await page.click('[data-testid="next-month-btn"]');
    const newLabel = await page.locator('[data-testid="calendar-month-label"]').textContent();
    expect(newLabel).not.toBe(initialLabel);
  });

  test('today button navigates back to current month', async ({ page }) => {
    await page.goto('/calendar');
    const initialLabel = await page.locator('[data-testid="calendar-month-label"]').textContent();
    await page.click('[data-testid="next-month-btn"]');
    await page.click('[data-testid="today-btn"]');
    const restoreLabel = await page.locator('[data-testid="calendar-month-label"]').textContent();
    expect(restoreLabel).toBe(initialLabel);
  });

  test('calendar shows day cells', async ({ page }) => {
    await page.goto('/calendar');
    await expect(page.locator('[data-testid^="calendar-day-"]').first()).toBeVisible();
  });

  test('clicking a day opens a modal', async ({ page }) => {
    await page.goto('/calendar');
    const todayKey = getSingaporeDateStr();
    const dayCell = page.locator(`[data-testid="calendar-day-${todayKey}"]`);
    if (await dayCell.isVisible()) {
      await dayCell.click();
      await expect(page.locator('[data-testid="day-modal"]')).toBeVisible();
    }
  });

  test('todos with due dates appear on correct calendar day', async ({ page }) => {
    const todayKey = getSingaporeDateStr();
    const now = new Date();
    // Ensure a future time today (add 2 hours to avoid past-time validation)
    const future = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const iso = future.toISOString().slice(0, 16);

    await page.goto('/');
    await page.fill('[data-testid="new-todo-input"]', 'Calendar todo');
    await page.fill('[data-testid="new-todo-due-date"]', iso);
    await page.click('[data-testid="add-todo-button"]');

    await page.goto('/calendar');
    const dayCell = page.locator(`[data-testid="calendar-day-${todayKey}"]`);
    if (await dayCell.isVisible()) {
      await expect(dayCell).toContainText('Calendar todo');
    }
  });
});
