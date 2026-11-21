import type { APIRequestContext, APIResponse } from '@playwright/test';
import { apiURL } from './env';

// The API host drops roughly one in three new TCP connections (measured with curl:
// tcp connect never completes, then the next attempt answers in 0.4s). A browser
// hides this by reconnecting; raw API calls do not. So we retry on TRANSPORT errors
// only. An HTTP response of any status (401, 404, 500...) is a real answer and is
// returned as-is: retrying those would hide bugs.
type Opts = { data?: unknown; headers?: Record<string, string>; timeout?: number };

async function send(call: () => Promise<APIResponse>, attempts = 5): Promise<APIResponse> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await call();
    } catch (e) {
      last = e; // timeout / ECONNRESET: no response was received
    }
  }
  throw last;
}

export function apiClient(request: APIRequestContext, baseURL: string | undefined) {
  const root = apiURL(baseURL);
  return {
    get: (path: string, o: Opts = {}) => send(() => request.get(root + path, { timeout: 8_000, ...o })),
    post: (path: string, o: Opts = {}) => send(() => request.post(root + path, { timeout: 8_000, ...o })),
  };
}
