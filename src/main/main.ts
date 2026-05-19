import {
  app,
  BrowserWindow,
  webContents,
  ipcMain,
  Menu,
  shell,
  dialog,
  globalShortcut,
  MenuItemConstructorOptions,
  IpcMainEvent,
  IpcMainInvokeEvent,
} from 'electron';
import path from 'path';
import os from 'os';
import fs from 'fs';
import * as pty from 'node-pty';
import log from 'electron-log';
import type { AppUpdater } from 'electron-updater';

if (process.platform === 'linux') {
  app.commandLine.appendSwitch('no-sandbox');
}

log.transports.file.level = 'info';
log.transports.console.level = 'debug';

interface Settings {
  fontFamily: string;
  fontSize: number;
  cursorStyle: string;
  cursorBlink: boolean;
  scrollback: number;
  shell: string;
  theme: string;
  titlebarStyle: string;
  opacity: number;
  hotkeyEnabled: boolean;
  hotkey: string;
}

interface TerminalEntry {
  process: pty.IPty;
  shell: string;
  webContentsId: number;
}

interface SshHost {
  host: string;
  hostname: string;
  user: string;
  port: string;
}

interface WindowOptions {
  width?: number;
  height?: number;
  workspaceName?: string;
}

interface CreateTerminalOptions {
  shell?: string;
  cwd?: string;
  cols?: number;
  rows?: number;
}

interface SetHotkeyOptions {
  enabled: boolean;
  hotkey: string;
}

interface SshWriteConfigOptions {
  alias: string;
  hostname: string;
  user?: string;
  port?: string;
}

function getIconPath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'icon.png')
    : path.join(__dirname, '../../build/icon.png');
}

let mainWindow: BrowserWindow | null = null;
const terminals = new Map<number, TerminalEntry>();
let terminalIdCounter = 0;

const DEFAULT_SETTINGS: Settings = {
  fontFamily: '"MesloLGS NF", monospace',
  fontSize: 13,
  cursorStyle: 'block',
  cursorBlink: true,
  scrollback: 10000,
  shell: '',
  theme: 'vibe',
  titlebarStyle: 'auto',
  opacity: 1.0,
  hotkeyEnabled: false,
  hotkey: 'CommandOrControl+`',
};

function getSettingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json');
}

function loadSettings(): Settings {
  try {
    const data = fs.readFileSync(getSettingsPath(), 'utf8');
    return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettingsToDisk(settings: Settings): boolean {
  try {
    fs.writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2));
    return true;
  } catch (e) {
    log.error('Failed to save settings:', e);
    return false;
  }
}

let registeredHotkey: string | null = null;

function registerHotkey(accelerator: string): void {
  if (registeredHotkey) {
    try { globalShortcut.unregister(registeredHotkey); } catch {}
    registeredHotkey = null;
  }
  if (!accelerator) return;
  try {
    const ok = globalShortcut.register(accelerator, () => {
      const win = mainWindow;
      if (!win) return;
      if (win.isVisible() && win.isFocused()) {
        win.hide();
      } else {
        win.show();
        win.focus();
      }
    });
    if (ok) registeredHotkey = accelerator;
    else log.warn('Hotkey registration failed (already in use?):', accelerator);
  } catch (e) {
    log.error('Failed to register hotkey:', e);
  }
}

let autoUpdaterInstance: AppUpdater | null = null;

