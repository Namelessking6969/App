const { app, BrowserWindow, webContents, ipcMain, Menu, shell, dialog, nativeTheme } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const pty = require('node-pty');
const log = require('electron-log');

log.transports.file.level = 'info';
log.transports.console.level = 'debug';

let mainWindow = null;
const terminals = new Map();
let terminalIdCounter = 0;

// Settings
const DEFAULT_SETTINGS = {
  fontFamily: '"MesloLGS NF", "JetBrains Mono", monospace',
  fontSize: 13,
  cursorStyle: 'block',
  cursorBlink: true,
  scrollback: 10000,
  shell: '',
  theme: 'vibe',
  titlebarStyle: 'auto'
};

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function loadSettings() {
  try {
    const data = fs.readFileSync(getSettingsPath(), 'utf8');
    return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettingsToDisk(settings) {
  try {
    fs.writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2));
    return true;
  } catch (e) {
    log.error('Failed to save settings:', e);
    return false;
  }
}

// Auto-updater
let autoUpdaterInstance = null;

function initUpdater() {
  if (autoUpdaterInstance) return autoUpdaterInstance;
  try {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.logger = log;
    autoUpdater.autoDownload = true;

    autoUpdater.on('update-available', (info) => {
      log.info('Update available:', info.version);
      mainWindow?.webContents.send('update-available', { version: info.version });
    });

    autoUpdater.on('update-downloaded', (info) => {
      log.info('Update downloaded:', info.version);
      mainWindow?.webContents.send('update-downloaded', { version: info.version });
    });

    autoUpdater.on('update-not-available', () => {
      mainWindow?.webContents.send('update-status', { message: 'You are on the latest version.' });
    });

    autoUpdater.on('error', (err) => {
      log.error('Updater error:', err.message);
      mainWindow?.webContents.send('update-status', { message: 'Update error: ' + err.message });
    });

    autoUpdaterInstance = autoUpdater;
    return autoUpdater;
  } catch (e) {
    log.error('Failed to init updater:', e);
    return null;
  }
}

function checkForUpdates() {
  if (!app.isPackaged) {
    mainWindow?.webContents.send('update-status', { message: 'Auto-updates only available in packaged app.' });
    return;
  }
  const updater = initUpdater();
  if (updater) updater.checkForUpdates();
}

const SHELL = process.platform === 'win32' ?
  (process.env.COMSPEC || 'cmd.exe') :
  (process.env.SHELL || '/bin/zsh');

function getHistoryPath() {
  return path.join(app.getPath('userData'), 'command-history.json');
}

function createWindow(opts = {}) {
  const win = new BrowserWindow({
    width: opts.width || 1200,
    height: opts.height || 800,
    minWidth: 600,
    minHeight: 400,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0D0D0D',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    icon: path.join(__dirname, '../build/icon.png')
  });

  const loadOptions = opts.workspaceName
    ? { hash: `ws=${encodeURIComponent(opts.workspaceName)}` }
    : {};
  win.loadFile(path.join(__dirname, '../renderer/index.html'), loadOptions);

  const wcId = win.webContents.id;
  win.on('closed', () => {
    if (win === mainWindow) mainWindow = null;
    terminals.forEach((term, id) => {
      if (term.webContentsId === wcId) {
        term.process.kill();
        terminals.delete(id);
      }
    });
  });

  if (!mainWindow) {
    mainWindow = win;
    createMenu();
    if (app.isPackaged) {
      setTimeout(() => checkForUpdates(), 5000);
    }
    log.info('Main window created');
  } else {
    log.info('Detached window created');
  }

  return win;
}

