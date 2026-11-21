import { test, expect } from '@playwright/test';
import { registerUser } from './support/env';

test.describe('Checkout (logged-in user, end to end)', () => {
  test('E2E-01 a logged-in customer can buy a product and sees the invoice in their account', async ({ page, request, baseURL }) => {
    test.setTimeout(180_000); // long journey, slow registration, possible connection retries

    // Arrange: the user is created through the API. Registration is not what this
    // test is about, so we do not spend UI steps on it.
    const user = await test.step('create a fresh user via API', () => registerUser(request, baseURL));

    await test.step('sign in through the UI', async () => {
      await page.goto('/');
      await page.getByTestId('nav-sign-in').click();
      await page.getByTestId('email').fill(user.email);
      await page.getByTestId('password').fill(user.password);
      await page.getByTestId('login-submit').click();
      await expect(page).toHaveURL(/account/);
      await expect(page.getByTestId('nav-menu')).toContainText(`${user.firstName} ${user.lastName}`);
    });

    const expectedTotal = await test.step('add 2 units of the first product to the cart', async () => {
      await page.getByTestId('nav-home').click();
      await page.getByTestId('product-name').first().click();
      const unit = Number(await page.getByTestId('unit-price').textContent());
      await page.getByTestId('quantity').fill('2');
      await page.getByTestId('add-to-cart').click();
      await expect(page.getByTestId('cart-quantity')).toHaveText('2');
      return `$${(unit * 2).toFixed(2)}`;
    });

    await test.step('step 1: cart', async () => {
      await page.getByTestId('nav-cart').click();
      await expect(page.getByTestId('cart-total')).toHaveText(expectedTotal);
      await page.getByTestId('proceed-1').click();
    });

    await test.step('step 2: already signed in', async () => {
      await expect(page.getByText('you are already logged in')).toBeVisible();
      await page.getByTestId('proceed-2').click();
    });

    await test.step('step 3: billing address', async () => {
      // Negative check inside the journey: the form must block an incomplete address.
      await expect(page.getByTestId('proceed-3')).toBeDisabled();
      await page.getByTestId('house_number').fill('12');
      await expect(page.getByTestId('proceed-3')).toBeEnabled();
      await page.getByTestId('proceed-3').click();
    });

    const invoiceNumber = await test.step('step 4: pay and confirm', async () => {
      await expect(page.getByTestId('finish')).toBeDisabled(); // no payment method yet
      await page.getByTestId('payment-method').selectOption({ label: 'Cash on Delivery' });
      await page.getByTestId('finish').click();
      await expect(page.getByTestId('payment-success-message')).toHaveText('Payment was successful');
      await page.getByTestId('finish').click();
      const confirmation = page.locator('#order-confirmation');
      await expect(confirmation).toContainText(/Your invoice number is INV-\d+/);
      return (await confirmation.textContent())!.match(/INV-\d+/)![0];
    });

    await test.step('cart is emptied after the order', async () => {
      await expect(page.getByTestId('cart-quantity')).toHaveCount(0);
    });

    await test.step('the invoice is listed in the account with the right total', async () => {
      await page.getByTestId('nav-menu').click();
      await page.getByTestId('nav-my-invoices').click();
      const row = page.locator('tbody tr', { hasText: invoiceNumber });
      await expect(row).toBeVisible();
      await expect(row).toContainText(expectedTotal);
    });
  });
});
