import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

type Callback<T = void> = (data: T) => void;
type Unsubscribe = () => void;

const terminalAPI = {
  createTerminal: (options?: Record<string, unknown>) =>
    ipcRenderer.invoke('create-terminal', options),

  write: (id: number, data: string) =>
    ipcRenderer.send('terminal-input', { id, data }),

  resize: (id: number, cols: number, rows: number) =>
    ipcRenderer.send('terminal-resize', { id, cols, rows }),

  kill: (id: number) =>
    ipcRenderer.send('terminal-kill', { id }),

  onData: (callback: Callback<{ id: number; data: string }>): Unsubscribe => {
    const handler = (_event: IpcRendererEvent, data: { id: number; data: string }) => callback(data);
    ipcRenderer.on('terminal-data', handler);
    return () => ipcRenderer.removeListener('terminal-data', handler);
  },

  onExit: (callback: Callback<{ id: number; exitCode: number; signal: number }>): Unsubscribe => {
    const handler = (_event: IpcRendererEvent, data: { id: number; exitCode: number; signal: number }) => callback(data);
    ipcRenderer.on('terminal-exit', handler);
    return () => ipcRenderer.removeListener('terminal-exit', handler);
  },

  // Menu events
  onNewTab: (callback: (event: IpcRendererEvent) => void) => ipcRenderer.on('new-tab', callback),
  onCloseTab: (callback: (event: IpcRendererEvent) => void) => ipcRenderer.on('close-tab', callback),
  onClearTerminal: (callback: (event: IpcRendererEvent) => void) => ipcRenderer.on('clear-terminal', callback),
  onNextTab: (callback: (event: IpcRendererEvent) => void) => ipcRenderer.on('next-tab', callback),
  onPrevTab: (callback: (event: IpcRendererEvent) => void) => ipcRenderer.on('prev-tab', callback),
  onSplitHorizontal: (callback: (event: IpcRendererEvent) => void) => ipcRenderer.on('split-horizontal', callback),
  onSplitVertical: (callback: (event: IpcRendererEvent) => void) => ipcRenderer.on('split-vertical', callback),
  onShowSearch: (callback: (event: IpcRendererEvent) => void) => ipcRenderer.on('show-search', callback),
  onShowCommandPalette: (callback: (event: IpcRendererEvent) => void) => ipcRenderer.on('show-command-palette', callback),
  onShowSettings: (callback: (event: IpcRendererEvent) => void) => ipcRenderer.on('show-settings', callback),

  openNewWindow: (workspaceName?: string) =>
    ipcRenderer.invoke('create-window', { workspaceName }),

  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),

  getShellPath: () => ipcRenderer.invoke('get-shell-path'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),

  // SSH
  readSshConfig: () => ipcRenderer.invoke('ssh-read-config'),
  writeSshConfig: (entry: { alias: string; hostname: string; user?: string; port?: string }) =>
    ipcRenderer.invoke('ssh-write-config', entry),
  readSshGroups: () => ipcRenderer.invoke('ssh-read-groups'),
  writeSshGroups: (groups: unknown[]) => ipcRenderer.invoke('ssh-write-groups', groups),

  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: Record<string, unknown>) => ipcRenderer.invoke('save-settings', settings),

  // Updates
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  installUpdate: () => ipcRenderer.send('install-update'),

  onUpdateAvailable: (callback: Callback<{ version: string }>): Unsubscribe => {
    const handler = (_event: IpcRendererEvent, data: { version: string }) => callback(data);
    ipcRenderer.on('update-available', handler);
    return () => ipcRenderer.removeListener('update-available', handler);
  },

  onUpdateDownloaded: (callback: Callback<{ version: string }>): Unsubscribe => {
    const handler = (_event: IpcRendererEvent, data: { version: string }) => callback(data);
    ipcRenderer.on('update-downloaded', handler);
    return () => ipcRenderer.removeListener('update-downloaded', handler);
  },

  onUpdateStatus: (callback: Callback<{ message: string }>): Unsubscribe => {
    const handler = (_event: IpcRendererEvent, data: { message: string }) => callback(data);
    ipcRenderer.on('update-status', handler);
    return () => ipcRenderer.removeListener('update-status', handler);
  },

  setHotkey: (opts: { enabled: boolean; hotkey: string }) => ipcRenderer.invoke('set-hotkey', opts),

  openExternal: (url: string) => ipcRenderer.send('open-external', url),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  sendFeedback: (text: string) => ipcRenderer.invoke('send-feedback', text),
};

contextBridge.exposeInMainWorld('terminalAPI', terminalAPI);

export type TerminalAPI = typeof terminalAPI;
