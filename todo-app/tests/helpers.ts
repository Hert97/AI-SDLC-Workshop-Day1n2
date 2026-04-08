import { Page } from '@playwright/test';

export async function createTodo(page: Page, title: string) {
  await page.fill('input[placeholder="What do you need to do?"]', title);
  await page.click('button:has-text("Add")');
}
