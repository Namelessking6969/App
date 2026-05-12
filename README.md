# VibeTerminal

A beautiful, feature-rich terminal emulator built with Electron, xterm.js, and node-pty. Designed for developers and power users who want a visually stunning terminal experience without sacrificing speed or flexibility.

**Platform:** macOS · Windows · Linux  
**License:** MIT

---

## Features

### Workspaces & Tabs
- **Multiple workspaces** — organize your terminal sessions into named workspaces, visible in the workspace bar at the top
- **Unlimited tabs** per workspace — open as many terminal sessions as you need side by side
- **Tab colors** — right-click any tab and pick from 8 colors; colored tabs show a tinted background and a colored top border for instant visual identification
- **Tab activity indicator** — background tabs pulse with a glowing dot when they receive new output, so you never miss a finished build or command
- **Rename tabs and workspaces** — double-click or right-click to rename inline
- **Right-click context menus** on both tabs and workspace items for quick actions
- **Undock workspaces** — pop any workspace out into its own window with the ↗ button or via right-click
- **Close workspaces** — cleanly terminates all PTY processes associated with the workspace

### Split Panes
- **Horizontal splits** — `Ctrl/Cmd+D`
- **Vertical splits** — `Ctrl/Cmd+Shift+D`
- Multiple terminals inside a single tab for side-by-side workflows
- **Broadcast Input** — press `Ctrl/Cmd+Shift+B` or click the `⊕ BC` button in the tab bar to type in all split panes simultaneously; useful for running the same command across multiple servers or environments at once

### Paste History
Press `Ctrl/Cmd+Shift+H` to open the Paste History panel — a scrollable list of the last 50 things you copied or pasted. Click any entry to instantly paste it into the active terminal. History is deduplicated (re-pasting moves an item to the top) and can be cleared in one click.

### Hotkey Window
Enable a global keyboard shortcut in **Settings → Hotkey Window** to summon and dismiss VibeTerminal from any application — no need to switch windows manually. The shortcut and default (`CommandOrControl+\``) are fully configurable.

### Themes
Five built-in themes, switchable live from Settings with instant preview:

| Theme | Accent Color | Style |
|---|---|---|
| **Vibe** (default) | Neon Green `#00FF88` | Dark, glowing, cyberpunk |
| **Dracula** | Purple `#BD93F9` | Classic dark purple |
| **Nord** | Ice Blue `#88C0D0` | Arctic, muted |
| **Monokai** | Lime Green `#A6E22E` | Warm dark |
| **Catppuccin Mocha** | Lavender `#CBA6F7` | Pastel dark |

Each theme fully styles the titlebar, tab bar, workspace bar, status bar, and the xterm.js terminal canvas.

### Window Opacity
Adjust the terminal background transparency from 20% to 100% via **Settings → Appearance → Opacity**. The slider updates live so you can find the right balance before saving. Opacity is applied via CSS rgba, meaning text stays fully crisp while the background lets content show through.

### Neon Cursor Glow
The cursor renders with a CSS `box-shadow` glow matching the active theme accent color. Three cursor shapes available: **block**, **bar**, and **underline** — all with optional blink.

### Fonts
Choose from a curated list of popular Nerd Fonts or enter any custom font string:

- MesloLGS NF (default)
- JetBrainsMono Nerd Font
- FiraCode Nerd Font
- Hack Nerd Font
- CaskaydiaCove Nerd Font
- Iosevka Nerd Font
- UbuntuMono Nerd Font
- Custom (any font family string)

Font size is adjustable from 8–32px.

### Command Palette
Press `Ctrl/Cmd+Shift+P` to open a fuzzy-searchable command palette. Every action in the app is accessible here with its keyboard shortcut displayed inline.

Available commands:
- New Tab / Close Tab
- Split Horizontally / Vertically
- Next Tab / Previous Tab
- New Workspace / Next Workspace / Previous Workspace
- Clear Terminal
- Search
- Paste History
- Toggle Broadcast Input
- Settings

