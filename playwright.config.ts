import { defineConfig } from '@playwright/test';

// Web: one suite, two targets:
//   reference -> the correct build (suite is expected to pass)
//   with-bugs -> the same shop with defects seeded on purpose (failures = caught bugs)
// Desktop: the electron project drives apps/notes-desktop (tests-electron/).
export default defineConfig({
  timeout: 60_000, // leaves room for API connection retries (5 x 8s)
  expect: { timeout: 7_000 },
  fullyParallel: false,
  workers: 1, // shared public demo site; its API stalled when hit in parallel
  retries: 0, // a retry would hide flakiness; we want to see it
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }], ['github']]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    testIdAttribute: 'data-test', // both apps mark elements with data-test="..."
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'reference',
      testDir: './tests',
      use: { channel: 'chrome', headless: true, baseURL: 'https://practicesoftwaretesting.com' },
    },
    {
      name: 'with-bugs',
      testDir: './tests',
      use: { channel: 'chrome', headless: true, baseURL: 'https://with-bugs.practicesoftwaretesting.com' },
    },
    { name: 'electron', testDir: './tests-electron', timeout: 30_000 },
  ],
});
