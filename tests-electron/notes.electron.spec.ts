import { test, expect, addNote, launchApp, readNotesFile } from './support/app';

// Desktop (Electron) tests for apps/notes-desktop, driven by Playwright's Electron support.
// Each test runs against its own empty profile directory (see support/app.ts).

test('DESK-01 app starts with an empty notes list', async ({ notesApp: { app, win } }) => {
  await expect(win).toHaveTitle('Local Notes');
  await expect(win.getByTestId('note-count')).toHaveText('0 notes');
  // The main process really uses the per-test profile, so tests cannot leak into each other.
  const userData = await app.evaluate(({ app }) => app.getPath('userData'));
  expect(userData).toContain('notes-desktop-');
});

test('DESK-02 saving a note shows it in the list and writes it to disk', async ({ notesApp: { win }, userDataDir }) => {
  await addNote(win, 'Groceries', 'Milk, eggs and bread');
  await expect(win.getByTestId('note-item-title')).toHaveText(['Groceries']);
  await expect(win.getByTestId('note-count')).toHaveText('1 note');
  await expect(win.getByTestId('note-title')).toHaveValue(''); // form resets after save
  expect(readNotesFile(userDataDir)).toEqual([expect.objectContaining({ title: 'Groceries', body: 'Milk, eggs and bread' })]);
});

test('DESK-03 a note without a title is rejected and nothing is saved', async ({ notesApp: { win }, userDataDir }) => {
  await addNote(win, '   ', 'body without a title');
  await expect(win.getByTestId('form-error')).toHaveText('Title is required');
  await expect(win.getByTestId('note-count')).toHaveText('0 notes');
  expect(readNotesFile(userDataDir)).toEqual([]);
});

test('DESK-04 notes survive an app restart', async ({ userDataDir }) => {
  const first = await launchApp({ userDataDir });
  await addNote(first.win, 'Persistent', 'should still be here after restart');
  await expect(first.win.getByTestId('note-count')).toHaveText('1 note');
  await first.app.close();

  const second = await launchApp({ userDataDir });
  try {
    await expect(second.win.getByTestId('note-item-title')).toHaveText(['Persistent']);
  } finally {
    await second.app.close();
  }
});

test('DESK-05 deleting a note removes it from the list and from disk', async ({ notesApp: { win }, userDataDir }) => {
  await addNote(win, 'Keep', 'stays');
  await addNote(win, 'Remove', 'goes away');
  await expect(win.getByTestId('note-count')).toHaveText('2 notes');
  await win.getByTestId('note-item').filter({ hasText: 'Remove' }).getByTestId('note-delete').click();
  await expect(win.getByTestId('note-item-title')).toHaveText(['Keep']);
  expect(readNotesFile(userDataDir).map((n) => n.title)).toEqual(['Keep']);
});

// --- Summarize: the AI-style feature ---------------------------------------------------
// Two layers: (1) a mocked model gives a fixed answer, so the UI flow can be asserted
// exactly; (2) the real, non-deterministic model is checked on properties that must hold
// for every answer, never on exact wording.

test('DESK-06 summarize with a mocked model: UI shows the model answer', async ({ userDataDir }) => {
  const { app, win } = await launchApp({ userDataDir, model: 'mock' });
  try {
    await addNote(win, 'Meeting', 'Discuss release plan and release risks');
    await win.getByTestId('note-summarize').click();
    const summary = win.getByTestId('note-summary');
    await expect(summary).toHaveAttribute('data-state', 'done');
    await expect(summary).toHaveText('MOCK SUMMARY');
  } finally {
    await app.close();
  }
});

const BODY =
  'Release planning for the desktop app. The release needs signed builds for Windows and macOS. ' +
  'Mobile builds follow the desktop release. Testing must cover offline mode and model download.';
const OPENERS = ['In short:', 'Summary:', 'Key points:', 'Main idea:'];

test('DESK-07 summarize with the real model: every answer meets the output contract', async ({ notesApp: { win } }) => {
  const bodyWords = new Set(BODY.toLowerCase().match(/[a-z0-9']+/g));
  await addNote(win, 'Release', BODY);
  const summary = win.getByTestId('note-summary');
  const answers: string[] = [];

  for (let run = 1; run <= 5; run++) {
    const started = Date.now();
    await win.getByTestId('note-summarize').click();
    await expect(summary).toHaveAttribute('data-state', 'done', { timeout: 5_000 }); // latency budget
    const text = (await summary.textContent()) ?? '';
    answers.push(text);
    const elapsed = Date.now() - started;

    const opener = OPENERS.find((o) => text.startsWith(o));
    expect(opener, `run ${run}: unexpected opener in "${text}"`).toBeDefined();
    expect(text.endsWith('.'), `run ${run}: no final period in "${text}"`).toBe(true);
    expect(text.length, `run ${run}: summary not shorter than the note`).toBeLessThan(BODY.length);

    const keywords = text.slice(opener!.length, -1).split(',').map((w) => w.trim());
    expect(keywords.length, `run ${run}: keyword count`).toBeGreaterThanOrEqual(2);
    expect(keywords.length, `run ${run}: keyword count`).toBeLessThanOrEqual(4);
    for (const k of keywords) expect(bodyWords.has(k), `run ${run}: "${k}" is not from the note (made up)`).toBe(true);
    // "release" is the most frequent content word in the note; a summary that drops it missed the topic.
    expect(keywords, `run ${run}: main topic missing`).toContain('release');
    expect(elapsed).toBeLessThan(5_000);
  }
  // Variation is expected, not required: record it instead of asserting on it.
  test.info().annotations.push({ type: 'distinct answers', description: `${new Set(answers).size}/5: ${answers.join(' | ')}` });
});

test('DESK-08 summarize an empty note: clear error, button usable again', async ({ notesApp: { win } }) => {
  await addNote(win, 'Empty', '');
  await win.getByTestId('note-summarize').click();
  const summary = win.getByTestId('note-summary');
  await expect(summary).toHaveAttribute('data-state', 'error');
  await expect(summary).toHaveText('Nothing to summarize');
  await expect(win.getByTestId('note-summarize')).toBeEnabled();
});