### Terminal Search
Press `Ctrl/Cmd+F` to open the search overlay, anchored above the status bar:
- **Case-sensitive** toggle (`Aa` button)
- **Regex** toggle (`.*` button)
- Navigate between matches with Enter / Shift+Enter
- Powered by xterm.js `SearchAddon`

### Status Bar
A slim bar at the bottom of the window shows:
- Current working directory (left side)
- Active shell name and a green status indicator (right side)
- Terminal dimensions in columns × rows (right side), updated live on resize

### Clickable Links
URLs and file paths in the terminal output are auto-detected and made clickable via xterm.js `WebLinksAddon`.

### Copy / Paste
- **Copy:** `Ctrl+Shift+C` (or `Cmd+Shift+C` on macOS) — copies the current selection
- **Paste:** `Ctrl+Shift+V` / `Ctrl+V` / `Cmd+V` — pastes from clipboard; automatically recorded in Paste History
- **Right-click:** copies selection if text is selected; pastes from clipboard if nothing is selected

### SSH Manager
Click the **⌁ SSH** button in the tab bar to open the SSH panel:
- **Saved hosts** — reads `~/.ssh/config` and lists all configured hosts; click to connect in a new tab
- **Quick connect** — type `user@hostname` and hit Connect for one-off sessions
- **Save & Connect** — fill in alias, hostname, user, and port to append a new entry to `~/.ssh/config` and connect immediately

### Cross-Platform Titlebar
The titlebar adapts to the OS automatically, or can be forced to a specific style in Settings:
- **macOS style** — traffic-light buttons (close/minimize/maximize) on the left, title centered
- **Windows style** — app name on the left, minimize/maximize/close buttons on the right (Windows hover styles)
- **Linux style** — circular icon buttons on the right

### Auto-Updater
VibeTerminal checks for updates on launch (packaged builds only) and shows an unobtrusive banner when an update is available or downloaded. Update, restart, and install in one click. You can also trigger a manual check from **Settings → Check for Updates**.

### Settings Panel
Open with `Ctrl/Cmd+,` or via the gear icon in the titlebar. Settings persist to disk across launches.

| Setting | Options |
|---|---|
| Theme | Vibe, Dracula, Nord, Monokai, Catppuccin Mocha |
| Titlebar Style | Auto, macOS, Windows, Linux |
| Font Family | 7 Nerd Font presets or custom |
| Font Size | 8–32px |
| Cursor Style | Block, Bar, Underline |
| Cursor Blink | On / Off |
| Scrollback | 100–100,000 lines (default 10,000) |
| Opacity | 20%–100% background transparency |
| Shell Path | Any shell binary (empty = system default) |
| Hotkey Window | Global shortcut to show/hide the window from any app |

---

## Keyboard Shortcuts

| Action | macOS | Windows / Linux |
|---|---|---|
| New Tab | `⌘T` | `Ctrl+T` |
| Close Tab | `⌘W` | `Ctrl+W` |
| New Window | `⌘N` | `Ctrl+N` |
| Next Tab | `⌘⇧]` | `Ctrl+Shift+]` |
| Previous Tab | `⌘⇧[` | `Ctrl+Shift+[` |
| Split Horizontally | `⌘D` | `Ctrl+D` |
| Split Vertically | `⌘⇧D` | `Ctrl+Shift+D` |
| Toggle Broadcast Input | `⌘⇧B` | `Ctrl+Shift+B` |
| Paste History | `⌘⇧H` | `Ctrl+Shift+H` |
| New Workspace | `⌘⇧N` | `Ctrl+Shift+N` |
| Next Workspace | `⌘⇧.` | `Ctrl+Shift+.` |
| Previous Workspace | `⌘⇧,` | `Ctrl+Shift+,` |
| Clear Terminal | `⌘K` | `Ctrl+K` |
| Search | `⌘F` | `Ctrl+F` |
| Command Palette | `⌘⇧P` | `Ctrl+Shift+P` |
| Settings | `⌘,` | `Ctrl+,` |
| Copy | `⌘⇧C` | `Ctrl+Shift+C` |
| Paste | `⌘V` | `Ctrl+V` / `Ctrl+Shift+V` |

---

## Tech Stack

