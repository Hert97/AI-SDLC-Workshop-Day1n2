import { Page, expect } from '@playwright/test';

export async function registerUser(page: Page, username: string): Promise<void> {
  await page.goto('/login');
  // Set up virtual WebAuthn authenticator
  const client = await page.context().newCDPSession(page);
  await client.send('WebAuthn.enable');
  await client.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
    },
  });

  await page.fill('[data-testid="username-input"]', username);
  await page.click('[data-testid="register-button"]');
  await expect(page).toHaveURL('/', { timeout: 10_000 });
}

export async function loginUser(page: Page, username: string): Promise<void> {
  await page.goto('/login');
  const client = await page.context().newCDPSession(page);
  await client.send('WebAuthn.enable');
  await client.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
    },
  });

  await page.fill('[data-testid="username-input"]', username);
  await page.click('[data-testid="login-button"]');
  await expect(page).toHaveURL('/', { timeout: 10_000 });
}

export async function createTodo(
  page: Page,
  title: string,
  options: {
    priority?: 'high' | 'medium' | 'low';
    dueDate?: string;
  } = {}
): Promise<void> {
  await page.fill('[data-testid="new-todo-input"]', title);

  if (options.priority) {
    await page.selectOption('[data-testid="new-todo-priority"]', options.priority);
  }

  if (options.dueDate) {
    await page.fill('[data-testid="new-todo-due-date"]', options.dueDate);
  }

  await page.click('[data-testid="add-todo-button"]');
  await expect(page.locator(`[data-testid="todo-title"]`).filter({ hasText: title })).toBeVisible({ timeout: 5_000 });
}
