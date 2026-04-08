import { test, expect } from '@playwright/test';
import { registerUser, createTodo } from './helpers';

test.describe('Search & Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page, `test-filter-${Date.now()}`);
    await createTodo(page, 'Buy groceries', { priority: 'high' });
    await createTodo(page, 'Read a book', { priority: 'low' });
    await createTodo(page, 'Buy flowers', { priority: 'medium' });
  });

  test('search input is visible', async ({ page }) => {
    await expect(page.locator('[data-testid="search-input"]')).toBeVisible();
  });

  test('search filters todos by title', async ({ page }) => {
    await page.fill('[data-testid="search-input"]', 'Buy');
    await expect(page.locator('[data-testid="todo-title"]')).toHaveCount(2);
    await expect(page.locator('[data-testid="todo-title"]').filter({ hasText: 'Read a book' })).toHaveCount(0);
  });

  test('search is case-insensitive', async ({ page }) => {
    await page.fill('[data-testid="search-input"]', 'buy');
    await expect(page.locator('[data-testid="todo-title"]')).toHaveCount(2);
  });

  test('priority filter shows only matching todos', async ({ page }) => {
    await page.selectOption('[data-testid="priority-filter"]', 'high');
    await expect(page.locator('[data-testid="todo-title"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="todo-title"]').filter({ hasText: 'Buy groceries' })).toBeVisible();
  });

  test('completion filter shows only pending todos', async ({ page }) => {
    await page.locator('[data-testid="todo-checkbox"]').first().click();
    await page.selectOption('[data-testid="completion-filter"]', 'pending');
    const titles = await page.locator('[data-testid="todo-title"]').all();
    // After completing one, pending should show 2 remaining
    expect(titles.length).toBe(2);
  });

  test('completion filter shows only completed todos', async ({ page }) => {
    await page.locator('[data-testid="todo-checkbox"]').first().click();
    await page.selectOption('[data-testid="completion-filter"]', 'completed');
    await expect(page.locator('[data-testid="todo-title"]')).toHaveCount(1);
  });

  test('clear filters button resets all filters', async ({ page }) => {
    await page.fill('[data-testid="search-input"]', 'Buy');
    await page.selectOption('[data-testid="priority-filter"]', 'high');
    await expect(page.locator('[data-testid="todo-title"]')).toHaveCount(1);
    await page.click('[data-testid="clear-filters-button"]');
    await expect(page.locator('[data-testid="todo-title"]')).toHaveCount(3);
  });

  test('filter presets can be saved and loaded', async ({ page }) => {
    await page.fill('[data-testid="search-input"]', 'Buy');
    await page.click('[data-testid="save-filter-preset-button"]');
    await page.fill('[data-testid="preset-name-input"]', 'Buy Filter');
    await page.click('[data-testid="confirm-save-preset"]');
    await expect(page.locator('[data-testid="filter-preset"]').filter({ hasText: 'Buy Filter' })).toBeVisible();
  });
});
