import type { APIRequestContext } from '@playwright/test';
import { apiClient } from './http';

// Each web build talks to its own API host.
export function apiURL(baseURL: string | undefined): string {
  if (!baseURL) throw new Error('baseURL is not set');
  return baseURL.includes('with-bugs')
    ? 'https://api-with-bugs.practicesoftwaretesting.com'
    : 'https://api.practicesoftwaretesting.com';
}

export const isBugsBuild = (baseURL: string | undefined) => !!baseURL && baseURL.includes('with-bugs');

export interface TestUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

// Creates a brand-new user for one test. A private user means tests never depend on
// (or damage) a shared account, and can run in any order.
export async function registerUser(request: APIRequestContext, baseURL: string | undefined): Promise<TestUser> {
  const user: TestUser = {
    email: `qa.practice.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`,
    password: 'Qa!Practice#2026x',
    firstName: 'Test',
    lastName: 'Runner',
  };
  const common = {
    first_name: user.firstName,
    last_name: user.lastName,
    dob: '1990-01-01',
    phone: '0123456789',
    email: user.email,
    password: user.password,
  };
  // The two builds expect different shapes for the address.
  const body = isBugsBuild(baseURL)
    ? { ...common, address: 'Test street 1', city: 'Testville', state: 'TS', country: 'NL', postcode: '1234AB' }
    : { ...common, address: { street: 'Test street 1', city: 'Testville', state: 'TS', country: 'NL', postal_code: '1234AB' } };
  // Registration is slow on this server (about 8s measured), hence the longer timeout.
  // If a timed-out attempt did reach the server, the retry answers 422 (email taken)
  // and we fail loudly below instead of continuing with a half-known state.
  const res = await apiClient(request, baseURL).post('/users/register', { data: body, timeout: 25_000 });
  if (res.status() !== 201) throw new Error(`register failed: ${res.status()} ${await res.text()}`);
  return user;
}

export async function loginToken(request: APIRequestContext, baseURL: string | undefined, user: TestUser): Promise<string> {
  const res = await apiClient(request, baseURL).post('/users/login', {
    data: { email: user.email, password: user.password },
  });
  if (res.status() !== 200) throw new Error(`login failed: ${res.status()} ${await res.text()}`);
  return (await res.json()).access_token;
}
