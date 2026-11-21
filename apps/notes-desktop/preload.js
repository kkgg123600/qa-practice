const { contextBridge, ipcRenderer } = require('electron');

// The only bridge between the page and the main process.
contextBridge.exposeInMainWorld('notesApi', {
  list: () => ipcRenderer.invoke('notes:list'),
  add: (note) => ipcRenderer.invoke('notes:add', note),
  remove: (id) => ipcRenderer.invoke('notes:delete', id),
  summarize: (text) => ipcRenderer.invoke('notes:summarize', text),
});
