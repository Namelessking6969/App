const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('terminalAPI', {
  createTerminal: (options) => ipcRenderer.invoke('create-terminal', options),
  write: (id, data) => ipcRenderer.send('terminal-input', { id, data }),
  resize: (id, cols, rows) => ipcRenderer.send('terminal-resize', { id, cols, rows }),
  kill: (id) => ipcRenderer.send('terminal-kill', { id }),

  onData: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('terminal-data', handler);
    return () => ipcRenderer.removeListener('terminal-data', handler);
  },

  onExit: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('terminal-exit', handler);
    return () => ipcRenderer.removeListener('terminal-exit', handler);
  },

  // Menu events
  onNewTab: (callback) => ipcRenderer.on('new-tab', callback),
  onCloseTab: (callback) => ipcRenderer.on('close-tab', callback),
  onClearTerminal: (callback) => ipcRenderer.on('clear-terminal', callback),
  onNextTab: (callback) => ipcRenderer.on('next-tab', callback),
  onPrevTab: (callback) => ipcRenderer.on('prev-tab', callback),
  onSplitHorizontal: (callback) => ipcRenderer.on('split-horizontal', callback),
  onSplitVertical: (callback) => ipcRenderer.on('split-vertical', callback),
  onShowSearch: (callback) => ipcRenderer.on('show-search', callback),
  onShowCommandPalette: (callback) => ipcRenderer.on('show-command-palette', callback),
  onShowSettings: (callback) => ipcRenderer.on('show-settings', callback),

  openNewWindow: (workspaceName) => ipcRenderer.invoke('create-window', { workspaceName }),

  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),

  getShellPath: () => ipcRenderer.invoke('get-shell-path'),
  getCwd: () => ipcRenderer.invoke('get-cwd'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  getHistory: () => ipcRenderer.invoke('get-history'),
  saveHistory: (history) => ipcRenderer.invoke('save-history', history),
  onShowHistory: (callback) => ipcRenderer.on('show-history', callback),

  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),

  // Updates
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  installUpdate: () => ipcRenderer.send('install-update'),
  onUpdateAvailable: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('update-available', handler);
  },
  onUpdateDownloaded: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('update-downloaded', handler);
  },
  onUpdateStatus: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('update-status', handler);
  }
});
