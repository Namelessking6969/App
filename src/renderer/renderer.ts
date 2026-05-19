import { Terminal, ITheme } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { SearchAddon } from 'xterm-addon-search';
import { WebLinksAddon } from 'xterm-addon-web-links';

// ─── Types ───────────────────────────────────────────────────────────────────

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

interface SshHost {
  host: string;
  hostname: string;
  user: string;
  port: string;
}

interface SshGroup {
  id: string;
  name: string;
  hostAliases: string[];
  collapsed: boolean;
}

interface TerminalData {
  id: number;
  terminal: Terminal;
  fitAddon: FitAddon;
  searchAddon: SearchAddon;
  wrapper: HTMLElement;
}

interface Tab {
  id: string;
  title: string;
  terminals: TerminalData[];
  activeTerminalIndex: number;
  container: HTMLElement | null;
  color?: string | null;
  hasActivity?: boolean;
}

interface Workspace {
  id: string;
  name: string;
  tabs: Tab[];
  activeTabId: string | null;
}

interface Command {
  id: string;
  title: string;
  shortcut: string;
  action: () => void;
}

type MenuItem = 'separator' | { label: string; action: () => void; danger?: boolean };

interface ThemeDefinition {
  label: string;
  vars: Record<string, string>;
  terminal: ITheme;
}

interface CreateTerminalResult {
  success: boolean;
  id: number;
  error?: string;
}