function getFocusedWindow() {
  return BrowserWindow.getFocusedWindow() || mainWindow;
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Tab',
          accelerator: 'CmdOrCtrl+T',
          click: () => getFocusedWindow()?.webContents.send('new-tab')
        },
        {
          label: 'Close Tab',
          accelerator: 'CmdOrCtrl+W',
          click: () => getFocusedWindow()?.webContents.send('close-tab')
        },
        { type: 'separator' },
        {
          label: 'New Window',
          accelerator: 'CmdOrCtrl+N',
          click: () => createWindow()
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { type: 'separator' },
        {
          label: 'Clear Terminal',
          accelerator: 'CmdOrCtrl+K',
          click: () => getFocusedWindow()?.webContents.send('clear-terminal')
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Split Horizontally',
          accelerator: 'CmdOrCtrl+D',
          click: () => getFocusedWindow()?.webContents.send('split-horizontal')
        },
        {
          label: 'Split Vertically',
          accelerator: 'CmdOrCtrl+Shift+D',
          click: () => getFocusedWindow()?.webContents.send('split-vertical')
        },
        { type: 'separator' },
        {
          label: 'Next Tab',
          accelerator: 'CmdOrCtrl+Shift+]',
          click: () => getFocusedWindow()?.webContents.send('next-tab')
        },
        {
          label: 'Previous Tab',
          accelerator: 'CmdOrCtrl+Shift+[',
          click: () => getFocusedWindow()?.webContents.send('prev-tab')
        },
        { type: 'separator' },
        {
          label: 'Search',
          accelerator: 'CmdOrCtrl+F',
          click: () => getFocusedWindow()?.webContents.send('show-search')
        },
        {
          label: 'Command History',
          accelerator: 'CmdOrCtrl+Shift+H',
          click: () => getFocusedWindow()?.webContents.send('show-history')
        },
        {
          label: 'Command Palette',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => getFocusedWindow()?.webContents.send('show-command-palette')
        },
        { type: 'separator' },
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => getFocusedWindow()?.webContents.send('show-settings')
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Check for Updates',
          click: () => checkForUpdates()
        },
        { type: 'separator' },
        {
          label: 'About VibeTerminal',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About VibeTerminal',
              message: `VibeTerminal v${app.getVersion()}`,
              detail: 'A beautiful, feature-rich terminal emulator.\n\nBuilt with Electron, xterm.js, and node-pty.'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC Handlers
ipcMain.handle('get-settings', () => loadSettings());

ipcMain.handle('save-settings', (event, settings) => {
  const success = saveSettingsToDisk(settings);
  return { success };
});

ipcMain.on('check-for-updates', () => checkForUpdates());

ipcMain.on('install-update', () => {
  if (autoUpdaterInstance) {
    autoUpdaterInstance.quitAndInstall();
  }
});

ipcMain.handle('create-terminal', async (event, options = {}) => {
  const settings = loadSettings();
  const id = ++terminalIdCounter;
  const resolvedShell = options.shell || (settings.shell && settings.shell.trim()) || SHELL;
  const cwd = options.cwd || os.homedir();
  const senderWcId = event.sender.id;

  const env = { ...process.env };
  env.TERM = 'xterm-256color';
  env.COLORTERM = 'truecolor';
  env.TERM_PROGRAM = 'VibeTerminal';

  try {
    const ptyProcess = pty.spawn(resolvedShell, [], {
      name: 'xterm-256color',
      cols: options.cols || 80,
      rows: options.rows || 24,
      cwd: cwd,
      env: env
    });

    ptyProcess.onData((data) => {
      const wc = webContents.fromId(senderWcId);
      if (wc && !wc.isDestroyed()) {
        wc.send('terminal-data', { id, data });
      }
    });

    ptyProcess.onExit(({ exitCode, signal }) => {
      const wc = webContents.fromId(senderWcId);
      if (wc && !wc.isDestroyed()) {
        wc.send('terminal-exit', { id, exitCode, signal });
      }
      terminals.delete(id);
      log.info(`Terminal ${id} exited with code ${exitCode}`);
    });

    terminals.set(id, { process: ptyProcess, shell: resolvedShell, webContentsId: senderWcId });
    log.info(`Created terminal ${id} with shell ${resolvedShell}`);

    return { success: true, id };
  } catch (error) {
    log.error('Failed to create terminal:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.on('terminal-input', (event, { id, data }) => {
  const terminal = terminals.get(id);
  if (terminal) terminal.process.write(data);
});

ipcMain.on('terminal-resize', (event, { id, cols, rows }) => {
  const terminal = terminals.get(id);
  if (terminal) terminal.process.resize(cols, rows);
});

ipcMain.on('terminal-kill', (event, { id }) => {
  const terminal = terminals.get(id);
  if (terminal) {
    terminal.process.kill();
    terminals.delete(id);
  }
});

ipcMain.on('window-minimize', (event) => BrowserWindow.fromWebContents(event.sender)?.minimize());

ipcMain.on('window-maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win?.isMaximized()) win.unmaximize();
  else win?.maximize();
});

ipcMain.on('window-close', (event) => BrowserWindow.fromWebContents(event.sender)?.close());

ipcMain.handle('window-is-maximized', (event) => BrowserWindow.fromWebContents(event.sender)?.isMaximized() || false);

ipcMain.handle('create-window', (event, { workspaceName } = {}) => {
  createWindow({ workspaceName, width: 900, height: 700 });
  return {};
});

ipcMain.handle('get-shell-path', () => SHELL);

ipcMain.handle('get-cwd', () => os.homedir());

ipcMain.handle('get-platform', () => process.platform);

ipcMain.handle('get-history', () => {
  try {
    const data = fs.readFileSync(getHistoryPath(), 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
});

ipcMain.handle('save-history', (event, history) => {
  try {
    fs.writeFileSync(getHistoryPath(), JSON.stringify(history));
    return true;
  } catch (e) {
    log.error('Failed to save history:', e);
    return false;
  }
});

// App events
app.whenReady().then(() => {
  log.info('App ready, creating window');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  terminals.forEach((term) => term.process.kill());
  terminals.clear();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  terminals.forEach((term) => term.process.kill());
  terminals.clear();
  log.info('App quitting');
});

process.on('uncaughtException', (error) => log.error('Uncaught exception:', error));
process.on('unhandledRejection', (reason) => log.error('Unhandled rejection:', reason));
