import { test, expect } from '@playwright/test';

test.describe('Forms (negative tests)', () => {
  test('TC-08 contact form rejects an empty submission', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-contact').click();
    await page.getByTestId('contact-submit').click();
    for (const id of ['first-name-error', 'last-name-error', 'email-error', 'subject-error', 'message-error']) {
      await expect(page.getByTestId(id)).toContainText('is required');
    }
  });

  test('TC-09 login with a wrong password is rejected with a clear message', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-sign-in').click();
    await page.getByTestId('email').fill('nobody@example.com');
    await page.getByTestId('password').fill('wrong-password-1');
    await page.getByTestId('login-submit').click();
    await expect(page.getByTestId('login-error')).toContainText('Invalid email or password');
    await expect(page).toHaveURL(/login/);
  });
});
