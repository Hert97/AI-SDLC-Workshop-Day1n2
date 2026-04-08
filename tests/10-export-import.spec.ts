import { test, expect } from '@playwright/test';
import { registerUser, createTodo } from './helpers';
import path from 'path';
import fs from 'fs';
import os from 'os';

test.describe('Export & Import', () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page, `test-export-${Date.now()}`);
    await createTodo(page, 'Export todo one', { priority: 'high' });
    await createTodo(page, 'Export todo two', { priority: 'low' });
  });

  test('export JSON button is visible', async ({ page }) => {
    await expect(page.locator('[data-testid="export-json-button"]')).toBeVisible();
  });

  test('export CSV button is visible', async ({ page }) => {
    await expect(page.locator('[data-testid="export-csv-button"]')).toBeVisible();
  });

  test('import button is visible', async ({ page }) => {
    await expect(page.locator('[data-testid="import-button"]')).toBeVisible();
  });

  test('JSON export downloads a file', async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="export-json-button"]'),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.json$/);
  });

  test('CSV export downloads a file', async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="export-csv-button"]'),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.csv$/);
  });

  test('user can import todos from JSON file', async ({ page }) => {
    const importData = {
      todos: [
        { title: 'Imported todo', priority: 'medium', completed: false, subtasks: [], tags: [] },
      ],
    };
    const tmpFile = path.join(os.tmpdir(), `import-test-${Date.now()}.json`);
    fs.writeFileSync(tmpFile, JSON.stringify(importData));

    const fileInput = page.locator('[data-testid="import-file-input"]');
    await fileInput.setInputFiles(tmpFile);
    await expect(page.locator('[data-testid="todo-title"]').filter({ hasText: 'Imported todo' })).toBeVisible({ timeout: 5_000 });

    fs.unlinkSync(tmpFile);
  });

  test('import merges todos with existing ones', async ({ page }) => {
    const initialCount = await page.locator('[data-testid="todo-title"]').count();

    const importData = {
      todos: [
        { title: 'New imported', priority: 'low', completed: false, subtasks: [], tags: [] },
      ],
    };
    const tmpFile = path.join(os.tmpdir(), `import-merge-${Date.now()}.json`);
    fs.writeFileSync(tmpFile, JSON.stringify(importData));

    await page.locator('[data-testid="import-file-input"]').setInputFiles(tmpFile);
    await expect(page.locator('[data-testid="todo-title"]')).toHaveCount(initialCount + 1, { timeout: 5_000 });

    fs.unlinkSync(tmpFile);
  });
});
