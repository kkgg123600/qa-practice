const form = document.querySelector('[data-test="note-form"]');
const list = document.querySelector('[data-test="note-list"]');
const count = document.querySelector('[data-test="note-count"]');
const error = document.querySelector('[data-test="form-error"]');

function cleanError(e) {
  // ipcRenderer.invoke wraps main-process errors: "Error invoking remote method '...': Error: <msg>"
  return String(e?.message ?? e).replace(/^.*Error: /, '');
}

function renderNote(note) {
  const li = document.createElement('li');
  li.dataset.test = 'note-item';
  const h = document.createElement('strong');
  h.dataset.test = 'note-item-title';
  h.textContent = note.title;
  const body = document.createElement('p');
  body.textContent = note.body;
  const summary = document.createElement('p');
  summary.className = 'summary';
  summary.dataset.test = 'note-summary';
  const sumBtn = document.createElement('button');
  sumBtn.textContent = 'Summarize';
  sumBtn.dataset.test = 'note-summarize';
  sumBtn.onclick = async () => {
    sumBtn.disabled = true;
    summary.textContent = 'Summarizing...';
    summary.dataset.state = 'loading';
    try {
      summary.textContent = await window.notesApi.summarize(note.body);
      summary.dataset.state = 'done';
    } catch (e) {
      summary.textContent = cleanError(e);
      summary.dataset.state = 'error';
    } finally {
      sumBtn.disabled = false;
    }
  };
  const del = document.createElement('button');
  del.textContent = 'Delete';
  del.dataset.test = 'note-delete';
  del.onclick = async () => {
    await window.notesApi.remove(note.id);
    await refresh();
  };
  li.append(h, body, sumBtn, del, summary);
  return li;
}

async function refresh() {
  const notes = await window.notesApi.list();
  list.replaceChildren(...notes.map(renderNote));
  count.textContent = `${notes.length} ${notes.length === 1 ? 'note' : 'notes'}`;
}

form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  error.textContent = '';
  try {
    // form.elements, not form.title: HTMLFormElement already has its own `title` property.
    await window.notesApi.add({ title: form.elements.title.value, body: form.elements.body.value });
    form.reset();
    await refresh();
  } catch (e) {
    error.textContent = cleanError(e);
  }
});

refresh();
