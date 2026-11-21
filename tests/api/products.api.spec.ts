import { test, expect } from '@playwright/test';
import { apiClient } from '../support/http';

// API tests use the `request` fixture: plain HTTP calls, no browser window.
test.describe('API - products', () => {
  test('API-01 GET /products returns a well-formed first page', async ({ request, baseURL }) => {
    const res = await apiClient(request, baseURL).get('/products?page=1');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('application/json');

    const body = await res.json();
    expect(body.current_page).toBe(1);
    expect(body.per_page).toBe(9);
    expect(body.data).toHaveLength(9);
    expect(body.total).toBeGreaterThanOrEqual(body.data.length);
    expect(body.last_page).toBe(Math.ceil(body.total / body.per_page));

    for (const p of body.data) {
      expect(typeof p.name).toBe('string');
      expect(p.name.length).toBeGreaterThan(0);
      expect(typeof p.price).toBe('number');
      expect(p.price).toBeGreaterThan(0);
      expect(p.id).toBeTruthy();
    }
  });

  test('API-02 page 2 does not repeat any product from page 1', async ({ request, baseURL }) => {
    const ids = async (page: number) =>
      (await (await apiClient(request, baseURL).get(`/products?page=${page}`)).json()).data.map((p: any) => p.id);
    const [p1, p2] = [await ids(1), await ids(2)];
    expect(p2.length).toBeGreaterThan(0);
    expect(p1.filter((id: unknown) => p2.includes(id))).toEqual([]);
  });

  test('API-03 sort=price,asc returns ascending prices', async ({ request, baseURL }) => {
    const res = await apiClient(request, baseURL).get('/products?sort=price,asc&page=1');
    expect(res.status()).toBe(200);
    const prices: number[] = (await res.json()).data.map((p: any) => p.price);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  test('API-04 unknown product id returns 404 with a message, not a crash', async ({ request, baseURL }) => {
    const res = await apiClient(request, baseURL).get('/products/does-not-exist');
    expect(res.status()).toBe(404);
    expect((await res.json()).message).toBeTruthy();
  });
});
