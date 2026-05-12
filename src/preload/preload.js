"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const terminalAPI = {
    createTerminal: (options) => electron_1.ipcRenderer.invoke('create-terminal', options),
    write: (id, data) => electron_1.ipcRenderer.send('terminal-input', { id, data }),
    resize: (id, cols, rows) => electron_1.ipcRenderer.send('terminal-resize', { id, cols, rows }),
    kill: (id) => electron_1.ipcRenderer.send('terminal-kill', { id }),
    onData: (callback) => {
        const handler = (_event, data) => callback(data);
        electron_1.ipcRenderer.on('terminal-data', handler);
        return () => electron_1.ipcRenderer.removeListener('terminal-data', handler);
    },
    onExit: (callback) => {
        const handler = (_event, data) => callback(data);
        electron_1.ipcRenderer.on('terminal-exit', handler);
        return () => electron_1.ipcRenderer.removeListener('terminal-exit', handler);
    },
    // Menu events
    onNewTab: (callback) => electron_1.ipcRenderer.on('new-tab', callback),
    onCloseTab: (callback) => electron_1.ipcRenderer.on('close-tab', callback),
    onClearTerminal: (callback) => electron_1.ipcRenderer.on('clear-terminal', callback),
    onNextTab: (callback) => electron_1.ipcRenderer.on('next-tab', callback),
    onPrevTab: (callback) => electron_1.ipcRenderer.on('prev-tab', callback),
    onSplitHorizontal: (callback) => electron_1.ipcRenderer.on('split-horizontal', callback),
    onSplitVertical: (callback) => electron_1.ipcRenderer.on('split-vertical', callback),
    onShowSearch: (callback) => electron_1.ipcRenderer.on('show-search', callback),
    onShowCommandPalette: (callback) => electron_1.ipcRenderer.on('show-command-palette', callback),
    onShowSettings: (callback) => electron_1.ipcRenderer.on('show-settings', callback),
    openNewWindow: (workspaceName) => electron_1.ipcRenderer.invoke('create-window', { workspaceName }),
    // Window controls
    minimize: () => electron_1.ipcRenderer.send('window-minimize'),
    maximize: () => electron_1.ipcRenderer.send('window-maximize'),
    close: () => electron_1.ipcRenderer.send('window-close'),
    isMaximized: () => electron_1.ipcRenderer.invoke('window-is-maximized'),
    getShellPath: () => electron_1.ipcRenderer.invoke('get-shell-path'),
    getPlatform: () => electron_1.ipcRenderer.invoke('get-platform'),
    // SSH
    readSshConfig: () => electron_1.ipcRenderer.invoke('ssh-read-config'),
    writeSshConfig: (entry) => electron_1.ipcRenderer.invoke('ssh-write-config', entry),
    readSshGroups: () => electron_1.ipcRenderer.invoke('ssh-read-groups'),
    writeSshGroups: (groups) => electron_1.ipcRenderer.invoke('ssh-write-groups', groups),
    // Settings
    getSettings: () => electron_1.ipcRenderer.invoke('get-settings'),
    saveSettings: (settings) => electron_1.ipcRenderer.invoke('save-settings', settings),
    // Updates
    checkForUpdates: () => electron_1.ipcRenderer.send('check-for-updates'),
    installUpdate: () => electron_1.ipcRenderer.send('install-update'),
    onUpdateAvailable: (callback) => {
        const handler = (_event, data) => callback(data);
        electron_1.ipcRenderer.on('update-available', handler);
        return () => electron_1.ipcRenderer.removeListener('update-available', handler);
    },
    onUpdateDownloaded: (callback) => {
        const handler = (_event, data) => callback(data);
        electron_1.ipcRenderer.on('update-downloaded', handler);
        return () => electron_1.ipcRenderer.removeListener('update-downloaded', handler);
    },
    onUpdateStatus: (callback) => {
        const handler = (_event, data) => callback(data);
        electron_1.ipcRenderer.on('update-status', handler);
        return () => electron_1.ipcRenderer.removeListener('update-status', handler);
    },
    setHotkey: (opts) => electron_1.ipcRenderer.invoke('set-hotkey', opts),
    openExternal: (url) => electron_1.ipcRenderer.send('open-external', url),
    getAppVersion: () => electron_1.ipcRenderer.invoke('get-app-version'),
};
electron_1.contextBridge.exposeInMainWorld('terminalAPI', terminalAPI);
//# sourceMappingURL=preload.js.map