function initUpdater(): AppUpdater | null {
  if (autoUpdaterInstance) return autoUpdaterInstance;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { autoUpdater } = require('electron-updater') as typeof import('electron-updater');
    autoUpdater.logger = log;
    autoUpdater.autoDownload = true;

    autoUpdater.on('update-available', (info: { version: string }) => {
      log.info('Update available:', info.version);
      mainWindow?.webContents.send('update-available', { version: info.version });
    });

    autoUpdater.on('update-downloaded', (info: { version: string }) => {
      log.info('Update downloaded:', info.version);
      mainWindow?.webContents.send('update-downloaded', { version: info.version });
    });

    autoUpdater.on('update-not-available', () => {
      mainWindow?.webContents.send('update-status', { message: 'You are on the latest version.' });
    });

    autoUpdater.on('error', (err: Error) => {
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

function checkForUpdates(): void {
  if (!app.isPackaged) {
    mainWindow?.webContents.send('update-status', { message: 'Auto-updates only available in packaged app.' });
    return;
  }
  const updater = initUpdater();
  if (!updater) {
    mainWindow?.webContents.send('update-status', { message: 'Update check failed: updater could not be initialized.' });
    return;
  }
  const timeout = setTimeout(() => {
    mainWindow?.webContents.send('update-status', { message: 'Update check timed out. Check your connection.' });
  }, 15000);
  updater.once('update-available', () => clearTimeout(timeout));
  updater.once('update-not-available', () => clearTimeout(timeout));
  updater.once('error', () => clearTimeout(timeout));
  updater.checkForUpdates();
}

const SHELL =
  process.platform === 'win32'
    ? 'powershell.exe'
    : (process.env.SHELL ?? '/bin/zsh');

function resolveShell(preferred: string): string {
  const candidates =
    process.platform === 'win32'
      ? [preferred]
      : [preferred, '/bin/zsh', '/bin/bash', '/bin/sh'];

  for (const sh of candidates) {
    if (!sh) continue;
    try {
      fs.accessSync(sh, fs.constants.X_OK);
      return sh;
    } catch {
      log.warn(`Shell not executable, skipping: ${sh}`);
    }
  }
  return preferred; // hand the original to pty so its error message is clear
}

function resolveCwd(requested: string): string {
  try {
    fs.accessSync(requested, fs.constants.X_OK);
    return requested;
  } catch {
    log.warn(`cwd not accessible (${requested}), falling back to home`);
    return os.homedir();
  }
}

function createWindow(opts: WindowOptions = {}): BrowserWindow {
  const win = new BrowserWindow({
    width: opts.width ?? 1200,
    height: opts.height ?? 800,
    minWidth: 600,
    minHeight: 400,
    frame: false,
    titleBarStyle: 'hidden',
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    icon: getIconPath(),
  });

  const loadOptions = opts.workspaceName
    ? { hash: `ws=${encodeURIComponent(opts.workspaceName)}` }
    : {};
  win.loadFile(path.join(__dirname, '../renderer/index.html'), loadOptions);

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  // Prevent Electron from showing a native context menu on Linux that would
  // overlap the renderer's custom HTML context menu
  win.webContents.on('context-menu', (e) => e.preventDefault());

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

function getFocusedWindow(): BrowserWindow | null {
  return BrowserWindow.getFocusedWindow() ?? mainWindow;
}

function createMenu(): void {
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Tab',
          accelerator: 'CmdOrCtrl+T',
          click: () => getFocusedWindow()?.webContents.send('new-tab'),
        },
        {
          label: 'Close Tab',
          accelerator: 'CmdOrCtrl+W',
          click: () => getFocusedWindow()?.webContents.send('close-tab'),
        },
        { type: 'separator' },
        {
          label: 'New Window',
          accelerator: 'CmdOrCtrl+N',
          click: () => createWindow(),
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
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
          click: () => getFocusedWindow()?.webContents.send('clear-terminal'),
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Split Horizontally',
          accelerator: 'CmdOrCtrl+D',
          click: () => getFocusedWindow()?.webContents.send('split-horizontal'),
        },
        {
          label: 'Split Vertically',
          accelerator: 'CmdOrCtrl+Shift+D',
          click: () => getFocusedWindow()?.webContents.send('split-vertical'),
        },
        { type: 'separator' },
        {
          label: 'Next Tab',
          accelerator: 'CmdOrCtrl+Shift+]',
          click: () => getFocusedWindow()?.webContents.send('next-tab'),
        },
        {
          label: 'Previous Tab',
          accelerator: 'CmdOrCtrl+Shift+[',
          click: () => getFocusedWindow()?.webContents.send('prev-tab'),
        },
        { type: 'separator' },
        {
          label: 'Search',
          accelerator: 'CmdOrCtrl+F',
          click: () => getFocusedWindow()?.webContents.send('show-search'),
        },
        {
          label: 'Command Palette',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => getFocusedWindow()?.webContents.send('show-command-palette'),
        },
        { type: 'separator' },
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => getFocusedWindow()?.webContents.send('show-settings'),
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Check for Updates',
          click: () => checkForUpdates(),
        },
        { type: 'separator' },
        {
          label: 'About VibeTerminal',
          click: () => {
            if (mainWindow) {
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'About VibeTerminal',
                message: `VibeTerminal v${app.getVersion()}`,
                detail: 'A beautiful, feature-rich terminal emulator.\n\nBuilt with Electron, xterm.js, and node-pty.',
              });
            }
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// IPC Handlers
ipcMain.handle('get-settings', () => loadSettings());

ipcMain.handle('save-settings', (_event: IpcMainInvokeEvent, settings: Settings) => {
  return { success: saveSettingsToDisk(settings) };
});

ipcMain.on('check-for-updates', () => checkForUpdates());

ipcMain.on('install-update', () => {
  autoUpdaterInstance?.quitAndInstall();
});

ipcMain.handle('create-terminal', async (event: IpcMainInvokeEvent, options: CreateTerminalOptions = {}) => {
  const settings = loadSettings();
  const id = ++terminalIdCounter;
  const rawShell = options.shell || (settings.shell && settings.shell.trim()) || SHELL;
  const resolvedShell = resolveShell(rawShell);
  const cwd = resolveCwd(options.cwd ?? os.homedir());
  const senderWcId = event.sender.id;

  const env: Record<string, string> = { ...(process.env as Record<string, string>) };
  env.TERM = 'xterm-256color';
  env.COLORTERM = 'truecolor';
  env.TERM_PROGRAM = 'VibeTerminal';

  log.info(`Spawning terminal ${id}: shell=${resolvedShell} cwd=${cwd} platform=${process.platform}`);

  try {
    const ptyProcess = pty.spawn(resolvedShell, [], {
      name: 'xterm-256color',
      cols: options.cols ?? 80,
      rows: options.rows ?? 24,
      cwd,
      env,
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
    log.error(`Failed to create terminal (shell=${resolvedShell} cwd=${cwd} SHELL_env=${process.env.SHELL ?? 'unset'}):`, error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.on('terminal-input', (_event: IpcMainEvent, { id, data }: { id: number; data: string }) => {
  terminals.get(id)?.process.write(data);
});

ipcMain.on('terminal-resize', (_event: IpcMainEvent, { id, cols, rows }: { id: number; cols: number; rows: number }) => {
  terminals.get(id)?.process.resize(cols, rows);
});

ipcMain.on('terminal-kill', (_event: IpcMainEvent, { id }: { id: number }) => {
  const terminal = terminals.get(id);
  if (terminal) {
    terminal.process.kill();
    terminals.delete(id);
  }
});

ipcMain.on('window-minimize', (event: IpcMainEvent) => {
  BrowserWindow.fromWebContents(event.sender)?.minimize();
});

ipcMain.on('window-maximize', (event: IpcMainEvent) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win?.isMaximized()) win.unmaximize();
  else win?.maximize();
});

ipcMain.on('window-close', (event: IpcMainEvent) => {
  BrowserWindow.fromWebContents(event.sender)?.close();
});

ipcMain.handle('window-is-maximized', (event: IpcMainInvokeEvent) => {
  return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false;
});

ipcMain.handle('create-window', (_event: IpcMainInvokeEvent, { workspaceName }: { workspaceName?: string } = {}) => {
  createWindow({ workspaceName, width: 900, height: 700 });
  return {};
});

ipcMain.handle('get-shell-path', () => SHELL);
ipcMain.handle('get-platform', () => process.platform);
ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.handle('set-hotkey', (_event: IpcMainInvokeEvent, { enabled, hotkey }: SetHotkeyOptions) => {
  if (enabled && hotkey) {
    registerHotkey(hotkey);
  } else {
    if (registeredHotkey) {
      try { globalShortcut.unregister(registeredHotkey); } catch {}
      registeredHotkey = null;
    }
  }
  return { success: true };
});

ipcMain.on('open-external', (_event: IpcMainEvent, url: string) => {
  if (/^https?:\/\//.test(url)) shell.openExternal(url);
});

ipcMain.handle('send-feedback', async (_event: IpcMainInvokeEvent, text: string) => {
  const WEBHOOK_URL = 'https://discord.com/api/webhooks/1503746290821890179/BhkQyscm6qN4-3-8rTq7sb7STK2C9jD1HfqGnVyN1bkbwG2idHdLLJ0yCVToxgCDhxBz';
  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: `**VibeTerminal Feedback**\n${text}` }),
  });
  return res.ok;
});

// SSH Config
const SSH_CONFIG_PATH = path.join(os.homedir(), '.ssh', 'config');

function parseSshConfig(content: string): SshHost[] {
  const hosts: SshHost[] = [];
  let current: SshHost | null = null;
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const m = trimmed.match(/^(\S+)\s+(.+)$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const value = m[2].trim();
    if (key === 'host') {
      if (current && !current.host.includes('*')) hosts.push(current);
      current = { host: value, hostname: '', user: '', port: '22' };
    } else if (current) {
      if (key === 'hostname') current.hostname = value;
      else if (key === 'user') current.user = value;
      else if (key === 'port') current.port = value;
    }
  }
  if (current && !current.host.includes('*')) hosts.push(current);
  return hosts;
}

ipcMain.handle('ssh-read-config', () => {
  try {
    if (!fs.existsSync(SSH_CONFIG_PATH)) return { hosts: [] };
    return { hosts: parseSshConfig(fs.readFileSync(SSH_CONFIG_PATH, 'utf8')) };
  } catch (e) {
    log.error('ssh-read-config error:', e);
    return { hosts: [] };
  }
});

ipcMain.handle('ssh-write-config', (_event: IpcMainInvokeEvent, { alias, hostname, user, port }: SshWriteConfigOptions) => {
  try {
    const sshDir = path.join(os.homedir(), '.ssh');
    if (!fs.existsSync(sshDir)) fs.mkdirSync(sshDir, { mode: 0o700 });
    let entry = `\nHost ${alias}\n    HostName ${hostname}\n`;
    if (user) entry += `    User ${user}\n`;
    if (port && port !== '22') entry += `    Port ${port}\n`;
    fs.appendFileSync(SSH_CONFIG_PATH, entry, 'utf8');
    return { success: true };
  } catch (e) {
    log.error('ssh-write-config error:', e);
    return { success: false, error: (e as Error).message };
  }
});

// SSH Groups
const SSH_GROUPS_PATH = path.join(app.getPath('userData'), 'ssh-groups.json');

ipcMain.handle('ssh-read-groups', () => {
  try {
    if (!fs.existsSync(SSH_GROUPS_PATH)) return { groups: [] };
    return { groups: JSON.parse(fs.readFileSync(SSH_GROUPS_PATH, 'utf8')) };
  } catch {
    return { groups: [] };
  }
});

ipcMain.handle('ssh-write-groups', (_event: IpcMainInvokeEvent, groups: unknown) => {
  try {
    fs.writeFileSync(SSH_GROUPS_PATH, JSON.stringify(groups, null, 2));
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
});

// App events
app.whenReady().then(() => {
  log.info('App ready, creating window');
  createWindow();

  const settings = loadSettings();
  if (settings.hotkeyEnabled && settings.hotkey) {
    registerHotkey(settings.hotkey);
  }

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
  globalShortcut.unregisterAll();
  log.info('App quitting');
});

process.on('uncaughtException', (error) => log.error('Uncaught exception:', error));
process.on('unhandledRejection', (reason) => log.error('Unhandled rejection:', reason));
