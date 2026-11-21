import { test, expect } from '@playwright/test';
import { registerUser, loginToken } from '../support/env';
import { apiClient } from '../support/http';

test.describe('API - authentication and authorization', () => {
  test('API-05 GET /users/me without a token is rejected (401)', async ({ request, baseURL }) => {
    const res = await apiClient(request, baseURL).get('/users/me');
    expect(res.status()).toBe(401);
  });

  test('API-06 GET /invoices without a token is rejected (401)', async ({ request, baseURL }) => {
    const res = await apiClient(request, baseURL).get('/invoices');
    expect(res.status()).toBe(401);
  });

  test('API-07 login with a wrong password returns 401 and no token', async ({ request, baseURL }) => {
    const res = await apiClient(request, baseURL).post('/users/login', {
      data: { email: 'nobody@example.com', password: 'wrong-password-1' },
    });
    expect(res.status()).toBe(401);
    expect((await res.json()).access_token).toBeUndefined();
  });

  test('API-08 a new user can log in and read only their own, non-secret profile', async ({ request, baseURL }) => {
    test.setTimeout(150_000); // slow registration plus possible connection retries
    const user = await registerUser(request, baseURL);
    const token = await loginToken(request, baseURL, user);

    const res = await apiClient(request, baseURL).get('/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const me = await res.json();
    expect(me.email).toBe(user.email);
    expect(me.first_name).toBe(user.firstName);
    // A profile response must never carry credential material.
    expect.soft(Object.keys(me)).not.toContain('password');

    // A new account has no orders, so it must not see anybody else's invoices.
    const inv = await apiClient(request, baseURL).get('/invoices', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(inv.status()).toBe(200);
    expect((await inv.json()).data).toEqual([]);
  });
});
