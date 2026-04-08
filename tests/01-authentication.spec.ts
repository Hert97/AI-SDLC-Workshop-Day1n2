import { test, expect } from '@playwright/test';
import { registerUser } from './helpers';

const TEST_USER = `test-auth-${Date.now()}`;

test.describe('Authentication - WebAuthn/Passkeys', () => {
  test('login page is accessible and shows register/login buttons', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('[data-testid="username-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="register-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
  });

  test('unauthenticated user is redirected from / to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/login');
  });

  test('unauthenticated user is redirected from /calendar to /login', async ({ page }) => {
    await page.goto('/calendar');
    await expect(page).toHaveURL('/login');
  });

  test('user can register with a passkey and reach the main page', async ({ page }) => {
    const client = await page.context().newCDPSession(page);
    await page.goto('/login');
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

    await page.fill('[data-testid="username-input"]', TEST_USER);
    await page.click('[data-testid="register-button"]');
    await expect(page).toHaveURL('/', { timeout: 10_000 });
  });

  test('authenticated user is redirected away from /login to /', async ({ page }) => {
    await registerUser(page, `test-redirect-${Date.now()}`);
    await page.goto('/login');
    await expect(page).toHaveURL('/');
  });

  test('user can logout and is redirected to /login', async ({ page }) => {
    await registerUser(page, `test-logout-${Date.now()}`);
    await page.click('[data-testid="logout-button"]');
    await expect(page).toHaveURL('/login');
  });

  test('registering with an empty username shows error', async ({ page }) => {
    await page.goto('/login');
    await page.click('[data-testid="register-button"]');
    await expect(page.locator('[data-testid="auth-error"]')).toBeVisible();
  });
});