declare global {
  interface Window {
    terminalAPI: {
      createTerminal(options?: Record<string, unknown>): Promise<CreateTerminalResult>;
      write(id: number, data: string): void;
      resize(id: number, cols: number, rows: number): void;
      kill(id: number): void;
      onData(callback: (data: { id: number; data: string }) => void): () => void;
      onExit(callback: (data: { id: number; exitCode: number; signal: number }) => void): () => void;
      onNewTab(callback: () => void): void;
      onCloseTab(callback: () => void): void;
      onClearTerminal(callback: () => void): void;
      onNextTab(callback: () => void): void;
      onPrevTab(callback: () => void): void;
      onSplitHorizontal(callback: () => void): void;
      onSplitVertical(callback: () => void): void;
      onShowSearch(callback: () => void): void;
      onShowCommandPalette(callback: () => void): void;
      onShowSettings(callback: () => void): void;
      openNewWindow(workspaceName?: string): Promise<void>;
      minimize(): void;
      maximize(): void;
      close(): void;
      isMaximized(): Promise<boolean>;
      getShellPath(): Promise<string>;
      getPlatform(): Promise<string>;
      readSshConfig(): Promise<{ hosts: SshHost[] }>;
      writeSshConfig(entry: { alias: string; hostname: string; user?: string; port?: string }): Promise<{ success: boolean }>;
      readSshGroups(): Promise<{ groups: SshGroup[] }>;
      writeSshGroups(groups: SshGroup[]): Promise<{ success: boolean }>;
      getSettings(): Promise<Settings>;
      saveSettings(settings: Settings): Promise<{ success: boolean }>;
      checkForUpdates(): void;
      installUpdate(): void;
      onUpdateAvailable(callback: (data: { version: string }) => void): () => void;
      onUpdateDownloaded(callback: (data: { version: string }) => void): () => void;
      onUpdateStatus(callback: (data: { message: string }) => void): () => void;
      setHotkey(opts: { enabled: boolean; hotkey: string }): Promise<{ success: boolean }>;
      openExternal(url: string): void;
      getAppVersion(): Promise<string>;
      sendFeedback(text: string): Promise<boolean>;
    };
    terminalManager: TerminalManager;
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FONT_PRESETS: string[] = [
  '"MesloLGS NF", monospace',
  '"JetBrainsMono Nerd Font", "JetBrains Mono", monospace',
  '"FiraCode Nerd Font", "Fira Code", monospace',
  '"Hack Nerd Font", Hack, monospace',
  '"CaskaydiaCove Nerd Font", "Cascadia Code", monospace',
  '"IosevkaTerm Nerd Font", Iosevka, monospace',
  '"UbuntuMono Nerd Font", "Ubuntu Mono", monospace',
];

const THEMES: Record<string, ThemeDefinition> = {
  vibe: {
    label: 'Vibe',
    vars: {
      '--bg': '#0D0D0D', '--bg-secondary': '#1A1A1A',
      '--fg': '#E0E0E0', '--fg-dim': '#888888',
      '--cursor': '#00FF88',
      '--selection': 'rgba(0, 255, 136, 0.2)',
      '--accent': '#00FF88', '--accent-dim': '#00FF8880',
      '--border': '#2A2A2A', '--tab-active': '#00FF88',
      '--btn-close': '#FF5F57', '--btn-minimize': '#FFBD2E', '--btn-maximize': '#28CA41',
    },
    terminal: {
      background: '#0D0D0D', foreground: '#E0E0E0',
      cursor: '#00FF88', cursorAccent: '#0D0D0D', selectionBackground: '#00FF8833',
      black: '#1A1A2E', red: '#FF6B6B', green: '#4ADE80', yellow: '#FACC15',
      blue: '#60A5FA', magenta: '#C084FC', cyan: '#22D3EE', white: '#E0E0E0',
      brightBlack: '#4A4A5A', brightRed: '#FF8888', brightGreen: '#6EE7A0',
      brightYellow: '#FDE547', brightBlue: '#93C5FD', brightMagenta: '#D8B4FE',
      brightCyan: '#67E8F9', brightWhite: '#FFFFFF',
    },
  },
  dracula: {
    label: 'Dracula',
    vars: {
      '--bg': '#282A36', '--bg-secondary': '#1E1F29',
      '--fg': '#F8F8F2', '--fg-dim': '#6272A4',
      '--cursor': '#BD93F9',
      '--selection': 'rgba(189, 147, 249, 0.2)',
      '--accent': '#BD93F9', '--accent-dim': '#BD93F980',
      '--border': '#44475A', '--tab-active': '#BD93F9',
      '--btn-close': '#FF5555', '--btn-minimize': '#F1FA8C', '--btn-maximize': '#50FA7B',
    },
    terminal: {
      background: '#282A36', foreground: '#F8F8F2',
      cursor: '#BD93F9', cursorAccent: '#282A36', selectionBackground: '#44475A',
      black: '#21222C', red: '#FF5555', green: '#50FA7B', yellow: '#F1FA8C',
      blue: '#6272A4', magenta: '#BD93F9', cyan: '#8BE9FD', white: '#F8F8F2',
      brightBlack: '#6272A4', brightRed: '#FF6E6E', brightGreen: '#69FF94',
      brightYellow: '#FFFFA5', brightBlue: '#D6ACFF', brightMagenta: '#FF92DF',
      brightCyan: '#A4FFFF', brightWhite: '#FFFFFF',
    },
  },
  nord: {
    label: 'Nord',
    vars: {
      '--bg': '#2E3440', '--bg-secondary': '#3B4252',
      '--fg': '#ECEFF4', '--fg-dim': '#4C566A',
      '--cursor': '#88C0D0',
      '--selection': 'rgba(136, 192, 208, 0.2)',
      '--accent': '#88C0D0', '--accent-dim': '#88C0D080',
      '--border': '#434C5E', '--tab-active': '#88C0D0',
      '--btn-close': '#BF616A', '--btn-minimize': '#EBCB8B', '--btn-maximize': '#A3BE8C',
    },
    terminal: {
      background: '#2E3440', foreground: '#ECEFF4',
      cursor: '#88C0D0', cursorAccent: '#2E3440', selectionBackground: '#434C5E',
      black: '#3B4252', red: '#BF616A', green: '#A3BE8C', yellow: '#EBCB8B',
      blue: '#81A1C1', magenta: '#B48EAD', cyan: '#88C0D0', white: '#E5E9F0',
      brightBlack: '#4C566A', brightRed: '#BF616A', brightGreen: '#A3BE8C',
      brightYellow: '#EBCB8B', brightBlue: '#81A1C1', brightMagenta: '#B48EAD',
      brightCyan: '#8FBCBB', brightWhite: '#ECEFF4',
    },
  },
  monokai: {
    label: 'Monokai',
    vars: {
      '--bg': '#272822', '--bg-secondary': '#1E1F1C',
      '--fg': '#F8F8F2', '--fg-dim': '#75715E',
      '--cursor': '#F8F8F0',
      '--selection': 'rgba(249, 38, 114, 0.2)',
      '--accent': '#A6E22E', '--accent-dim': '#A6E22E80',
      '--border': '#3E3D32', '--tab-active': '#A6E22E',
      '--btn-close': '#F92672', '--btn-minimize': '#F4BF75', '--btn-maximize': '#A6E22E',
    },
    terminal: {
      background: '#272822', foreground: '#F8F8F2',
      cursor: '#F8F8F0', cursorAccent: '#272822', selectionBackground: '#49483E',
      black: '#272822', red: '#F92672', green: '#A6E22E', yellow: '#F4BF75',
      blue: '#66D9E8', magenta: '#AE81FF', cyan: '#2AA198', white: '#F8F8F2',
      brightBlack: '#75715E', brightRed: '#F92672', brightGreen: '#A6E22E',
      brightYellow: '#F4BF75', brightBlue: '#66D9E8', brightMagenta: '#AE81FF',
      brightCyan: '#2AA198', brightWhite: '#F9F8F5',
    },
  },
  catppuccin: {
    label: 'Catppuccin Mocha',
    vars: {
      '--bg': '#1E1E2E', '--bg-secondary': '#181825',
      '--fg': '#CDD6F4', '--fg-dim': '#6C7086',
      '--cursor': '#F5E0DC',
      '--selection': 'rgba(203, 166, 247, 0.2)',
      '--accent': '#CBA6F7', '--accent-dim': '#CBA6F780',
      '--border': '#313244', '--tab-active': '#CBA6F7',
      '--btn-close': '#F38BA8', '--btn-minimize': '#F9E2AF', '--btn-maximize': '#A6E3A1',
    },
    terminal: {
      background: '#1E1E2E', foreground: '#CDD6F4',
      cursor: '#F5E0DC', cursorAccent: '#1E1E2E', selectionBackground: '#313244',
      black: '#45475A', red: '#F38BA8', green: '#A6E3A1', yellow: '#F9E2AF',
      blue: '#89B4FA', magenta: '#CBA6F7', cyan: '#89DCEB', white: '#BAC2DE',
      brightBlack: '#585B70', brightRed: '#F38BA8', brightGreen: '#A6E3A1',
      brightYellow: '#F9E2AF', brightBlue: '#89B4FA', brightMagenta: '#CBA6F7',
      brightCyan: '#89DCEB', brightWhite: '#A6ADC8',
    },
  },
};

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

const TAB_COLORS: (string | null)[] = [
  null, '#FF6B6B', '#FACC15', '#4ADE80', '#60A5FA', '#C084FC', '#22D3EE', '#FB923C', '#F97316',
];

// ─── TerminalManager ─────────────────────────────────────────────────────────

class TerminalManager {
  workspaces: Workspace[] = [];
  activeWorkspaceId: string | null = null;
  terminals = new Map<number, TerminalData>();
  settings: Settings = { ...DEFAULT_SETTINGS };
  searchTerm = '';
  platform = 'linux';
  lastMouseX = 0;
  lastMouseY = 0;
  _nextId = 0;
  pasteHistory: string[] = [];
  broadcastInput = false;
  commands: Command[];

  constructor() {
    this.commands = [
      { id: 'newTab',        title: 'New Tab',              shortcut: '⌘T',   action: () => this.addTab() },
      { id: 'closeTab',      title: 'Close Tab',            shortcut: '⌘W',   action: () => this.closeActiveTab() },
      { id: 'splitH',        title: 'Split Horizontally',   shortcut: '⌘D',   action: () => this.splitActivePane('horizontal') },
      { id: 'splitV',        title: 'Split Vertically',     shortcut: '⌘⇧D',  action: () => this.splitActivePane('vertical') },
      { id: 'nextTab',       title: 'Next Tab',             shortcut: '⌘⇧]',  action: () => this.nextTab() },
      { id: 'prevTab',       title: 'Previous Tab',         shortcut: '⌘⇧[',  action: () => this.prevTab() },
      { id: 'newWorkspace',  title: 'New Workspace',        shortcut: '⌘⇧N',  action: () => this.addWorkspace() },
      { id: 'nextWorkspace', title: 'Next Workspace',       shortcut: '⌘⇧.',  action: () => this.nextWorkspace() },
      { id: 'prevWorkspace', title: 'Previous Workspace',   shortcut: '⌘⇧,',  action: () => this.prevWorkspace() },
      { id: 'clear',         title: 'Clear Terminal',       shortcut: '⌘K',   action: () => this.clearActiveTerminal() },
      { id: 'search',        title: 'Search...',            shortcut: '⌘F',   action: () => this.showSearch() },
      { id: 'settings',      title: 'Settings',             shortcut: '⌘,',   action: () => this.showSettings() },
      { id: 'pasteHistory',  title: 'Paste History',        shortcut: '⌃⇧H',  action: () => this.showPasteHistory() },
      { id: 'broadcast',     title: 'Toggle Broadcast Input', shortcut: '⌃⇧B', action: () => this.toggleBroadcast() },
    ];
    this.init();
  }

  get currentWorkspace(): Workspace | null {
    return this.workspaces.find(w => w.id === this.activeWorkspaceId) ?? null;
  }

  get tabs(): Tab[] {
    return this.currentWorkspace ? this.currentWorkspace.tabs : [];
  }

  get activeTabId(): string | null {
    return this.currentWorkspace ? this.currentWorkspace.activeTabId : null;
  }

  set activeTabId(id: string | null) {
    if (this.currentWorkspace) this.currentWorkspace.activeTabId = id;
  }

  async init(): Promise<void> {
    try {
      this.settings = await window.terminalAPI.getSettings();
    } catch {
      this.settings = { ...DEFAULT_SETTINGS };
    }
    try { this.platform = await window.terminalAPI.getPlatform(); } catch {}
    const initOpacity = this.settings.opacity ?? 1.0;
this.applyTheme(this.settings.theme || 'vibe', initOpacity);
    this.renderTitlebar();
    this.setupEventListeners();
    const hash = window.location.hash;
    const initialName = (hash && hash.startsWith('#ws='))
      ? decodeURIComponent(hash.slice(4))
      : 'workspace 1';
    await this.addWorkspace(initialName);
  }

  setupEventListeners(): void {
    window.terminalAPI.onNewTab(() => this.addTab());
    window.terminalAPI.onCloseTab(() => this.closeActiveTab());
    window.terminalAPI.onClearTerminal(() => this.clearActiveTerminal());
    window.terminalAPI.onNextTab(() => this.nextTab());
    window.terminalAPI.onPrevTab(() => this.prevTab());
    window.terminalAPI.onSplitHorizontal(() => this.splitActivePane('horizontal'));
    window.terminalAPI.onSplitVertical(() => this.splitActivePane('vertical'));
    window.terminalAPI.onShowSearch(() => this.showSearch());
    window.terminalAPI.onShowCommandPalette(() => this.showCommandPalette());
    window.terminalAPI.onShowSettings(() => this.showSettings());

    window.terminalAPI.onData(({ id, data }) => {
      const term = this.terminals.get(id);
      if (term) {
        term.terminal.write(data);
        const tab = this._findTabForTerminalId(id);
        if (tab && tab.id !== this.activeTabId && !tab.hasActivity) {
          tab.hasActivity = true;
          const tabEl = document.querySelector(`.tab[data-tab-id="${tab.id}"]`);
          if (tabEl) tabEl.classList.add('activity');
        }
      }
    });

    window.terminalAPI.onExit(({ id }) => {
      this.terminals.delete(id);
      for (const ws of this.workspaces) {
        const tab = ws.tabs.find(t => t.terminals.some(tn => tn.id === id));
        if (tab) {
          const exitedTermData = tab.terminals.find(tn => tn.id === id);
          tab.terminals = tab.terminals.filter(tn => tn.id !== id);
          if (tab.terminals.length === 0) {
            if (ws.id === this.activeWorkspaceId) {
              this.closeTab(tab.id);
            } else {
              ws.tabs = ws.tabs.filter(t => t.id !== tab.id);
            }
          } else if (exitedTermData) {
            this._collapsePane(exitedTermData.wrapper, tab);
            tab.activeTerminalIndex = Math.min(tab.activeTerminalIndex, tab.terminals.length - 1);
            const active = tab.terminals[tab.activeTerminalIndex];
            if (active) active.terminal.focus();
          }
          break;
        }
      }
    });

    window.terminalAPI.onUpdateAvailable(({ version }) => {
      const banner = document.getElementById('updateBanner')!;
      banner.innerHTML = `<span>Version ${version} is downloading in the background...</span>`;
      banner.classList.add('visible');
    });

    window.terminalAPI.onUpdateDownloaded(({ version }) => {
      const banner = document.getElementById('updateBanner')!;
      banner.innerHTML = `
        <span>Version ${version} is ready to install.</span>
        <button class="update-banner-btn" onclick="terminalManager.installUpdate()">Restart &amp; Update</button>
      `;
      banner.classList.add('visible');
    });

    window.terminalAPI.onUpdateStatus(({ message }) => {
      document.getElementById('updateStatus')!.textContent = message;
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.hideOverlays();
    });

    // Capture-phase handler so shortcuts fire even when xterm has keyboard focus.
    // On Linux/Wayland, Electron menu accelerators don't reliably reach the renderer
    // when a canvas-based element (xterm) has focus, so we intercept here instead.
    document.addEventListener('keydown', (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (e.shiftKey && e.code === 'KeyD') {
        e.preventDefault(); e.stopPropagation();
        this.splitActivePane('vertical');
      }
      if (e.shiftKey && e.code === 'KeyH') {
        e.preventDefault(); e.stopPropagation();
        this.showPasteHistory();
      }
      if (e.shiftKey && e.code === 'KeyB') {
        e.preventDefault(); e.stopPropagation();
        this.toggleBroadcast();
      }
    }, true);

    // Single global resize handler fits all terminals — avoids per-terminal listener accumulation
    window.addEventListener('resize', () => {
      this.terminals.forEach(({ fitAddon }) => fitAddon.fit());
    });

    // Track mouse position so contextmenu handler has valid coords on Linux
    document.addEventListener('mousemove', (e) => { this.lastMouseX = e.clientX; this.lastMouseY = e.clientY; }, true);
    document.addEventListener('mousedown', (e) => { this.lastMouseX = e.clientX; this.lastMouseY = e.clientY; }, true);
  }

  // ─── Workspace management ─────────────────────────────────────────────────

  async addWorkspace(name?: string): Promise<void> {
    const id = String(++this._nextId);
    const num = this.workspaces.length + 1;
    const workspace: Workspace = { id, name: name || `workspace ${num}`, tabs: [], activeTabId: null };
    this.workspaces.push(workspace);
    this.activeWorkspaceId = id;
    this.renderWorkspaces();
    this.renderTabs();
    await this.addTab();
  }

  closeWorkspace(id: string): void {
    if (this.workspaces.length === 1) return;
    const ws = this.workspaces.find(w => w.id === id);
    if (!ws) return;

    ws.tabs.forEach(tab => {
      tab.terminals.forEach(t => {
        window.terminalAPI.kill(t.id);
        this.terminals.delete(t.id);
      });
      if (tab.container) tab.container.remove();
    });

    const index = this.workspaces.findIndex(w => w.id === id);
    this.workspaces.splice(index, 1);

    if (this.activeWorkspaceId === id) {
      const next = this.workspaces[Math.min(index, this.workspaces.length - 1)];
      this.setActiveWorkspace(next.id);
    } else {
      this.renderWorkspaces();
    }
  }

  setActiveWorkspace(id: string): void {
    this.activeWorkspaceId = id;
    const ws = this.workspaces.find(w => w.id === id);
    if (ws) {
      const tabId = ws.activeTabId || (ws.tabs.length > 0 ? ws.tabs[0].id : null);
      if (tabId) {
        this.setActiveTab(tabId);
      } else {
        document.querySelectorAll('.terminal-view').forEach(v => v.classList.remove('active'));
        this.renderTabs();
      }
    }
    this.renderWorkspaces();
  }

  nextWorkspace(): void {
    const index = this.workspaces.findIndex(w => w.id === this.activeWorkspaceId);
    this.setActiveWorkspace(this.workspaces[(index + 1) % this.workspaces.length].id);
  }

  prevWorkspace(): void {
    const index = this.workspaces.findIndex(w => w.id === this.activeWorkspaceId);
    this.setActiveWorkspace(this.workspaces[(index - 1 + this.workspaces.length) % this.workspaces.length].id);
  }

  async undockWorkspace(wsId: string): Promise<void> {
    const ws = this.workspaces.find(w => w.id === wsId);
    if (!ws) return;
    await window.terminalAPI.openNewWindow(ws.name);
    if (this.workspaces.length > 1) this.closeWorkspace(wsId);
  }

  startWorkspaceRename(id: string, nameEl: Element): void {
    const ws = this.workspaces.find(w => w.id === id);
    if (!ws) return;

    const input = document.createElement('input');
    input.value = ws.name;
    input.className = 'workspace-rename-input';

    const finish = () => {
      ws.name = input.value.trim() || ws.name;
      this.renderWorkspaces();
    };

    input.onblur = finish;
    input.onkeydown = (e) => {
      if (e.key === 'Enter') input.blur();
      if (e.key === 'Escape') { input.value = ws.name; input.blur(); }
      e.stopPropagation();
    };

    nameEl.replaceWith(input);
    requestAnimationFrame(() => { input.focus(); input.select(); });
  }

  showContextMenu(x: number, y: number, items: MenuItem[]): void {
    // On Linux/Wayland, contextmenu events sometimes report (0,0) — fall back to last known position
    if (x === 0 && y === 0) { x = this.lastMouseX; y = this.lastMouseY; }
    document.getElementById('contextMenu')?.remove();

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.id = 'contextMenu';

    items.forEach(item => {
      if (item === 'separator') {
        const sep = document.createElement('div');
        sep.className = 'context-menu-separator';
        menu.appendChild(sep);
      } else {
        const el = document.createElement('div');
        el.className = `context-menu-item${item.danger ? ' danger' : ''}`;
        el.textContent = item.label;
        el.onclick = () => { menu.remove(); item.action(); };
        menu.appendChild(el);
      }
    });

    document.body.appendChild(menu);

    const vw = window.innerWidth, vh = window.innerHeight;
    const mw = menu.offsetWidth, mh = menu.offsetHeight;
    menu.style.left = (x + mw > vw ? vw - mw - 8 : x) + 'px';
    menu.style.top = (y + mh > vh ? vh - mh - 8 : y) + 'px';

    const dismiss = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) {
        menu.remove();
        document.removeEventListener('mousedown', dismiss);
      }
    };
    setTimeout(() => document.addEventListener('mousedown', dismiss), 0);
  }

  startTabRename(tabId: string, titleEl: Element): void {
    const tab = this.tabs.find(t => t.id === tabId);
    if (!tab) return;

    const input = document.createElement('input');
    input.value = tab.title;
    input.className = 'tab-rename-input';

    const finish = () => {
      tab.title = input.value.trim() || tab.title;
      this.renderTabs();
    };

    input.onblur = finish;
    input.onkeydown = (e) => {
      if (e.key === 'Enter') input.blur();
      if (e.key === 'Escape') { input.value = tab.title; input.blur(); }
      e.stopPropagation();
    };

    titleEl.replaceWith(input);
    requestAnimationFrame(() => { input.focus(); input.select(); });
  }

  renderWorkspaces(): void {
    const bar = document.getElementById('workspacebar')!;
    bar.innerHTML = '';

    this.workspaces.forEach(ws => {
      const el = document.createElement('div');
      el.className = `workspace-item ${ws.id === this.activeWorkspaceId ? 'active' : ''}`;

      const nameEl = document.createElement('span');
      nameEl.className = 'workspace-item-name';
      nameEl.textContent = ws.name;
      nameEl.ondblclick = (e) => {
        e.stopPropagation();
        this.startWorkspaceRename(ws.id, nameEl);
      };

      const undockEl = document.createElement('span');
      undockEl.className = 'workspace-item-undock';
      undockEl.textContent = '↗';
      undockEl.title = 'Undock to new window';
      undockEl.onclick = (e) => { e.stopPropagation(); this.undockWorkspace(ws.id); };

      const closeEl = document.createElement('span');
      closeEl.className = 'workspace-item-close';
      closeEl.textContent = '✕';
      closeEl.onclick = (e) => { e.stopPropagation(); this.closeWorkspace(ws.id); };

      el.appendChild(nameEl);
      el.appendChild(undockEl);
      if (this.workspaces.length > 1) el.appendChild(closeEl);
      el.onclick = () => { if (ws.id !== this.activeWorkspaceId) this.setActiveWorkspace(ws.id); };
      el.oncontextmenu = (e) => {
        e.preventDefault(); e.stopPropagation();
        this.setActiveWorkspace(ws.id);
        const menuItems: MenuItem[] = [
          { label: 'Rename', action: () => {
            const n = document.querySelector('.workspace-item.active .workspace-item-name');
            if (n) this.startWorkspaceRename(ws.id, n);
          }},
          { label: 'Undock to New Window', action: () => this.undockWorkspace(ws.id) },
          'separator',
          { label: 'New Workspace', action: () => this.addWorkspace() },
        ];
        if (this.workspaces.length > 1) {
          menuItems.push({ label: 'Close Workspace', danger: true, action: () => this.closeWorkspace(ws.id) });
        }
        this.showContextMenu(e.clientX, e.clientY, menuItems);
      };
      bar.appendChild(el);
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'workspace-add';
    addBtn.textContent = '+';
    addBtn.title = 'New Workspace';
    addBtn.onclick = () => this.addWorkspace();
    bar.appendChild(addBtn);
  }

  // ─── Tab management ───────────────────────────────────────────────────────

  async addTab(): Promise<void> {
    if (!this.currentWorkspace) return;
    const id = String(++this._nextId);
    const shellPath = await window.terminalAPI.getShellPath();
    const shell = shellPath.split('/').pop() ?? shellPath;
    const tab: Tab = { id, title: shell, terminals: [], activeTerminalIndex: 0, container: null };
    this.currentWorkspace.tabs.push(tab);
    await this.createTerminalForTab(tab);
    this.setActiveTab(id);
    this.renderTabs();
  }

  async createTerminalForTab(tab: Tab): Promise<void> {
    if (!tab.container) {
      const container = document.createElement('div');
      container.className = 'terminal-view';
      container.dataset.tabId = tab.id;
      document.getElementById('terminalContainer')!.appendChild(container);
      tab.container = container;
    }
    const wrapper = document.createElement('div');
    wrapper.className = 'terminal-wrapper';
    tab.container.appendChild(wrapper);
    await this._spawnTerminalInWrapper(tab, wrapper);
  }

  async _spawnTerminalInWrapper(tab: Tab, wrapper: HTMLElement): Promise<void> {
    const result = await window.terminalAPI.createTerminal({ cols: 80, rows: 24 });
    if (!result.success) return;

    const s = this.settings;
    const terminal = new Terminal({
      theme: this.getXtermTheme(),
      fontFamily: s.fontFamily,
      fontSize: s.fontSize,
      cursorBlink: s.cursorBlink,
      cursorStyle: s.cursorStyle as 'block' | 'underline' | 'bar',
      scrollback: s.scrollback,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();
    const webLinksAddon = new WebLinksAddon((_event, url) => {
      window.terminalAPI.openExternal(url);
    });

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(searchAddon);
    terminal.loadAddon(webLinksAddon);
    terminal.open(wrapper);
    fitAddon.fit();

    // Copy: Ctrl+Shift+C  |  Paste: Ctrl+Shift+V or Ctrl+V
    terminal.attachCustomKeyEventHandler((e) => {
      if (e.type !== 'keydown') return true;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.shiftKey && e.key === 'C') {
        const sel = terminal.getSelection();
        if (sel) navigator.clipboard.writeText(sel).catch(() => {});
        return false;
      }
      if (mod && (e.key === 'v' || (e.shiftKey && e.key === 'V'))) {
        e.preventDefault();
        navigator.clipboard.readText().then(text => {
          if (!text) return;
          this.addToPasteHistory(text);
          if (this.broadcastInput) {
            const t = this.tabs.find(t => t.id === this.activeTabId);
            if (t) { t.terminals.forEach(tn => tn.terminal.paste(text)); return; }
          }
          terminal.paste(text);
        }).catch(() => {});
        return false;
      }
      return true;
    });

    wrapper.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const sel = terminal.getSelection();
      if (sel) {
        navigator.clipboard.writeText(sel).catch(() => {});
      } else {
        navigator.clipboard.readText().then(text => {
          if (!text) return;
          this.addToPasteHistory(text);
          if (this.broadcastInput) {
            const t = this.tabs.find(t => t.id === this.activeTabId);
            if (t) { t.terminals.forEach(tn => tn.terminal.paste(text)); return; }
          }
          terminal.paste(text);
        }).catch(() => {});
      }
    });

    const terminalData: TerminalData = { id: result.id, terminal, fitAddon, searchAddon, wrapper };
    this.terminals.set(result.id, terminalData);
    tab.terminals.push(terminalData);
    tab.activeTerminalIndex = tab.terminals.length - 1;

    terminal.onData((data) => {
      if (this.broadcastInput) {
        const t = this.tabs.find(t => t.id === this.activeTabId);
        if (t) { t.terminals.forEach(tn => window.terminalAPI.write(tn.id, data)); return; }
      }
      window.terminalAPI.write(result.id, data);
    });
    terminal.onResize(({ cols, rows }) => {
      window.terminalAPI.resize(result.id, cols, rows);
      document.getElementById('dimensions')!.textContent = `${cols}x${rows}`;
    });

    wrapper.addEventListener('mousedown', () => {
      tab.activeTerminalIndex = tab.terminals.indexOf(terminalData);
      terminal.focus();
    });

    terminal.focus();
  }

  closeTab(tabId: string): void {
    const ws = this.currentWorkspace;
    if (!ws) return;
    const index = ws.tabs.findIndex(t => t.id === tabId);
    if (index === -1) return;

    const tab = ws.tabs[index];
    tab.terminals.forEach(t => {
      window.terminalAPI.kill(t.id);
      this.terminals.delete(t.id);
    });
    if (tab.container) tab.container.remove();
    ws.tabs.splice(index, 1);

    if (ws.tabs.length === 0) {
      this.addTab();
    } else if (ws.activeTabId === tabId) {
      this.setActiveTab(ws.tabs[Math.min(index, ws.tabs.length - 1)].id);
    }
    this.renderTabs();
  }

  closeActiveTab(): void { if (this.activeTabId) this.closeTab(this.activeTabId); }

  setActiveTab(tabId: string): void {
    if (this.currentWorkspace) this.currentWorkspace.activeTabId = tabId;
    document.querySelectorAll('.terminal-view').forEach(v => v.classList.remove('active'));
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab) {
      tab.hasActivity = false;
      if (tab.container) {
        tab.container.classList.add('active');
        requestAnimationFrame(() => requestAnimationFrame(() => tab.terminals.forEach(t => t.fitAddon.fit())));
        const active = tab.terminals[tab.activeTerminalIndex];
        if (active) active.terminal.focus();
      }
    }
    this.renderTabs();
  }

  nextTab(): void {
    if (!this.tabs.length) return;
    const index = this.tabs.findIndex(t => t.id === this.activeTabId);
    this.setActiveTab(this.tabs[(index + 1) % this.tabs.length].id);
  }

  prevTab(): void {
    if (!this.tabs.length) return;
    const index = this.tabs.findIndex(t => t.id === this.activeTabId);
    this.setActiveTab(this.tabs[(index - 1 + this.tabs.length) % this.tabs.length].id);
  }

  async splitActivePane(direction: 'horizontal' | 'vertical'): Promise<void> {
    const tab = this.tabs.find(t => t.id === this.activeTabId);
    if (!tab || tab.terminals.length === 0) return;
    const activeTermData = tab.terminals[tab.activeTerminalIndex];
    if (!activeTermData) return;

    const wrapper = activeTermData.wrapper;
    const parent = wrapper.parentElement!;
    wrapper.remove();

    const splitContainer = document.createElement('div');
    splitContainer.className = `split-container ${direction}`;

    const pane1 = document.createElement('div');
    pane1.className = 'split-pane';
    pane1.appendChild(wrapper);

    const divider = document.createElement('div');
    divider.className = `split-divider ${direction}`;

    const pane2 = document.createElement('div');
    pane2.className = 'split-pane';

    splitContainer.appendChild(pane1);
    splitContainer.appendChild(divider);
    splitContainer.appendChild(pane2);
    parent.appendChild(splitContainer);

    this._setupDividerDrag(divider, pane1, pane2, direction, tab);
    setTimeout(() => activeTermData.fitAddon.fit(), 50);

    const wrapper2 = document.createElement('div');
    wrapper2.className = 'terminal-wrapper';
    pane2.appendChild(wrapper2);
    await this._spawnTerminalInWrapper(tab, wrapper2);
  }

  _collapsePane(wrapper: HTMLElement, tab: Tab): void {
    const pane = wrapper.parentElement;
    if (!pane || !pane.classList.contains('split-pane')) return;
    const splitContainer = pane.parentElement;
    if (!splitContainer || !splitContainer.classList.contains('split-container')) return;
    const parent = splitContainer.parentElement!;
    const sibling = [...splitContainer.children].find(c =>
      c !== pane && !c.classList.contains('split-divider')
    );
    if (!sibling) return;
    const toKeep = [...sibling.children];
    splitContainer.remove();
    toKeep.forEach(el => parent.appendChild(el));
    setTimeout(() => tab.terminals.forEach(t => t.fitAddon.fit()), 50);
  }

  _setupDividerDrag(divider: HTMLElement, pane1: HTMLElement, pane2: HTMLElement, direction: string, tab: Tab): void {
    const isHorizontal = direction === 'horizontal';

    divider.addEventListener('mousedown', (e) => {
      e.preventDefault();
      divider.classList.add('dragging');

      const container = pane1.parentElement!;
      const containerRect = container.getBoundingClientRect();
      const startPos = isHorizontal ? e.clientX : e.clientY;
      const startSize1 = isHorizontal ? pane1.offsetWidth : pane1.offsetHeight;
      const totalSize = isHorizontal ? containerRect.width : containerRect.height;
      const dividerSize = isHorizontal ? divider.offsetWidth : divider.offsetHeight;

      const onMove = (me: MouseEvent) => {
        const delta = (isHorizontal ? me.clientX : me.clientY) - startPos;
        const newSize1 = Math.max(100, Math.min(totalSize - dividerSize - 100, startSize1 + delta));
        const newSize2 = totalSize - dividerSize - newSize1;
        pane1.style.flex = 'none'; pane2.style.flex = 'none';
        if (isHorizontal) {
          pane1.style.width = `${newSize1}px`; pane2.style.width = `${newSize2}px`;
        } else {
          pane1.style.height = `${newSize1}px`; pane2.style.height = `${newSize2}px`;
        }
        tab.terminals.forEach(t => t.fitAddon.fit());
      };

      const onUp = () => {
        divider.classList.remove('dragging');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        tab.terminals.forEach(t => t.fitAddon.fit());
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  clearActiveTerminal(): void {
    const tab = this.tabs.find(t => t.id === this.activeTabId);
    if (tab && tab.terminals[tab.activeTerminalIndex]) {
      tab.terminals[tab.activeTerminalIndex].terminal.clear();
    }
  }

  renderTabs(): void {
    const tabbar = document.getElementById('tabbar')!;
    tabbar.innerHTML = '';

    this.tabs.forEach(tab => {
      const tabEl = document.createElement('button');
      tabEl.className = `tab ${tab.id === this.activeTabId ? 'active' : ''}${tab.hasActivity && tab.id !== this.activeTabId ? ' activity' : ''}`;
      tabEl.dataset.tabId = tab.id;

      const iconEl = document.createElement('span');
      iconEl.className = 'tab-icon';
      iconEl.textContent = '⌘';

      const titleEl = document.createElement('span');
      titleEl.className = 'tab-title';
      titleEl.textContent = tab.title;

      if (tab.color) {
        iconEl.style.color = tab.color;
        tabEl.style.borderTop = `3px solid ${tab.color}`;
        tabEl.style.background = `${tab.color}18`;
        tabEl.style.setProperty('--tab-active', tab.color);
      }

      const closeEl = document.createElement('span');
      closeEl.className = 'tab-close';
      closeEl.textContent = '✕';

      tabEl.appendChild(iconEl); tabEl.appendChild(titleEl); tabEl.appendChild(closeEl);

      tabEl.onclick = (e) => {
        if ((e.target as Element).classList.contains('tab-close')) {
          this.closeTab(tab.id);
        } else if (tab.id !== this.activeTabId) {
          this.setActiveTab(tab.id);
        }
      };
      tabEl.oncontextmenu = (e) => {
        e.preventDefault(); e.stopPropagation();
        this.setActiveTab(tab.id);
        this.showContextMenu(e.clientX, e.clientY, [
          { label: 'Rename', action: () => {
            const t = document.querySelector('.tab.active .tab-title');
            if (t) this.startTabRename(tab.id, t);
          }},
          { label: 'Set Color', action: () => this.showTabColorPicker(tab.id) },
          'separator',
          { label: '⊟  Split Horizontally', action: () => this.splitActivePane('horizontal') },
          { label: '⎅  Split Vertically',   action: () => this.splitActivePane('vertical') },
          'separator',
          { label: 'Close Tab', danger: true, action: () => this.closeTab(tab.id) },
        ]);
      };
      tabbar.appendChild(tabEl);
    });

    const newTabBtn = document.createElement('button');
    newTabBtn.className = 'tab-new'; newTabBtn.innerHTML = '+';
    newTabBtn.onclick = () => this.addTab();
    tabbar.appendChild(newTabBtn);

    const splitHBtn = document.createElement('button');
    splitHBtn.className = 'split-btn';
    splitHBtn.title = 'Split Horizontally (Ctrl+D)'; splitHBtn.innerHTML = '⊟';
    splitHBtn.onclick = () => this.splitActivePane('horizontal');
    tabbar.appendChild(splitHBtn);

    const splitVBtn = document.createElement('button');
    splitVBtn.className = 'split-btn';
    splitVBtn.title = 'Split Vertically (Ctrl+Shift+D)'; splitVBtn.innerHTML = '⎅';
    splitVBtn.onclick = () => this.splitActivePane('vertical');
    tabbar.appendChild(splitVBtn);

    const broadcastBtn = document.createElement('button');
    broadcastBtn.className = `broadcast-btn${this.broadcastInput ? ' active' : ''}`;
    broadcastBtn.title = 'Broadcast Input to all panes (Ctrl+Shift+B)\nWhen active, keystrokes go to every split pane';
    broadcastBtn.textContent = '⊕ BC';
    broadcastBtn.onclick = () => this.toggleBroadcast();
    tabbar.appendChild(broadcastBtn);

    const opencodeBtn = document.createElement('button');
    opencodeBtn.className = 'split-btn';
    opencodeBtn.title = 'Open Opencode in a new tab';
    opencodeBtn.textContent = 'Opencode';
    opencodeBtn.onclick = () => this.openSshTab('opencode', 'Opencode');
    tabbar.appendChild(opencodeBtn);

    const claudeBtn = document.createElement('button');
    claudeBtn.className = 'split-btn';
    claudeBtn.title = 'Open Claude in a new tab';
    claudeBtn.textContent = 'Claude';
    claudeBtn.onclick = () => this.openSshTab('claude', 'Claude');
    tabbar.appendChild(claudeBtn);

    const sshBtn = document.createElement('button');
    sshBtn.className = 'ssh-btn'; sshBtn.id = 'sshMenuBtn'; sshBtn.innerHTML = '⌁ SSH';
    sshBtn.title = 'SSH Connections';
    sshBtn.onclick = () => this.toggleSshDropdown(sshBtn);
    tabbar.appendChild(sshBtn);
  }

  // ─── SSH Manager ──────────────────────────────────────────────────────────

  async toggleSshDropdown(btn: HTMLElement): Promise<void> {
    const existing = document.getElementById('sshDropdown');
    if (existing) { existing.remove(); btn.classList.remove('active'); return; }

    btn.classList.add('active');

    const [hosts, groups] = await Promise.all([this.loadSshHosts(), this.loadSshGroups()]);

    const dropdown = document.createElement('div');
    dropdown.className = 'ssh-dropdown'; dropdown.id = 'sshDropdown';

    // Build hosts / groups section
    const assignedAliases = new Set(groups.flatMap(g => g.hostAliases));
    const ungrouped = hosts.filter(h => !assignedAliases.has(h.host));

    let html = `
      <div class="ssh-groups-header">
        <span class="ssh-section-label">SAVED HOSTS</span>
        <button class="ssh-new-group-btn" id="sshNewGroupBtn">+ Group</button>
      </div>`;

    if (hosts.length === 0 && groups.length === 0) {
      html += `<div class="ssh-empty">No hosts in ~/.ssh/config</div>`;
    } else {
      groups.forEach((group, gi) => {
        const gHosts = hosts.filter(h => group.hostAliases.includes(h.host));
        html += `
          <div class="ssh-group">
            <div class="ssh-group-header" data-gi="${gi}">
              <span class="ssh-group-chevron">${group.collapsed ? '▶' : '▼'}</span>
              <span class="ssh-group-name">${this._escHtml(group.name)}</span>
              <span class="ssh-group-count">${gHosts.length}</span>
              <button class="ssh-group-menu-btn" data-gi="${gi}">⋯</button>
            </div>`;
        if (!group.collapsed) {
          if (gHosts.length === 0) {
            html += `<div class="ssh-group-empty">No hosts — right-click a host to assign</div>`;
          } else {
            gHosts.forEach(h => {
              html += `
                <div class="ssh-host-item ssh-group-host" data-alias="${this._escHtml(h.host)}">
                  <div class="ssh-host-info">
                    <div class="ssh-host-name">${this._escHtml(h.host)}</div>
                    <div class="ssh-host-detail">${this._escHtml(this._formatHostDetail(h))}</div>
                  </div>
                  <span class="ssh-host-connect">→</span>
                </div>`;
            });
          }
        }
        html += `</div>`;
      });

      if (ungrouped.length > 0) {
        if (groups.length > 0) html += `<div class="ssh-ungrouped-label">UNGROUPED</div>`;
        ungrouped.forEach(h => {
          html += `
            <div class="ssh-host-item" data-alias="${this._escHtml(h.host)}">
              <div class="ssh-host-info">
                <div class="ssh-host-name">${this._escHtml(h.host)}</div>
                <div class="ssh-host-detail">${this._escHtml(this._formatHostDetail(h))}</div>
              </div>
              <span class="ssh-host-connect">→</span>
            </div>`;
        });
      }
    }

    html += `
      <div class="ssh-dropdown-sep"></div>
      <div class="ssh-form-area">
        <div class="ssh-form-label">Quick Connect</div>
        <div class="ssh-quick-row">
          <input class="ssh-input ssh-input-half" id="sshQuickInput" placeholder="user@hostname">
          <button class="ssh-go-btn" id="sshQuickBtn">Connect</button>
        </div>
      </div>
      <div class="ssh-dropdown-sep"></div>
      <div class="ssh-form-area">
        <div class="ssh-form-label">Add to ~/.ssh/config</div>
        <input class="ssh-input ssh-input-full" id="sshAlias" placeholder="Alias (e.g. myserver)">
        <input class="ssh-input ssh-input-full" id="sshHostname" placeholder="Hostname or IP">
        <div class="ssh-row">
          <input class="ssh-input ssh-input-half" id="sshUser" placeholder="Username">
          <input class="ssh-input ssh-input-half" id="sshPort" placeholder="Port (22)">
        </div>
        <button class="ssh-save-btn" id="sshSaveBtn">Save &amp; Connect</button>
      </div>`;

    dropdown.innerHTML = html;

    // ── Event delegation ──────────────────────────────────────────────────
    dropdown.addEventListener('click', async (e) => {
      const t = e.target as Element;

      // ⋯ group menu button
      const menuBtn = t.closest('.ssh-group-menu-btn') as HTMLElement | null;
      if (menuBtn) {
        e.stopPropagation();
        const gi = parseInt(menuBtn.dataset.gi ?? '-1');
        if (gi >= 0) {
          const rect = menuBtn.getBoundingClientRect();
          this._showGroupContextMenu(gi, groups, dropdown, btn, rect.right, rect.bottom + 2);
        }
        return;
      }

      // Group header → toggle collapse
      const groupHeader = t.closest('.ssh-group-header') as HTMLElement | null;
      if (groupHeader) {
        const gi = parseInt(groupHeader.dataset.gi ?? '-1');
        if (gi >= 0 && gi < groups.length) {
          groups[gi].collapsed = !groups[gi].collapsed;
          await this.saveGroups(groups);
          dropdown.remove(); btn.classList.remove('active');
          this.toggleSshDropdown(btn);
        }
        return;
      }

      // Host item → connect
      const hostItem = t.closest('.ssh-host-item') as HTMLElement | null;
      if (hostItem) {
        const h = hosts.find(h => h.host === hostItem.dataset.alias);
        if (h) { dropdown.remove(); btn.classList.remove('active'); this.connectSshHost(h); }
        return;
      }

      // + New Group
      if (t.closest('#sshNewGroupBtn')) {
        this._showNewGroupInput(dropdown, groups, btn);
        return;
      }

      // Quick connect
      if (t.closest('#sshQuickBtn')) {
        const input = dropdown.querySelector('#sshQuickInput') as HTMLInputElement;
        const val = input.value.trim();
        if (!val) { input.classList.add('error'); setTimeout(() => input?.classList.remove('error'), 1500); return; }
        dropdown.remove(); btn.classList.remove('active');
        this.openSshTab(val.includes(' ') ? val : `ssh ${val}`, val);
        return;
      }

      // Save & connect
      if (t.closest('#sshSaveBtn')) this.saveAndConnectSsh(dropdown, btn);
    });

    // Right-click a host → assign to group
    dropdown.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const hostItem = (e.target as Element).closest('.ssh-host-item') as HTMLElement | null;
      if (!hostItem) return;
      const alias = hostItem.dataset.alias ?? '';
      const h = hosts.find(h => h.host === alias);
      if (!h) return;
      const currentGroup = groups.find(g => g.hostAliases.includes(alias));
      const items: MenuItem[] = [
        { label: 'Connect', action: () => { dropdown.remove(); btn.classList.remove('active'); this.connectSshHost(h); } },
        'separator',
      ];

      // Existing groups the host can move to
      const otherGroups = groups.filter(g => !g.hostAliases.includes(alias));
      otherGroups.forEach(g => {
        items.push({ label: `Add to "${g.name}"`, action: async () => {
          groups.forEach(gr => { gr.hostAliases = gr.hostAliases.filter(a => a !== alias); });
          g.hostAliases.push(alias);
          await this.saveGroups(groups);
          dropdown.remove(); btn.classList.remove('active');
          this.toggleSshDropdown(btn);
        }});
      });

      // Create a new group and immediately add this host to it
      items.push({ label: 'New Group…', action: () => {
        this._showNewGroupInput(dropdown, groups, btn, alias);
      }});

      if (currentGroup) {
        items.push('separator');
        items.push({ label: `Remove from "${currentGroup.name}"`, action: async () => {
          currentGroup.hostAliases = currentGroup.hostAliases.filter(a => a !== alias);
          await this.saveGroups(groups);
          dropdown.remove(); btn.classList.remove('active');
          this.toggleSshDropdown(btn);
        }, danger: true });
      }

      this.showContextMenu(e.clientX, e.clientY, items);
    });

    // Form keyboard shortcuts
    (dropdown.querySelector('#sshQuickInput') as HTMLElement | null)?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') (dropdown.querySelector('#sshQuickBtn') as HTMLElement).click();
      e.stopPropagation();
    });
    ['#sshAlias', '#sshHostname', '#sshUser', '#sshPort'].forEach(sel => {
      (dropdown.querySelector(sel) as HTMLElement | null)?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') (dropdown.querySelector('#sshSaveBtn') as HTMLElement).click();
        e.stopPropagation();
      });
    });

    document.body.appendChild(dropdown);

    const rect = btn.getBoundingClientRect();
    const dw = dropdown.offsetWidth;
    const vw = window.innerWidth;
    dropdown.style.left = Math.max(8, Math.min(rect.right - dw, vw - dw - 8)) + 'px';
    dropdown.style.top = (rect.bottom + 4) + 'px';

    const dismiss = (e: MouseEvent) => {
      if (!dropdown.contains(e.target as Node) && e.target !== btn) {
        dropdown.remove(); btn.classList.remove('active');
        document.removeEventListener('mousedown', dismiss);
      }
    };
    setTimeout(() => document.addEventListener('mousedown', dismiss), 0);
  }

  _formatHostDetail(h: SshHost): string {
    const parts: string[] = [];
    if (h.user) parts.push(h.user + '@');
    parts.push(h.hostname || h.host);
    if (h.port && h.port !== '22') parts.push(':' + h.port);
    return parts.join('');
  }

  _showNewGroupInput(dropdown: HTMLElement, groups: SshGroup[], btn: HTMLElement, initialAlias?: string): void {
    const newGroupBtn = dropdown.querySelector('#sshNewGroupBtn') as HTMLButtonElement | null;
    const input = document.createElement('input');
    input.className = 'ssh-new-group-input';
    input.placeholder = 'Group name…';
    let done = false;
    const submit = async () => {
      if (done) return;
      done = true;
      const name = input.value.trim();
      if (name) {
        const hostAliases = initialAlias ? [initialAlias] : [];
        // Remove alias from any existing group first
        if (initialAlias) groups.forEach(g => { g.hostAliases = g.hostAliases.filter(a => a !== initialAlias); });
        groups.push({ id: String(Date.now()), name, hostAliases, collapsed: false });
        await this.saveGroups(groups);
        dropdown.remove(); btn.classList.remove('active');
        this.toggleSshDropdown(btn);
      } else if (newGroupBtn) {
        input.replaceWith(newGroupBtn);
      } else {
        input.remove();
      }
    };
    input.onblur = submit;
    input.onkeydown = (e) => {
      if (e.key === 'Enter') submit();
      if (e.key === 'Escape') {
        done = true; input.value = '';
        if (newGroupBtn) input.replaceWith(newGroupBtn); else input.remove();
      }
      e.stopPropagation();
    };
    if (newGroupBtn) {
      newGroupBtn.replaceWith(input);
    } else {
      // Called from right-click with no "+ Group" button visible — append after last group
      const hostsSection = dropdown.querySelector('.ssh-groups-header');
      if (hostsSection) hostsSection.after(input);
      else dropdown.appendChild(input);
    }
    requestAnimationFrame(() => input.focus());
  }

  _startGroupRename(gi: number, groups: SshGroup[], dropdown: HTMLElement, btn: HTMLElement): void {
    const group = groups[gi];
    const nameEl = dropdown.querySelector(`.ssh-group-header[data-gi="${gi}"] .ssh-group-name`) as HTMLElement | null;
    if (!nameEl) return;
    const input = document.createElement('input');
    input.value = group.name;
    input.className = 'ssh-new-group-input';
    let done = false;
    const submit = async () => {
      if (done) return;
      done = true;
      const name = input.value.trim();
      if (name) group.name = name;
      await this.saveGroups(groups);
      dropdown.remove(); btn.classList.remove('active');
      this.toggleSshDropdown(btn);
    };
    input.onblur = submit;
    input.onkeydown = (e) => {
      if (e.key === 'Enter') submit();
      if (e.key === 'Escape') { done = true; input.value = group.name; submit(); }
      e.stopPropagation();
    };
    nameEl.replaceWith(input);
    requestAnimationFrame(() => { input.focus(); input.select(); });
  }

  _showGroupContextMenu(gi: number, groups: SshGroup[], dropdown: HTMLElement, btn: HTMLElement, x: number, y: number): void {
    this.showContextMenu(x, y, [
      { label: 'Rename', action: () => this._startGroupRename(gi, groups, dropdown, btn) },
      'separator',
      { label: 'Delete Group', danger: true, action: async () => {
        groups.splice(gi, 1);
        await this.saveGroups(groups);
        dropdown.remove(); btn.classList.remove('active');
        this.toggleSshDropdown(btn);
      }},
    ]);
  }

  _escHtml(str: string): string {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  async loadSshHosts(): Promise<SshHost[]> {
    try {
      const result = await window.terminalAPI.readSshConfig();
      return result.hosts || [];
    } catch { return []; }
  }

  async loadSshGroups(): Promise<SshGroup[]> {
    try {
      const result = await window.terminalAPI.readSshGroups();
      return result.groups || [];
    } catch { return []; }
  }

  async saveGroups(groups: SshGroup[]): Promise<void> {
    try { await window.terminalAPI.writeSshGroups(groups); } catch {}
  }

  connectSshHost(host: SshHost): void {
    this.openSshTab(`ssh ${host.host}`, host.host);
  }

  async saveAndConnectSsh(dropdown: HTMLElement, btn: HTMLElement): Promise<void> {
    const alias = (dropdown.querySelector('#sshAlias') as HTMLInputElement).value.trim();
    const hostname = (dropdown.querySelector('#sshHostname') as HTMLInputElement).value.trim();
    const user = (dropdown.querySelector('#sshUser') as HTMLInputElement).value.trim();
    const port = (dropdown.querySelector('#sshPort') as HTMLInputElement).value.trim() || '22';

    const markError = (sel: string) => {
      const el = dropdown.querySelector(sel) as HTMLInputElement;
      el.classList.add('error'); el.focus();
      setTimeout(() => el?.classList.remove('error'), 1500);
    };

    if (!alias) { markError('#sshAlias'); return; }
    if (!hostname) { markError('#sshHostname'); return; }

    const result = await window.terminalAPI.writeSshConfig({ alias, hostname, user, port });
    if (result.success) {
      dropdown.remove(); btn.classList.remove('active');
      this.openSshTab(`ssh ${alias}`, alias);
    }
  }

  async sendFeedback(): Promise<void> {
    const textarea = document.getElementById('feedbackText') as HTMLTextAreaElement;
    const statusEl = document.getElementById('feedbackStatus')!;
    const sendBtn = document.getElementById('feedbackSendBtn') as HTMLButtonElement;
    const text = textarea.value.trim();
    if (!text) { statusEl.textContent = 'Please write something first.'; return; }

    sendBtn.disabled = true;
    statusEl.textContent = 'Sending...';

    try {
      const ok = await window.terminalAPI.sendFeedback(text);
      if (ok) {
        textarea.value = '';
        statusEl.textContent = 'Sent! Thanks for the feedback.';
      } else {
        statusEl.textContent = 'Failed to send. Try again.';
      }
    } catch {
      statusEl.textContent = 'Network error. Try again.';
    } finally {
      sendBtn.disabled = false;
      setTimeout(() => { statusEl.textContent = ''; }, 4000);
    }
  }

  async openSshTab(cmd: string, title: string): Promise<void> {
    if (!this.currentWorkspace) return;
    const id = String(++this._nextId);
    const tab: Tab = { id, title: title || 'ssh', terminals: [], activeTerminalIndex: 0, container: null };
    this.currentWorkspace.tabs.push(tab);
    await this.createTerminalForTab(tab);
    this.setActiveTab(id);
    this.renderTabs();
    await new Promise(r => setTimeout(r, 120));
    const t = tab.terminals[0];
    if (t) window.terminalAPI.write(t.id, cmd + '\n');
  }

  showCommandPalette(): void {
    const overlay = document.getElementById('commandPalette')!;
    const input = document.getElementById('commandInput') as HTMLInputElement;
    overlay.classList.add('visible');
    input.value = ''; input.focus();
    this.renderCommands('');
    input.oninput = () => this.renderCommands(input.value);
  }

  renderCommands(filter: string): void {
    const list = document.getElementById('commandList')!;
    const filtered = this.commands.filter(c => c.title.toLowerCase().includes(filter.toLowerCase()));
    list.innerHTML = filtered.map(cmd => `
      <div class="command-item" onclick="terminalManager.executeCommand('${cmd.id}')">
        <span class="command-item-title">${cmd.title}</span>
        <span class="command-item-shortcut">${cmd.shortcut}</span>
      </div>
    `).join('');
  }

  executeCommand(id: string): void {
    const cmd = this.commands.find(c => c.id === id);
    if (cmd) { cmd.action(); this.hideOverlays(); }
  }

  showSearch(): void {
    document.getElementById('searchOverlay')!.classList.add('visible');
    const input = document.getElementById('searchInput') as HTMLInputElement;
    input.focus();
    input.oninput = () => this._doSearch(true);
    input.onkeydown = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); e.shiftKey ? this._doSearch(false) : this._doSearch(true); }
      if (e.key === 'Escape') this.hideOverlays();
      e.stopPropagation();
    };
    document.getElementById('caseSensitive')!.onclick = () => {
      document.getElementById('caseSensitive')!.classList.toggle('active');
      this._doSearch(true);
    };
    document.getElementById('useRegex')!.onclick = () => {
      document.getElementById('useRegex')!.classList.toggle('active');
      this._doSearch(true);
    };
  }

  _doSearch(forward: boolean): void {
    const tab = this.tabs.find(t => t.id === this.activeTabId);
    if (!tab) return;
    const termData = tab.terminals[tab.activeTerminalIndex];
    if (!termData) return;
    const term = (document.getElementById('searchInput') as HTMLInputElement).value;
    if (!term) return;
    const opts = {
      caseSensitive: document.getElementById('caseSensitive')!.classList.contains('active'),
      regex: document.getElementById('useRegex')!.classList.contains('active'),
    };
    if (forward) termData.searchAddon.findNext(term, opts);
    else termData.searchAddon.findPrevious(term, opts);
  }

  hideOverlays(): void {
    document.getElementById('commandPalette')!.classList.remove('visible');
    document.getElementById('searchOverlay')!.classList.remove('visible');
    document.getElementById('settingsOverlay')!.classList.remove('visible');
    document.getElementById('pasteHistoryOverlay')!.classList.remove('visible');
    document.getElementById('sshDropdown')?.remove();
    document.getElementById('contextMenu')?.remove();
  }

  showSettings(): void {
    const s = this.settings;
    (document.getElementById('settingsTheme') as HTMLSelectElement).value = s.theme || 'vibe';
    (document.getElementById('settingsTitlebarStyle') as HTMLSelectElement).value = s.titlebarStyle || 'auto';

    const presetSelect = document.getElementById('settingsFontPreset') as HTMLSelectElement;
    const isPreset = FONT_PRESETS.includes(s.fontFamily);
    if (isPreset) {
      presetSelect.value = s.fontFamily;
      (document.getElementById('customFontRow') as HTMLElement).style.display = 'none';
    } else {
      presetSelect.value = 'custom';
      (document.getElementById('settingsCustomFont') as HTMLInputElement).value = s.fontFamily;
      (document.getElementById('customFontRow') as HTMLElement).style.display = 'flex';
    }

    (document.getElementById('settingsFontSize') as HTMLInputElement).value = String(s.fontSize);
    (document.getElementById('settingsCursorStyle') as HTMLSelectElement).value = s.cursorStyle;
    (document.getElementById('settingsCursorBlink') as HTMLInputElement).checked = s.cursorBlink;
    (document.getElementById('settingsScrollback') as HTMLInputElement).value = String(s.scrollback);
    (document.getElementById('settingsShell') as HTMLInputElement).value = s.shell || '';
    document.getElementById('updateStatus')!.textContent = '';

    const opacity = s.opacity ?? 1.0;
    (document.getElementById('settingsOpacity') as HTMLInputElement).value = String(opacity);
    document.getElementById('opacityLabel')!.textContent = Math.round(opacity * 100) + '%';

    const hotkeyEnabled = !!s.hotkeyEnabled;
    (document.getElementById('settingsHotkeyEnabled') as HTMLInputElement).checked = hotkeyEnabled;
    (document.getElementById('settingsHotkey') as HTMLInputElement).value = s.hotkey || 'CommandOrControl+`';
    (document.getElementById('hotkeyRow') as HTMLElement).style.display = hotkeyEnabled ? 'flex' : 'none';
    (document.getElementById('hotkeyHint') as HTMLElement).style.display = hotkeyEnabled ? 'block' : 'none';

    window.terminalAPI.getAppVersion().then(v => {
      document.getElementById('aboutVersion')!.textContent = `v${v}`;
    });

    document.getElementById('settingsOverlay')!.classList.add('visible');
  }

  onFontPresetChange(): void {
    const val = (document.getElementById('settingsFontPreset') as HTMLSelectElement).value;
    (document.getElementById('customFontRow') as HTMLElement).style.display = val === 'custom' ? 'flex' : 'none';
  }

  async saveSettings(): Promise<void> {
    const presetVal = (document.getElementById('settingsFontPreset') as HTMLSelectElement).value;
    const fontFamily = presetVal === 'custom'
      ? (document.getElementById('settingsCustomFont') as HTMLInputElement).value.trim()
      : presetVal;

    const opacity = parseFloat((document.getElementById('settingsOpacity') as HTMLInputElement).value) || 1.0;
    const hotkeyEnabled = (document.getElementById('settingsHotkeyEnabled') as HTMLInputElement).checked;
    const hotkey = (document.getElementById('settingsHotkey') as HTMLInputElement).value.trim() || 'CommandOrControl+`';

    const newSettings: Settings = {
      fontFamily: fontFamily || DEFAULT_SETTINGS.fontFamily,
      fontSize: parseInt((document.getElementById('settingsFontSize') as HTMLInputElement).value, 10) || 13,
      cursorStyle: (document.getElementById('settingsCursorStyle') as HTMLSelectElement).value,
      cursorBlink: (document.getElementById('settingsCursorBlink') as HTMLInputElement).checked,
      scrollback: parseInt((document.getElementById('settingsScrollback') as HTMLInputElement).value, 10) || 10000,
      shell: (document.getElementById('settingsShell') as HTMLInputElement).value.trim(),
      theme: (document.getElementById('settingsTheme') as HTMLSelectElement).value,
      titlebarStyle: (document.getElementById('settingsTitlebarStyle') as HTMLSelectElement).value,
      opacity,
      hotkeyEnabled,
      hotkey,
    };

    const result = await window.terminalAPI.saveSettings(newSettings);
    if (result.success) {
      this.settings = newSettings;
      this.applySettingsToAllTerminals();
      window.terminalAPI.setHotkey({ enabled: hotkeyEnabled, hotkey });
      this.hideSettings();
    }
  }

  hideSettings(): void {
    const key = this.settings.theme || 'vibe';
    const op = this.settings.opacity ?? 1.0;
    this.applyTheme(key, op);
    const xtermTheme = this.getXtermTheme(key, op);
    this.terminals.forEach(({ terminal, fitAddon }) => {
      this._applyXtermTheme(terminal, xtermTheme, fitAddon);
    });
    document.getElementById('settingsOverlay')!.classList.remove('visible');
  }

  applySettingsToAllTerminals(): void {
    const s = this.settings;
    const op = s.opacity ?? 1.0;
    this.applyTheme(s.theme || 'vibe', op);
    this.renderTitlebar();
    const xtermTheme = this.getXtermTheme(s.theme || 'vibe', op);
    this.terminals.forEach(({ terminal, fitAddon }) => {
      terminal.options.fontFamily = s.fontFamily;
      terminal.options.fontSize = s.fontSize;
      terminal.options.cursorStyle = s.cursorStyle as 'block' | 'underline' | 'bar';
      this._applyXtermTheme(terminal, xtermTheme, fitAddon);
      terminal.options.cursorBlink = s.cursorBlink;
      this._repaintTerminal(terminal, fitAddon);
    });
  }

  _repaintTerminal(terminal: Terminal, fitAddon: FitAddon | null): void {
    const { cols, rows } = terminal;
    terminal.resize(Math.max(cols - 1, 1), rows);
    if (fitAddon) fitAddon.fit();
  }

  _applyXtermTheme(terminal: Terminal, xtermTheme: ITheme, fitAddon: FitAddon | null): void {
    terminal.options.theme = xtermTheme;
    // Force xterm canvas to repaint by triggering a resize cycle
    const { cols, rows } = terminal;
    terminal.resize(Math.max(cols - 1, 1), rows);
    if (fitAddon) fitAddon.fit();
    else terminal.resize(cols, rows);
  }

  getXtermTheme(key?: string, opacity?: number): ITheme {
    const themeKey = key || (this.settings.theme || 'vibe');
    const base = (THEMES[themeKey] || THEMES.vibe).terminal;
    const op = opacity ?? (this.settings.opacity ?? 1.0);
    if (op >= 1) return base;
    return { ...base, background: this._withOpacity(base.background ?? '#000000', op) };
  }

  _hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null;
  }

  _withOpacity(hex: string, opacity: number): string {
    if (opacity >= 1) return hex;
    const rgb = this._hexToRgb(hex);
    return rgb ? `rgba(${rgb.r},${rgb.g},${rgb.b},${opacity})` : hex;
  }

  applyTheme(key: string, opacity: number): void {
    const theme = THEMES[key] || THEMES.vibe;
    const op = opacity ?? (this.settings.opacity ?? 1.0);
    const root = document.documentElement;
    Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v));
    ['--bg', '--bg-secondary'].forEach(k => {
      const hex = theme.vars[k];
      if (hex && hex.startsWith('#')) root.style.setProperty(k, this._withOpacity(hex, op));
    });
  }

  onThemePreviewChange(): void {
    const key = (document.getElementById('settingsTheme') as HTMLSelectElement).value;
    const op = parseFloat((document.getElementById('settingsOpacity') as HTMLInputElement).value) || 1.0;
    this.applyTheme(key, op);
    const xtermTheme = this.getXtermTheme(key, op);
    this.terminals.forEach(({ terminal, fitAddon }) => {
      this._applyXtermTheme(terminal, xtermTheme, fitAddon);
    });
  }

  // ─── Titlebar rendering ───────────────────────────────────────────────────

  renderTitlebar(): void {
    const style = this.settings.titlebarStyle || 'auto';
    const isWin = style === 'windows' || (style === 'auto' && this.platform === 'win32');
    const isLinux = style === 'linux' || (style === 'auto' && this.platform === 'linux');
    const titlebar = document.getElementById('titlebar')!;

    const settingsIconSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
    </svg>`;

    if (isWin) {
      titlebar.className = 'titlebar titlebar-win';
      titlebar.innerHTML = `
        <div class="titlebar-app-name">VibeTerminal</div>
        <div class="titlebar-win-right">
          <button class="settings-trigger" id="settingsBtn" title="Settings (Ctrl+,)">${settingsIconSvg}</button>
          <button class="titlebar-btn win minimize" id="tbMin" title="Minimize">&#8211;</button>
          <button class="titlebar-btn win maximize" id="tbMax" title="Maximize">&#9633;</button>
          <button class="titlebar-btn win close" id="tbClose" title="Close">&#10005;</button>
        </div>`;
    } else if (isLinux) {
      titlebar.className = 'titlebar titlebar-linux';
      titlebar.innerHTML = `
        <div class="titlebar-app-name">VibeTerminal</div>
        <div class="titlebar-linux-right">
          <button class="settings-trigger" id="settingsBtn" title="Settings (Ctrl+,)">${settingsIconSvg}</button>
          <button class="titlebar-btn lnx minimize" id="tbMin" title="Minimize">&#8211;</button>
          <button class="titlebar-btn lnx maximize" id="tbMax" title="Maximize">&#9633;</button>
          <button class="titlebar-btn lnx close" id="tbClose" title="Close">&#10005;</button>
        </div>`;
    } else {
      titlebar.className = 'titlebar';
      titlebar.innerHTML = `
        <div class="titlebar-buttons">
          <button class="titlebar-btn close" id="tbClose"></button>
          <button class="titlebar-btn minimize" id="tbMin"></button>
          <button class="titlebar-btn maximize" id="tbMax"></button>
        </div>
        <div class="titlebar-title">VibeTerminal</div>
        <div class="titlebar-right">
          <button class="settings-trigger" id="settingsBtn" title="Settings (⌘,)">${settingsIconSvg}</button>
        </div>`;
    }

    document.getElementById('settingsBtn')!.onclick = () => this.showSettings();
    document.getElementById('tbMin')!.onclick = () => window.terminalAPI.minimize();
    document.getElementById('tbMax')!.onclick = () => window.terminalAPI.maximize();
    document.getElementById('tbClose')!.onclick = () => window.terminalAPI.close();
  }

  checkForUpdates(): void {
    document.getElementById('updateStatus')!.textContent = 'Checking...';
    window.terminalAPI.checkForUpdates();
  }

  installUpdate(): void { window.terminalAPI.installUpdate(); }

  openGitHub(): void { window.terminalAPI.openExternal('https://github.com/NamelessKing6969/App'); }

  hasSelection(): boolean { return (window.getSelection()?.toString().length ?? 0) > 0; }

  // ─── Utility helpers ──────────────────────────────────────────────────────

  _findTabForTerminalId(id: number): Tab | null {
    for (const ws of this.workspaces) {
      for (const tab of ws.tabs) {
        if (tab.terminals.some(t => t.id === id)) return tab;
      }
    }
    return null;
  }

  _pasteToActive(text: string): void {
    if (this.broadcastInput) {
      const tab = this.tabs.find(t => t.id === this.activeTabId);
      if (tab) { tab.terminals.forEach(t => t.terminal.paste(text)); return; }
    }
    const tab = this.tabs.find(t => t.id === this.activeTabId);
    if (tab) {
      const termData = tab.terminals[tab.activeTerminalIndex];
      if (termData) termData.terminal.paste(text);
    }
  }

  _showToast(message: string): void {
    document.getElementById('toast')?.remove();
    const toast = document.createElement('div');
    toast.id = 'toast'; toast.className = 'toast'; toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => {
      toast.classList.add('visible');
      setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 300);
      }, 2000);
    });
  }

  // ─── Broadcast Input ──────────────────────────────────────────────────────

  toggleBroadcast(): void {
    this.broadcastInput = !this.broadcastInput;
    this.renderTabs();
    this._showToast(this.broadcastInput ? '⊕ Broadcast Input ON — typing goes to all panes' : 'Broadcast Input OFF');
  }

  // ─── Paste History ────────────────────────────────────────────────────────

  addToPasteHistory(text: string): void {
    if (!text || !text.trim()) return;
    this.pasteHistory = this.pasteHistory.filter(h => h !== text);
    this.pasteHistory.unshift(text);
    if (this.pasteHistory.length > 50) this.pasteHistory.pop();
  }

  showPasteHistory(): void {
    const list = document.getElementById('pasteHistoryList')!;
    if (this.pasteHistory.length === 0) {
      list.innerHTML = '<div class="paste-history-empty">No paste history yet.<br>Copy or paste something first.</div>';
    } else {
      list.innerHTML = this.pasteHistory.map((item, i) => {
        const preview = item.replace(/\t/g, '→').replace(/\n/g, '↵').substring(0, 300);
        return `<div class="paste-history-item" onclick="terminalManager.pasteFromHistory(${i})">${this._escHtml(preview)}</div>`;
      }).join('');
    }
    document.getElementById('pasteHistoryOverlay')!.classList.add('visible');
  }

  pasteFromHistory(index: number): void {
    const text = this.pasteHistory[index];
    if (!text) return;
    this.addToPasteHistory(text);
    this._pasteToActive(text);
    document.getElementById('pasteHistoryOverlay')!.classList.remove('visible');
  }

  clearPasteHistory(): void {
    this.pasteHistory = [];
    this.showPasteHistory();
  }

  // ─── Tab Colors ───────────────────────────────────────────────────────────

  showTabColorPicker(tabId: string): void {
    document.getElementById('contextMenu')?.remove();
    const existing = document.getElementById('colorPickerPopup');
    if (existing) { existing.remove(); return; }

    const tab = this.tabs.find(t => t.id === tabId);
    if (!tab) return;

    const picker = document.createElement('div');
    picker.className = 'color-picker-popup'; picker.id = 'colorPickerPopup';

    TAB_COLORS.forEach(color => {
      const swatch = document.createElement('div');
      swatch.className = `color-swatch${color === null ? ' no-color' : ''}`;
      if (color) swatch.style.background = color;
      if (color === null) swatch.textContent = '✕';
      swatch.title = color ?? 'Default';
      swatch.onclick = () => { tab.color = color; picker.remove(); this.renderTabs(); };
      picker.appendChild(swatch);
    });

    document.body.appendChild(picker);

    const liveTabEl = document.querySelector(`.tab[data-tab-id="${tabId}"]`);
    const rect = liveTabEl ? liveTabEl.getBoundingClientRect() : { bottom: 80, left: 8 };
    picker.style.top = (rect.bottom + 4) + 'px';
    const pw = picker.offsetWidth;
    picker.style.left = Math.min(rect.left, window.innerWidth - pw - 8) + 'px';

    const dismiss = (e: MouseEvent) => {
      if (!picker.contains(e.target as Node)) {
        picker.remove();
        document.removeEventListener('mousedown', dismiss);
      }
    };
    setTimeout(() => document.addEventListener('mousedown', dismiss), 0);
  }

  // ─── Settings helpers ─────────────────────────────────────────────────────

  onOpacityPreview(value: string): void {
    const op = parseFloat(value);
    document.getElementById('opacityLabel')!.textContent = Math.round(op * 100) + '%';
    const key = (document.getElementById('settingsTheme') as HTMLSelectElement).value || this.settings.theme || 'vibe';
    this.applyTheme(key, op);
    const xtermTheme = this.getXtermTheme(key, op);
    this.terminals.forEach(({ terminal, fitAddon }) => this._applyXtermTheme(terminal, xtermTheme, fitAddon));
  }

  onHotkeyEnabledChange(): void {
    const enabled = (document.getElementById('settingsHotkeyEnabled') as HTMLInputElement).checked;
    (document.getElementById('hotkeyRow') as HTMLElement).style.display = enabled ? 'flex' : 'none';
    (document.getElementById('hotkeyHint') as HTMLElement).style.display = enabled ? 'block' : 'none';
  }
}

// Expose globally so inline onclick handlers in dynamic HTML can reach it
window.terminalManager = new TerminalManager();
