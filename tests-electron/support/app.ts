import { test as base, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const APP_DIR = path.resolve(__dirname, '../../apps/notes-desktop');

export interface LaunchOpts {
  userDataDir: string;
  model?: 'mock' | 'real';
}

// Starts the app with its own profile directory. Linux CI runners have no setuid sandbox
// helper, so --no-sandbox is passed there only.
export async function launchApp({ userDataDir, model = 'real' }: LaunchOpts): Promise<{ app: ElectronApplication; win: Page }> {
  const args = [APP_DIR];
  if (process.env.CI) args.unshift('--no-sandbox');
  const app = await electron.launch({
    args,
    env: {
      ...process.env,
      NOTES_USER_DATA: userDataDir,
      NOTES_MODEL: model === 'mock' ? 'mock' : '',
    },
  });
  const win = await app.firstWindow();
  win.context().setDefaultTimeout(7_000);
  await win.getByTestId('note-count').waitFor();
  return { app, win };
}

type Fixtures = { userDataDir: string; notesApp: { app: ElectronApplication; win: Page } };

// Every test gets a fresh, empty profile directory, removed afterwards.
export const test = base.extend<Fixtures>({
  userDataDir: async ({}, use) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'notes-desktop-'));
    await use(dir);
    fs.rmSync(dir, { recursive: true, force: true });
  },
  notesApp: async ({ userDataDir }, use) => {
    const launched = await launchApp({ userDataDir });
    await use(launched);
    await launched.app.close();
  },
});

export { expect } from '@playwright/test';

export async function addNote(win: Page, title: string, body: string) {
  await win.getByTestId('note-title').fill(title);
  await win.getByTestId('note-body').fill(body);
  await win.getByTestId('note-save').click();
}

export function readNotesFile(userDataDir: string): Array<{ id: string; title: string; body: string }> {
  const file = path.join(userDataDir, 'notes.json');
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
}
