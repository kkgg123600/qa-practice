import { test, expect } from '@playwright/test';
import { isBugsBuild } from '../support/env';
import { apiClient } from '../support/http';

test.describe('API - cart', () => {
  // The with-bugs build is an older API without server-side carts (POST /carts -> 404,
  // the cart lives in the browser). Skipping with a stated reason is honest; letting
  // the tests fail there would report a "bug" that is really a missing feature.
  test.skip(({ baseURL }) => isBugsBuild(baseURL), 'with-bugs build has no /carts endpoint');

  test('API-09 a product added to a new cart is returned with its quantity', async ({ request, baseURL }) => {
    const api = apiClient(request, baseURL);
    const product = (await (await api.get('/products?page=1')).json()).data[0];

    const created = await api.post('/carts');
    expect(created.status()).toBe(201);
    const cartId = (await created.json()).id;

    const added = await api.post(`/carts/${cartId}`, { data: { product_id: product.id, quantity: 2 } });
    expect(added.status()).toBe(200);

    const cart = await (await api.get(`/carts/${cartId}`)).json();
    expect(cart.cart_items).toHaveLength(1);
    expect(cart.cart_items[0].quantity).toBe(2);
    expect(cart.cart_items[0].product_id).toBe(product.id);
    expect(cart.cart_items[0].product.price).toBe(product.price);
  });

  test('API-10 adding an unknown product is rejected and leaves the cart empty', async ({ request, baseURL }) => {
    const api = apiClient(request, baseURL);
    const cartId = (await (await api.post('/carts')).json()).id;

    const added = await api.post(`/carts/${cartId}`, { data: { product_id: 'does-not-exist', quantity: 1 } });
    expect(added.status()).toBe(404);

    const cart = await (await api.get(`/carts/${cartId}`)).json();
    expect(cart.cart_items).toEqual([]);
  });
});
