import { expect } from '@wdio/globals';
import { el, childText, freshStart, money } from '../support/app';

// Mobile (Android) tests for the Sauce Labs My Demo App, a React Native shop.
// Every test starts from cleared app data (freshStart), so tests do not depend on order.

const CATALOG: Record<string, string> = {
  'Sauce Labs Backpack': '$29.99',
  'Sauce Labs Bike Light': '$9.99',
  'Sauce Labs Bolt T-Shirt': '$15.99',
  'Sauce Labs Fleece Jacket': '$49.99',
};

async function openProduct(name: string) {
  await $(`android=new UiSelector().text("${name}")`).click();
  await el('product screen').waitForDisplayed();
}

async function openLogin() {
  await el('open menu').click();
  await el('menu item log in').click();
  await el('login screen').waitForDisplayed();
}

describe('My Demo App (Android)', () => {
  beforeEach(freshStart);

  it('MOB-01 catalog shows the first products with their prices', async () => {
    const names = await $$('~store item text').map((e) => e.getText());
    const prices = await $$('~store item price').map((e) => e.getText());
    expect(names.length).toBeGreaterThanOrEqual(4);
    expect(names.length).toBe(prices.length);
    names.forEach((name, i) => {
      if (CATALOG[name]) expect(prices[i]).toBe(CATALOG[name]);
    });
    expect(names).toEqual(expect.arrayContaining(Object.keys(CATALOG)));
  });

  it('MOB-02 adding quantity 2 updates the badge and the cart total', async () => {
    await openProduct('Sauce Labs Backpack');
    await el('counter plus button').click();
    await expect($('~counter amount').$('android.widget.TextView')).toHaveText('2');
    await el('Add To Cart button').click();
    await expect($('~cart badge').$('android.widget.TextView')).toHaveText('2');

    await el('cart badge').click();
    await el('cart screen').waitForDisplayed();
    const unit = money(await childText('product price'));
    const total = money(await childText('total price'));
    expect(unit).toBe(money(CATALOG['Sauce Labs Backpack']));
    expect(total).toBe(unit * 2); // cents, so no floating-point rounding in the check
    await expect($('~total number')).toHaveText('2 items');
  });

  it('MOB-03 removing the only item empties the cart', async () => {
    await openProduct('Sauce Labs Bike Light');
    await el('Add To Cart button').click();
    await el('cart badge').click();
    await el('cart screen').waitForDisplayed();
    await el('remove item').click();
    await expect(el('product row')).not.toBeDisplayed();
    await expect(el('Proceed To Checkout button')).not.toBeDisplayed();
  });

  it('MOB-04 login without a username shows a field error', async () => {
    await openLogin();
    await el('Login button').click();
    expect(await childText('Username-error-message')).toBe('Username is required');
    await expect(el('login screen')).toBeDisplayed(); // still on the login screen
  });

  it('MOB-05 a locked-out user cannot log in', async () => {
    await openLogin();
    await el('alice@example.com (locked out)-autofill').click();
    await el('Login button').click();
    expect(await childText('generic-error-message')).toBe('Sorry, this user has been locked out.');
    await expect(el('login screen')).toBeDisplayed();
  });

  it('MOB-06 checkout asks to log in, then continues to the address step', async () => {
    await openProduct('Sauce Labs Backpack');
    await el('Add To Cart button').click();
    await el('cart badge').click();
    await el('Proceed To Checkout button').click();
    await el('login screen').waitForDisplayed();
    await el('bob@example.com-autofill').click();
    await el('Login button').click();
    await expect(el('checkout address screen')).toBeDisplayed();
    await expect(el('To Payment button')).toBeDisplayed();
  });
});
