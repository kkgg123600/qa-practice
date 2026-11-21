import { test, expect, type Page } from '@playwright/test';

async function openFirstProduct(page: Page) {
  await page.goto('/');
  await page.getByTestId('product-name').first().click();
  await expect(page.getByTestId('add-to-cart')).toBeVisible();
}

test.describe('Product page and cart', () => {
  test('TC-05 "+" button increases the quantity from 1 to 2', async ({ page }) => {
    await openFirstProduct(page);
    await expect(page.getByTestId('quantity')).toHaveValue('1');
    await page.getByTestId('increase-quantity').click();
    await expect(page.getByTestId('quantity')).toHaveValue('2');
  });

  test('TC-06 adding a product shows a success message and updates the cart badge', async ({ page }) => {
    await openFirstProduct(page);
    await page.getByTestId('add-to-cart').click();
    await expect(page.getByRole('alert')).toContainText('Product added to shopping cart');
    await expect(page.getByTestId('cart-quantity')).toHaveText('1');
  });

  test('TC-07 cart line total equals unit price x quantity', async ({ page }) => {
    await openFirstProduct(page);
    const unit = Number(await page.getByTestId('unit-price').textContent());
    await page.getByTestId('quantity').fill('3');
    await page.getByTestId('add-to-cart').click();
    await expect(page.getByTestId('cart-quantity')).toHaveText('3');
    await page.getByTestId('nav-cart').click();
    await expect(page.getByTestId('product-quantity')).toHaveValue('3');
    const expected = `$${(unit * 3).toFixed(2)}`;
    await expect(page.getByTestId('line-price')).toHaveText(expected);
    await expect(page.getByTestId('cart-total')).toHaveText(expected);
  });
});
