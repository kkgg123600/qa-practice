// Local Notes: a small Electron app used as a test target for Playwright's Electron support.
// It stores notes on disk and has a "Summarize" feature backed by a stand-in model whose
// wording and latency vary from run to run, the way a real local AI model's output does.
const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

// Tests pass their own profile directory so every run starts clean and runs stay isolated.
if (process.env.NOTES_USER_DATA) app.setPath('userData', process.env.NOTES_USER_DATA);

const notesFile = () => path.join(app.getPath('userData'), 'notes.json');

function loadNotes() {
  try {
    return JSON.parse(fs.readFileSync(notesFile(), 'utf8'));
  } catch {
    return [];
  }
}

function saveNotes(notes) {
  fs.mkdirSync(path.dirname(notesFile()), { recursive: true });
  fs.writeFileSync(notesFile(), JSON.stringify(notes, null, 2));
}

// Stand-in for a local model. Non-deterministic on purpose: random opening phrase, random
// choice of key words, random latency. NOTES_MODEL=mock swaps in a fixed, instant answer.
const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'to', 'of', 'in', 'on', 'for', 'is', 'are', 'with', 'at', 'by', 'it', 'this', 'that', 'we', 'be']);
const OPENERS = ['In short:', 'Summary:', 'Key points:', 'Main idea:'];

async function summarize(text) {
  if (process.env.NOTES_MODEL === 'mock') return 'MOCK SUMMARY';
  const words = (text.toLowerCase().match(/[a-z0-9']+/g) || []).filter((w) => w.length > 2 && !STOP.has(w));
  if (words.length === 0) throw new Error('Nothing to summarize');
  const counts = new Map();
  for (const w of words) counts.set(w, (counts.get(w) || 0) + 1);
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || Math.random() - 0.5).map(([w]) => w);
  const take = Math.min(ranked.length, 2 + Math.floor(Math.random() * 3));
  const opener = OPENERS[Math.floor(Math.random() * OPENERS.length)];
  await new Promise((r) => setTimeout(r, 200 + Math.random() * 1300));
  return `${opener} ${ranked.slice(0, take).join(', ')}.`;
}

ipcMain.handle('notes:list', () => loadNotes());
ipcMain.handle('notes:add', (_e, note) => {
  const title = String(note?.title ?? '').trim();
  const body = String(note?.body ?? '').trim();
  if (!title) throw new Error('Title is required');
  const notes = loadNotes();
  const saved = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), title, body };
  notes.push(saved);
  saveNotes(notes);
  return saved;
});
ipcMain.handle('notes:delete', (_e, id) => {
  saveNotes(loadNotes().filter((n) => n.id !== id));
});
ipcMain.handle('notes:summarize', (_e, text) => summarize(String(text ?? '')));

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 650,
    title: 'Local Notes',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  win.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