| Component | Library |
|---|---|
| App framework | [Electron](https://www.electronjs.org/) v28 |
| Terminal emulation | [xterm.js](https://xtermjs.org/) v5 |
| PTY / shell process | [node-pty](https://github.com/microsoft/node-pty) |
| Terminal fit | xterm-addon-fit |
| Search | xterm-addon-search |
| Clickable links | xterm-addon-web-links |
| Auto-updater | electron-updater |
| Logging | electron-log |

---

## Build & Install

### Prerequisites
- Node.js 18+
- npm

### Install dependencies
```bash
npm install
```

### Run in development
```bash
npm run dev
```

### Build distributables
```bash
# All platforms
npm run build

# Platform-specific
npm run build:mac
npm run build:win
npm run build:linux
```

Outputs land in the `dist/` directory.

### Bump version

The script at `scripts/bump-version.sh` automatically updates all 4 version files.

```bash
# Bump patch (1.0.0 → 1.0.1)
./scripts/bump-version.sh patch

# Bump minor (1.0.0 → 1.1.0)
./scripts/bump-version.sh minor

# Bump major (1.0.0 → 2.0.0)
./scripts/bump-version.sh major
```

Or via npm scripts:

```bash
npm run version:bump        # patch
npm run version:bump:minor  # minor
npm run version:bump:major  # major
```

| File | Field(s) Updated |
|------|-----------------|
| `package.json` | `version` |
| `Resources/Info.plist` | `CFBundleShortVersionString`, `CFBundleVersion` (auto-incremented build number) |
| `project.yml` | `CFBundleShortVersionString`, `CFBundleVersion` |
| `scripts/create-pkg.sh` | `PRODUCT_VERSION` |

**Release checklist:**

- [ ] Run `./scripts/bump-version.sh [major|minor|patch]`
- [ ] Verify all 4 files were updated correctly
- [ ] Update `CHANGELOG.md` with changes since last release
- [ ] Verify all new dependencies are committed (`package-lock.json`)
- [ ] Build and smoke-test: `npm run build`
- [ ] Confirm app icon / assets are up to date if visual changes were made

**Tagging & push:**

```bash
# 1. Bump versions (script handles all files)
./scripts/bump-version.sh patch   # or minor / major

# 2. Commit version bump
git add package.json Resources/Info.plist project.yml scripts/create-pkg.sh
git commit -m "Bump version to X.Y.Z"

# 3. Create annotated tag
git tag -a vX.Y.Z -m "Version X.Y.Z"

# 4. Push commits and tag
git push origin main
git push origin vX.Y.Z
```

**Verify tag contents:**

```bash
git show vX.Y.Z:package.json | grep '"version"'
git show vX.Y.Z:Resources/Info.plist | grep -A1 'CFBundleShortVersionString'
git show vX.Y.Z:project.yml | grep 'CFBundleShortVersionString'
git show vX.Y.Z:scripts/create-pkg.sh | grep 'PRODUCT_VERSION'
```

---

## Distribution Targets

| Platform | Format |
|---|---|
| macOS | `.dmg` and `.zip` (Intel x64 + Apple Silicon arm64) |
| Windows | `.exe` NSIS installer (x64) |
| Linux | `.deb` (x64) |

Releases are published to GitHub Releases automatically via `electron-updater` / `electron-builder`.

---

## Project Structure

```
App/
├── src/
│   ├── main/
│   │   └── main.js          # Electron main process, PTY management, IPC, auto-updater
│   ├── preload/
│   │   └── preload.js       # Context bridge — exposes safe IPC to renderer
│   └── renderer/
│       ├── index.html       # Entire UI: tabs, workspaces, settings, search, command palette
│       ├── xterm.js         # xterm.js bundle
│       ├── xterm.css        # xterm.js styles
│       ├── xterm-addon-fit.js
│       ├── xterm-addon-search.js
│       └── xterm-addon-web-links.js
├── scripts/
│   ├── build.sh
│   ├── bump-version.sh
│   ├── create-dmg.sh
│   └── create-pkg.sh
├── package.json
└── SPEC.md
```
