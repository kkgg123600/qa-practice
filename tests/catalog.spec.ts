import { test, expect, type Page } from '@playwright/test';

const money = (s: string) => Number(s.replace(/[^0-9.]/g, ''));

async function openHome(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('product-name').first()).toBeVisible();
}

test.describe('Catalog', () => {
  test('TC-01 home page lists 9 products, each with a name and a price', async ({ page }) => {
    await openHome(page);
    await expect(page.getByTestId('product-name')).toHaveCount(9);
    const prices = await page.getByTestId('product-price').allTextContents();
    expect(prices).toHaveLength(9);
    for (const p of prices) expect(p.trim()).toMatch(/^\$\d+\.\d{2}$/);
  });

  test('TC-02 sorting by "Price (Low - High)" shows ascending prices', async ({ page }) => {
    await openHome(page);
    const before = await page.getByTestId('product-price').allTextContents();
    await page.getByTestId('sort').selectOption({ label: 'Price (Low - High)' });
    // wait for the grid to actually change before reading it
    await expect
      .poll(async () => (await page.getByTestId('product-price').allTextContents()).join())
      .not.toBe(before.join());
    const prices = (await page.getByTestId('product-price').allTextContents()).map(money);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  test('TC-03 searching "hammer" returns only hammers', async ({ page }) => {
    await openHome(page);
    const before = await page.getByTestId('product-name').allTextContents();
    await page.getByTestId('search-query').fill('hammer');
    await page.getByTestId('search-submit').click();
    await expect(page.getByTestId('search-caption')).toContainText('hammer');
    // The caption appears before the grid re-renders; reading the grid right away
    // returned the old, unfiltered products. Wait until the grid differs from what
    // was on screen before the search (read from the page, not hardcoded).
    await expect
      .poll(async () => (await page.getByTestId('product-name').allTextContents()).join())
      .not.toBe(before.join());
    const names = await page.getByTestId('product-name').allTextContents();
    expect(names.length).toBeGreaterThan(0);
    for (const n of names) expect(n.toLowerCase()).toContain('hammer');
  });

  test('TC-04 main navigation labels are correct', async ({ page }) => {
    await openHome(page);
    // soft: record a failure but keep going, so one wrong label cannot hide another
    await expect.soft(page.getByTestId('nav-contact')).toHaveText('Contact');
    await page.getByTestId('nav-categories').click();
    const items = (await page.locator('nav .dropdown-menu a').allTextContents()).map((s) => s.trim());
    expect(items.join(' | ')).not.toMatch(/undefined|null|NaN/i);
  });
});
