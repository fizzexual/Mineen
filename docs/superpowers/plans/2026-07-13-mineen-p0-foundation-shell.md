# MineEN P0 — Foundation & Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the ZeroCloud-branded vanilla frontend with a new, compiled Svelte + Vite **MineEN** shell — premium dark design system, command palette, real-time data layer — with the server-management + console + dashboard core loop at full parity, served by the existing untouched backend.

**Architecture:** Keep the current Node/Express + `ws` backend and its REST/WebSocket contract exactly as-is. Add a Vite-built Svelte single-page app in `web/`, compiled to `web/dist`, which Express serves. All live data (server list, console, telemetry, players, install progress) flows through one auto-reconnecting WebSocket into Svelte stores; actions use the existing REST endpoints. This plan delivers the toolchain, the design system, the app shell, and two full real-time verticals (Console, Dashboard) plus server create/select/power/EULA. Remaining CRUD views (Files, Properties, Players, Backups, Schedules) are a follow-on plan (P0.2).

**Tech Stack:** Node 20+ (ESM), Express, `ws` (backend, unchanged) · Svelte 5 (runes) + Vite 5 (frontend) · Vitest + jsdom + @testing-library/svelte (tests).

## Global Constraints

- **Backend contract is frozen in P0.** Do not change any REST route or WebSocket message shape in `server.js`/`src/*`. The frontend consumes the existing contract verbatim. The only backend edits allowed: serving `web/dist` + SPA fallback (Task 2) and an additive read-only `/api/panel` endpoint (Task 2).
- **Runtime:** Node 20+. Project is ESM (`"type": "module"` in `package.json`).
- **One-command run preserved.** End users run `npm install && npm run build && npm start`. The Vite dev server is a developer convenience only; production serving is Express → `web/dist`.
- **No Docker. Cross-platform, Windows-first.** No POSIX-only shell steps in runtime code.
- **Branding:** the product is **MineEN**. Remove every occurrence of "ZeroCloud", "zerocloud", "Bakhraya Eyek", "Cari Disini", and all Indonesian placeholder copy. No placeholder names or lorem copy ship.
- **Panel port** default `9999`, override via `PORT` env (matches `src/config.js`).
- **Design language:** premium dark — near-black layered surfaces, one "healthy" accent (emerald), terminal-flavored monospace for console/code, all colors via CSS custom properties with a `:root[data-theme]` hook; light theme is secondary but must not break.
- **Keep it light.** Svelte compiles away; no runtime UI framework, no component library, no CSS framework. Hand-authored CSS via tokens.
- **Tests colocate** as `<name>.test.js` beside the unit under test. `npm test` runs `vitest run`.

### Backend contract reference (consumed, not modified)

WebSocket at `/ws`. **Server → client** messages:
- `{ type:'servers', servers:[{ id, name, type, version, versionLabel, state, installed, playerCount, dir }] }`
- `{ type:'history', serverId, lines:[string], telemetry:{ cpu:[number], mem:[number] } }` (sent after a `select`)
- `{ type:'log', serverId, line:string }`
- `{ type:'players', serverId, players:[string], playerCount:number }`
- `{ type:'state', serverId, state:StateObj }`
- `{ type:'stats', serverId, cpu, memUsedMB, memMaxMB, storageMB, tps, latency, players, playerCount, maxPlayers, uptimeMs }`
- `{ type:'install', serverId, phase:'downloading'|'done'|'error', percent?, message? }`

**Client → server:** `{ type:'select', serverId }`.

`StateObj` (from `/api/servers/:id/state` and `state` messages) includes: `state` (`offline`|`starting`|`online`|`stopping`), `installed`, `eulaAccepted`, `playerCount`, `players`, `startedAt`, `pid`, `tps`, `name`, `type`, `version`, `versionLabel`, `dir`, `memoryMB`, `minMemoryMB`, `maxPlayers`, `motd`, `serverPort`, `address`, `lanAddress`, `uptimeMs`.

Relevant **REST** (all JSON, envelope `{ ok:true, ... }` or `{ ok:false, error }`):
- `GET /api/servers` → `{ servers:[...] }`
- `POST /api/servers` body `{ mode:'download', name, version }` or `{ mode:'existing', name, path }` → `{ id }`
- `DELETE /api/servers/:id?deleteFiles=true|false`
- `POST /api/pick-folder` → `{ path, cancelled?, isServer?, jar? }`
- `GET /api/browse?path=` → `{ path, parent, drives?, dirs, isServer, jar }`
- `GET /api/versions` → `{ versions:[string] }`
- `GET /api/servers/:id/state` → `{ state:StateObj }`
- `GET /api/servers/:id/logs` → `{ lines:[string] }`
- `POST /api/servers/:id/power` body `{ action:'start'|'stop'|'restart'|'kill' }`
- `POST /api/servers/:id/command` body `{ command }`
- `POST /api/servers/:id/eula` body `{ accept:true }`

---

## File Structure

**Create (frontend source, `web/`):**
- `web/index.html` — SPA entry document
- `web/src/main.js` — mounts `App.svelte`
- `web/src/app.css` — design tokens + base/reset
- `web/src/lib/format.js` — `fmtBytes`, `fmtUptime`, `fmtTime`, `esc` (pure)
- `web/src/lib/console.js` — `parseLine`, `classify` (pure log parsing)
- `web/src/lib/palette.js` — `fuzzyScore`, `filterCommands` (pure command-palette matching)
- `web/src/lib/api.js` — REST client (`get`/`post`/`del`)
- `web/src/lib/ws.js` — `createSocket` auto-reconnecting WebSocket
- `web/src/stores/servers.js` — `servers` list store + `reduceServers`
- `web/src/stores/active.js` — `activeId`, `activeState` stores + selectors
- `web/src/stores/telemetry.js` — `telemetry` ring-buffer store + `pushStats`
- `web/src/stores/consoleLog.js` — `logLines` store (append, cap)
- `web/src/stores/toast.js` — `toasts` store + `toast()`
- `web/src/stores/palette.js` — palette open state + command registry
- `web/src/components/Sidebar.svelte`
- `web/src/components/Topbar.svelte`
- `web/src/components/PowerControls.svelte`
- `web/src/components/ServerSwitcher.svelte`
- `web/src/components/CommandPalette.svelte`
- `web/src/components/Toast.svelte`
- `web/src/components/Sparkline.svelte`
- `web/src/components/Modal.svelte` — reusable overlay shell
- `web/src/components/AddServerModal.svelte`
- `web/src/components/EulaModal.svelte`
- `web/src/views/EmptyState.svelte`
- `web/src/views/Console.svelte`
- `web/src/views/Dashboard.svelte`
- `web/src/App.svelte` — layout, view routing, store wiring

**Create (tests):** colocated `format.test.js`, `console.test.js`, `palette.test.js`, `servers.test.js`, `telemetry.test.js`, plus `App.test.js` smoke.

**Create (root):**
- `vite.config.js` — Vite + Svelte + Vitest config
- `.gitignore` — add `node_modules`, `web/dist`

**Modify:**
- `package.json` — devDeps + scripts
- `src/config.js` — add `WEB_DIST` export
- `server.js:26` — serve `web/dist` + SPA fallback; add `GET /api/panel`

**Delete (old frontend, after new shell serves):**
- `public/index.html`, `public/css/styles.css`, `public/js/*.js`, and the `public/` dir

---

## Task 1: Frontend toolchain (Vite + Svelte + Vitest)

**Files:**
- Modify: `package.json`
- Create: `vite.config.js`, `.gitignore`, `web/index.html`, `web/src/main.js`, `web/src/App.svelte`, `web/src/app.css`

**Interfaces:**
- Produces: an `npm run build` that emits `web/dist/index.html` + assets; `npm run dev:web` Vite dev server on `5173` proxying `/api` + `/ws` to `9999`; `npm test` running Vitest.

- [ ] **Step 1: Add dependencies and scripts to `package.json`**

Merge these into the existing `package.json` (keep existing `dependencies` and `"type":"module"`):

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js",
    "dev:web": "vite",
    "build": "vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@sveltejs/vite-plugin-svelte": "^5.0.3",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/svelte": "^5.2.6",
    "svelte": "^5.19.0",
    "jsdom": "^26.0.0",
    "vite": "^6.0.7",
    "vitest": "^3.0.2"
  }
}
```

- [ ] **Step 2: Install**

Run: `npm install`
Expected: dependencies resolve, `node_modules` populated, no error exit.

- [ ] **Step 3: Create `vite.config.js`**

```js
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  root: 'web',
  plugins: [svelte()],
  build: {
    outDir: '../web/dist',
    emptyOutDir: true
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:9999',
      '/ws': { target: 'ws://localhost:9999', ws: true }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./web/src/test-setup.js'],
    include: ['src/**/*.test.js']
  }
});
```

- [ ] **Step 4: Create `web/src/test-setup.js`**

```js
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 5: Create `.gitignore`** (append if it exists)

```gitignore
node_modules/
web/dist/
```

- [ ] **Step 6: Create `web/index.html`**

```html
<!doctype html>
<html lang="en" data-theme="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MineEN</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>%F0%9F%9F%A9</text></svg>" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

- [ ] **Step 7: Create `web/src/main.js`**

```js
import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';

export default mount(App, { target: document.getElementById('app') });
```

- [ ] **Step 8: Create a minimal `web/src/app.css`** (real tokens land in Task 3)

```css
:root { color-scheme: dark; }
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; background: #0a0b0e; color: #e6e8ec; }
```

- [ ] **Step 9: Create a minimal `web/src/App.svelte`**

```svelte
<script>
  let ready = $state(true);
</script>

<main>
  {#if ready}<h1>MineEN</h1>{/if}
</main>
```

- [ ] **Step 10: Verify the build works**

Run: `npm run build`
Expected: exits 0; `web/dist/index.html` exists and references a hashed JS asset.

- [ ] **Step 11: Verify tests run (no tests yet is fine)**

Run: `npm test`
Expected: Vitest starts, reports "no test files found" (or 0 tests) and exits without config errors.

- [ ] **Step 12: Commit**

```bash
git add package.json vite.config.js .gitignore web/index.html web/src/main.js web/src/App.svelte web/src/app.css web/src/test-setup.js
git commit -m "build: scaffold Vite + Svelte 5 + Vitest frontend toolchain"
```

---

## Task 2: Serve the built app from Express + panel metadata

**Files:**
- Modify: `src/config.js` (add `WEB_DIST`)
- Modify: `server.js:11` (import), `server.js:26` (static), add `/api/panel` + SPA fallback

**Interfaces:**
- Consumes: `web/dist` from Task 1.
- Produces: Express serves the SPA at `/`; `GET /api/panel` → `{ ok:true, name:'MineEN', version, lanIp }`.

- [ ] **Step 1: Add `WEB_DIST` to `src/config.js`**

After the `PUBLIC_DIR` export (line 7), add:

```js
export const WEB_DIST = path.join(ROOT, 'web', 'dist');
```

- [ ] **Step 2: Import it in `server.js`**

In the `./src/config.js` import (line 11), add `WEB_DIST`:

```js
import { PUBLIC_DIR, WEB_DIST, SERVERS_DIR, ensureDirs, loadConfig, looksLikeServer, detectJar, newId } from './src/config.js';
```

- [ ] **Step 3: Serve `web/dist` instead of `public`**

Replace `server.js:26` (`app.use(express.static(PUBLIC_DIR));`) with:

```js
app.use(express.static(WEB_DIST));
```

- [ ] **Step 4: Add `/api/panel` metadata route**

Add near the other `app.get` routes (e.g. after the `/api/servers` GET at line 170):

```js
app.get('/api/panel', (req, res) => ok(res, { name: 'MineEN', version: '2.0.0', lanIp: lanIp() }));
```

- [ ] **Step 5: Add an SPA fallback** (must come AFTER all `/api` routes, just before `httpServer.listen`)

```js
// Any non-API GET falls through to the SPA entry (client renders the view).
app.get(/^\/(?!api|ws).*/, (req, res) => res.sendFile(path.join(WEB_DIST, 'index.html')));
```

- [ ] **Step 6: Manual verification**

Run: `npm run build && npm start`
Then in another shell: `curl -s http://localhost:9999/api/panel`
Expected: `{"ok":true,"name":"MineEN","version":"2.0.0","lanIp":"..."}`. Opening `http://localhost:9999/` shows the "MineEN" heading from Task 1. Stop the server after checking.

- [ ] **Step 7: Commit**

```bash
git add src/config.js server.js
git commit -m "feat(server): serve compiled MineEN SPA from web/dist + /api/panel"
```

---

## Task 3: Design system tokens

**Files:**
- Modify: `web/src/app.css`

**Interfaces:**
- Produces: CSS custom properties consumed by every component: surfaces `--bg`, `--surface-1..3`, text `--text`, `--text-dim`, `--text-mut`, accent `--accent`/`--accent-dim`, status `--ok`/`--warn`/`--bad`, `--border`, radii `--r-sm/md/lg`, `--shadow`, fonts `--font`/`--mono`.

- [ ] **Step 1: Replace `web/src/app.css` with the token system + reset**

```css
:root[data-theme='dark'],
:root {
  color-scheme: dark;
  --bg: #08090c;
  --surface-1: #0e1015;
  --surface-2: #14171d;
  --surface-3: #1b1f27;
  --border: #232833;
  --text: #e7e9ee;
  --text-dim: #a2a8b4;
  --text-mut: #6b7280;
  --accent: #34d399;
  --accent-dim: #0f2f26;
  --accent-ink: #041b13;
  --ok: #34d399;
  --warn: #fbbf24;
  --bad: #f87171;
  --info: #60a5fa;
  --r-sm: 7px;
  --r-md: 11px;
  --r-lg: 16px;
  --shadow: 0 12px 40px -12px rgba(0, 0, 0, 0.7);
  --font: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
  --mono: 'JetBrains Mono', 'Cascadia Code', ui-monospace, 'SF Mono', Menlo, monospace;
}

:root[data-theme='light'] {
  color-scheme: light;
  --bg: #f4f5f7;
  --surface-1: #ffffff;
  --surface-2: #f7f8fa;
  --surface-3: #eef0f3;
  --border: #e2e5ea;
  --text: #14171d;
  --text-dim: #4b5563;
  --text-mut: #8a92a0;
  --accent: #059669;
  --accent-dim: #d1fae5;
  --accent-ink: #ffffff;
  --shadow: 0 12px 40px -16px rgba(20, 23, 29, 0.25);
}

* { box-sizing: border-box; }
html, body, #app { height: 100%; }
body {
  margin: 0;
  font-family: var(--font);
  background: var(--bg);
  color: var(--text);
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
::selection { background: var(--accent); color: var(--accent-ink); }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
button { font: inherit; color: inherit; cursor: pointer; }
input, select, textarea { font: inherit; }
.mono { font-family: var(--mono); }
```

- [ ] **Step 2: Verify build still succeeds**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add web/src/app.css
git commit -m "feat(ui): MineEN premium dark design tokens + reset"
```

---

## Task 4: Pure utilities — formatting

**Files:**
- Create: `web/src/lib/format.js`, `web/src/lib/format.test.js`

**Interfaces:**
- Produces: `fmtBytes(n)→string`, `fmtUptime(ms)→string`, `fmtTime(ms)→string`, `esc(s)→string`.

- [ ] **Step 1: Write the failing test `web/src/lib/format.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { fmtBytes, fmtUptime, esc } from './format.js';

describe('fmtBytes', () => {
  it('formats zero and units', () => {
    expect(fmtBytes(0)).toBe('0 B');
    expect(fmtBytes(1024)).toBe('1.0 KB');
    expect(fmtBytes(1048576)).toBe('1.0 MB');
  });
});

describe('fmtUptime', () => {
  it('returns dash for empty', () => expect(fmtUptime(0)).toBe('—'));
  it('formats seconds and minutes', () => {
    expect(fmtUptime(45000)).toBe('45s');
    expect(fmtUptime(65000)).toBe('1m 5s');
  });
});

describe('esc', () => {
  it('escapes html', () => expect(esc('<b>&"')).toBe('&lt;b&gt;&amp;&quot;'));
});
```

- [ ] **Step 2: Run it, verify failure**

Run: `npx vitest run web/src/lib/format.test.js`
Expected: FAIL — cannot resolve `./format.js`.

- [ ] **Step 3: Implement `web/src/lib/format.js`** (ported from the old `public/js/api.js`)

```js
export function fmtBytes(bytes) {
  if (!bytes) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0) + ' ' + u[i];
}

export function fmtUptime(ms) {
  if (!ms || ms < 0) return '—';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d) return `${d}d ${h}h ${m}m`;
  if (h) return `${h}h ${m}m ${sec}s`;
  if (m) return `${m}m ${sec}s`;
  return `${sec}s`;
}

export function fmtTime(ms) {
  if (!ms) return '—';
  return new Date(ms).toLocaleString();
}

export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npx vitest run web/src/lib/format.test.js`
Expected: PASS (3 files/cases green).

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/format.js web/src/lib/format.test.js
git commit -m "feat(ui): pure formatting utilities with tests"
```

---

## Task 5: Pure utilities — console line parsing

**Files:**
- Create: `web/src/lib/console.js`, `web/src/lib/console.test.js`

**Interfaces:**
- Produces: `classify(line)→{ kind, level?, time?, msg }` where `kind` ∈ `panel|command|log`, `level` ∈ `info|warn|error`.

- [ ] **Step 1: Write the failing test `web/src/lib/console.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { classify } from './console.js';

describe('classify', () => {
  it('tags panel lines', () => {
    expect(classify('[panel] Downloading…')).toMatchObject({ kind: 'panel' });
  });
  it('tags echoed commands', () => {
    expect(classify('> say hi')).toMatchObject({ kind: 'command' });
  });
  it('parses a vanilla INFO line', () => {
    expect(classify('[12:00:01] [Server thread/INFO]: Done')).toMatchObject({
      kind: 'log', level: 'info', time: '12:00:01', msg: 'Done'
    });
  });
  it('maps WARN and ERROR levels', () => {
    expect(classify('[12:00:02] [Server thread/WARN]: careful').level).toBe('warn');
    expect(classify('[12:00:03] [Server thread/ERROR]: boom').level).toBe('error');
  });
  it('falls back to a raw log line', () => {
    expect(classify('just text')).toMatchObject({ kind: 'log', level: 'info', msg: 'just text' });
  });
});
```

- [ ] **Step 2: Run it, verify failure**

Run: `npx vitest run web/src/lib/console.test.js`
Expected: FAIL — cannot resolve `./console.js`.

- [ ] **Step 3: Implement `web/src/lib/console.js`** (ported/refined from `public/js/app.js` `parseLine`)

```js
function parse(line) {
  let m = line.match(/^\[(\d{2}:\d{2}:\d{2})\]\s*\[[^\]]*\/(INFO|WARN|WARNING|ERROR|SEVERE|DEBUG|TRACE)\]:?\s?(.*)$/);
  if (!m) m = line.match(/^\[(\d{2}:\d{2}:\d{2})\s+(INFO|WARN|WARNING|ERROR|SEVERE|DEBUG|TRACE)\]:?\s?(.*)$/);
  return m ? { time: m[1], raw: m[2], msg: m[3] } : null;
}

export function classify(line) {
  if (line.startsWith('[panel]')) return { kind: 'panel', level: 'info', msg: line };
  if (line.startsWith('> ')) return { kind: 'command', level: 'info', msg: line };
  const p = parse(line);
  if (!p) return { kind: 'log', level: 'info', msg: line };
  const level = /WARN/.test(p.raw) ? 'warn' : (/ERROR|SEVERE/.test(p.raw) ? 'error' : 'info');
  return { kind: 'log', level, time: p.time, msg: p.msg };
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npx vitest run web/src/lib/console.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/console.js web/src/lib/console.test.js
git commit -m "feat(ui): console line classification with tests"
```

---

## Task 6: REST + WebSocket clients

**Files:**
- Create: `web/src/lib/api.js`, `web/src/lib/ws.js`

**Interfaces:**
- Produces: `api.get(url)`, `api.post(url, body)`, `api.del(url)` (throw on `{ok:false}`); `createSocket(onMessage, onOpen)` → `{ send(obj), close() }` auto-reconnecting.

- [ ] **Step 1: Create `web/src/lib/api.js`** (ported from old `Panel.api`)

```js
async function req(method, url, body) {
  const opts = { method, headers: {} };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  get: (u) => req('GET', u),
  post: (u, b) => req('POST', u, b),
  del: (u) => req('DELETE', u)
};

export function sUrl(id, suffix) {
  return `/api/servers/${id}${suffix}`;
}
```

- [ ] **Step 2: Create `web/src/lib/ws.js`** (auto-reconnect, ported from `Panel.connectWS`)

```js
export function createSocket(onMessage, onOpen) {
  let ws;
  let closed = false;
  const open = () => {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${proto}://${location.host}/ws`);
    ws.onopen = () => onOpen && onOpen();
    ws.onmessage = (ev) => {
      try { onMessage(JSON.parse(ev.data)); } catch { /* ignore malformed */ }
    };
    ws.onclose = () => { if (!closed) setTimeout(open, 1500); };
    ws.onerror = () => ws.close();
  };
  open();
  return {
    send: (obj) => { try { if (ws?.readyState === 1) ws.send(JSON.stringify(obj)); } catch { /* not open */ } },
    close: () => { closed = true; ws?.close(); }
  };
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add web/src/lib/api.js web/src/lib/ws.js
git commit -m "feat(ui): REST + auto-reconnecting WebSocket clients"
```

---

## Task 7: Server + active-server stores

**Files:**
- Create: `web/src/stores/servers.js`, `web/src/stores/servers.test.js`, `web/src/stores/active.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `servers` (writable array); `reduceServers(list)→list` (pure normalize/sort); `activeId` (writable string|null), `activeState` (writable StateObj|{}), `activeServer` (derived — the summary row for `activeId`), `selectServer(id)`, `ensureActive()`.

- [ ] **Step 1: Write the failing test `web/src/stores/servers.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { reduceServers } from './servers.js';

describe('reduceServers', () => {
  it('sorts by name, case-insensitive', () => {
    const out = reduceServers([
      { id: '2', name: 'zeta' }, { id: '1', name: 'Alpha' }
    ]);
    expect(out.map((s) => s.id)).toEqual(['1', '2']);
  });
  it('returns [] for non-arrays', () => {
    expect(reduceServers(undefined)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it, verify failure**

Run: `npx vitest run web/src/stores/servers.test.js`
Expected: FAIL — cannot resolve `./servers.js`.

- [ ] **Step 3: Implement `web/src/stores/servers.js`**

```js
import { writable } from 'svelte/store';

export function reduceServers(list) {
  if (!Array.isArray(list)) return [];
  return [...list].sort((a, b) => String(a.name).localeCompare(String(b.name), undefined, { sensitivity: 'base' }));
}

export const servers = writable([]);
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npx vitest run web/src/stores/servers.test.js`
Expected: PASS.

- [ ] **Step 5: Implement `web/src/stores/active.js`**

```js
import { writable, derived, get } from 'svelte/store';
import { servers } from './servers.js';

export const activeId = writable(null);
export const activeState = writable({});

export const activeServer = derived([servers, activeId], ([$servers, $id]) =>
  $servers.find((s) => s.id === $id) || null);

// Ensure some server is active once the list is known.
export function ensureActive() {
  const list = get(servers);
  const id = get(activeId);
  if (!list.length) { activeId.set(null); return; }
  if (!id || !list.find((s) => s.id === id)) activeId.set(list[0].id);
}
```

- [ ] **Step 6: Commit**

```bash
git add web/src/stores/servers.js web/src/stores/servers.test.js web/src/stores/active.js
git commit -m "feat(ui): server registry + active-server stores"
```

---

## Task 8: Telemetry + console-log stores

**Files:**
- Create: `web/src/stores/telemetry.js`, `web/src/stores/telemetry.test.js`, `web/src/stores/consoleLog.js`

**Interfaces:**
- Produces: `telemetry` (writable `{ cpu:[], mem:[], memMax:number, last:{} }`), `pushStats(msg)`, `seedTelemetry({cpu,mem})`, `resetTelemetry()`; `logLines` (writable string[]), `appendLog(line)`, `setLog(lines)` (cap 1000).

- [ ] **Step 1: Write the failing test `web/src/stores/telemetry.test.js`**

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { telemetry, pushStats, resetTelemetry } from './telemetry.js';

beforeEach(() => resetTelemetry());

describe('pushStats', () => {
  it('appends cpu/mem samples and stores last', () => {
    pushStats({ cpu: 20, memUsedMB: 512, memMaxMB: 2048, tps: 20 });
    const t = get(telemetry);
    expect(t.cpu).toEqual([20]);
    expect(t.mem).toEqual([512]);
    expect(t.memMax).toBe(2048);
    expect(t.last.tps).toBe(20);
  });
  it('caps history at 60 samples', () => {
    for (let i = 0; i < 70; i++) pushStats({ cpu: i, memUsedMB: i, memMaxMB: 2048 });
    expect(get(telemetry).cpu.length).toBe(60);
    expect(get(telemetry).cpu[0]).toBe(10);
  });
});
```

- [ ] **Step 2: Run it, verify failure**

Run: `npx vitest run web/src/stores/telemetry.test.js`
Expected: FAIL — cannot resolve `./telemetry.js`.

- [ ] **Step 3: Implement `web/src/stores/telemetry.js`**

```js
import { writable } from 'svelte/store';

const empty = () => ({ cpu: [], mem: [], memMax: 2048, last: {} });
export const telemetry = writable(empty());

export function resetTelemetry() { telemetry.set(empty()); }

export function seedTelemetry(hist) {
  telemetry.update((t) => ({
    ...t,
    cpu: (hist?.cpu || []).slice(-60),
    mem: (hist?.mem || []).slice(-60)
  }));
}

export function pushStats(msg) {
  telemetry.update((t) => {
    const cpu = [...t.cpu, msg.cpu];
    const mem = [...t.mem, msg.memUsedMB];
    if (cpu.length > 60) { cpu.shift(); mem.shift(); }
    return { cpu, mem, memMax: msg.memMaxMB ?? t.memMax, last: msg };
  });
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npx vitest run web/src/stores/telemetry.test.js`
Expected: PASS.

- [ ] **Step 5: Implement `web/src/stores/consoleLog.js`**

```js
import { writable } from 'svelte/store';

export const logLines = writable([]);

export function setLog(lines) { logLines.set((lines || []).slice(-1000)); }

export function appendLog(line) {
  logLines.update((l) => {
    const next = [...l, line];
    if (next.length > 1000) next.splice(0, next.length - 1000);
    return next;
  });
}
```

- [ ] **Step 6: Commit**

```bash
git add web/src/stores/telemetry.js web/src/stores/telemetry.test.js web/src/stores/consoleLog.js
git commit -m "feat(ui): telemetry ring-buffer + console-log stores"
```

---

## Task 9: Toast store + component

**Files:**
- Create: `web/src/stores/toast.js`, `web/src/components/Toast.svelte`

**Interfaces:**
- Produces: `toasts` (writable array of `{ id, msg, type }`), `toast(msg, type='')`; `<Toast />` renders + auto-dismisses at 3200ms.

- [ ] **Step 1: Create `web/src/stores/toast.js`**

```js
import { writable } from 'svelte/store';

export const toasts = writable([]);
let seq = 0;

export function toast(msg, type = '') {
  const id = ++seq;
  toasts.update((t) => [...t, { id, msg, type }]);
  setTimeout(() => toasts.update((t) => t.filter((x) => x.id !== id)), 3200);
}
```

- [ ] **Step 2: Create `web/src/components/Toast.svelte`**

```svelte
<script>
  import { toasts } from '../stores/toast.js';
</script>

<div class="toast-wrap">
  {#each $toasts as t (t.id)}
    <div class="toast {t.type}">{t.msg}</div>
  {/each}
</div>

<style>
  .toast-wrap { position: fixed; bottom: 20px; right: 20px; display: flex; flex-direction: column; gap: 8px; z-index: 100; }
  .toast {
    background: var(--surface-3); border: 1px solid var(--border); color: var(--text);
    padding: 10px 14px; border-radius: var(--r-md); box-shadow: var(--shadow);
    font-size: 13px; max-width: 320px; animation: slide .18s ease;
  }
  .toast.ok { border-color: var(--ok); }
  .toast.err { border-color: var(--bad); }
  @keyframes slide { from { opacity: 0; transform: translateY(6px); } }
</style>
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add web/src/stores/toast.js web/src/components/Toast.svelte
git commit -m "feat(ui): toast store + component"
```

---

## Task 10: Command palette — matching logic + registry

**Files:**
- Create: `web/src/lib/palette.js`, `web/src/lib/palette.test.js`, `web/src/stores/palette.js`

**Interfaces:**
- Produces: `filterCommands(commands, query)→ranked list` (pure subsequence match, case-insensitive); `paletteOpen` (writable bool), `commands` (writable registry of `{ id, label, group, run }`), `openPalette()`, `closePalette()`.

- [ ] **Step 1: Write the failing test `web/src/lib/palette.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { filterCommands } from './palette.js';

const cmds = [
  { id: 'start', label: 'Start server' },
  { id: 'stop', label: 'Stop server' },
  { id: 'files', label: 'Open Files' }
];

describe('filterCommands', () => {
  it('returns all for empty query', () => {
    expect(filterCommands(cmds, '')).toHaveLength(3);
  });
  it('matches subsequences case-insensitively', () => {
    const r = filterCommands(cmds, 'ss');
    expect(r[0].id).toBe('start'); // "Start Server" ranks for 'ss'
    expect(r.find((c) => c.id === 'files')).toBeUndefined();
  });
  it('ranks a contiguous prefix above a scattered match', () => {
    const r = filterCommands(cmds, 'sto');
    expect(r[0].id).toBe('stop');
  });
  it('ranks a more contiguous match above a scattered one when both match', () => {
    const r = filterCommands([
      { id: 'start', label: 'Start server' },
      { id: 'server', label: 'Server' }
    ], 'se');
    const ids = r.map((c) => c.id);
    expect(ids).toContain('server');
    expect(ids).toContain('start');
    expect(r[0].id).toBe('server'); // "Server" (contiguous s-e) outranks "Start server" (scattered)
  });
});
```

- [ ] **Step 2: Run it, verify failure**

Run: `npx vitest run web/src/lib/palette.test.js`
Expected: FAIL — cannot resolve `./palette.js`.

- [ ] **Step 3: Implement `web/src/lib/palette.js`**

```js
// Subsequence match with a light contiguity bonus. Returns null if no match.
export function score(label, q) {
  if (!q) return 0;
  const s = label.toLowerCase();
  const query = q.toLowerCase();
  let si = 0, points = 0, streak = 0;
  for (let qi = 0; qi < query.length; qi++) {
    const found = s.indexOf(query[qi], si);
    if (found === -1) return null;
    streak = found === si ? streak + 2 : 0;
    points += 1 + streak;
    if (found === 0) points += 3; // prefix bonus
    si = found + 1;
  }
  return points;
}

export function filterCommands(commands, q) {
  if (!q) return [...commands];
  return commands
    .map((c) => ({ c, s: score(c.label, q) }))
    .filter((x) => x.s !== null)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.c);
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npx vitest run web/src/lib/palette.test.js`
Expected: PASS.

- [ ] **Step 5: Implement `web/src/stores/palette.js`**

```js
import { writable } from 'svelte/store';

export const paletteOpen = writable(false);
export const commands = writable([]);

export function openPalette() { paletteOpen.set(true); }
export function closePalette() { paletteOpen.set(false); }
export function setCommands(list) { commands.set(list); }
```

- [ ] **Step 6: Commit**

```bash
git add web/src/lib/palette.js web/src/lib/palette.test.js web/src/stores/palette.js
git commit -m "feat(ui): command-palette matching logic + registry store"
```

---

## Task 11: Command palette component

**Files:**
- Create: `web/src/components/CommandPalette.svelte`, `web/src/components/CommandPalette.test.js`

**Interfaces:**
- Consumes: `paletteOpen`, `commands`, `closePalette` (Task 10), `filterCommands` (Task 10).
- Produces: `<CommandPalette />` — a ⌘K overlay; arrow keys move selection, Enter runs `command.run()`, Esc closes.

- [ ] **Step 1: Write the failing test `web/src/components/CommandPalette.test.js`**

```js
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import CommandPalette from './CommandPalette.svelte';
import { paletteOpen, commands } from '../stores/palette.js';

describe('CommandPalette', () => {
  it('shows commands when open and runs the selected one on Enter', async () => {
    const run = vi.fn();
    commands.set([{ id: 'x', label: 'Do X', group: 'Test', run }]);
    paletteOpen.set(true);
    render(CommandPalette);
    expect(await screen.findByText('Do X')).toBeInTheDocument();
    await fireEvent.keyDown(window, { key: 'Enter' });
    expect(run).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run it, verify failure**

Run: `npx vitest run web/src/components/CommandPalette.test.js`
Expected: FAIL — cannot resolve the component.

- [ ] **Step 3: Implement `web/src/components/CommandPalette.svelte`**

```svelte
<script>
  import { paletteOpen, commands, closePalette } from '../stores/palette.js';
  import { filterCommands } from '../lib/palette.js';

  let query = $state('');
  let selected = $state(0);
  let inputEl = $state(null);

  const results = $derived(filterCommands($commands, query));

  $effect(() => { if ($paletteOpen) { query = ''; selected = 0; inputEl?.focus(); } });
  $effect(() => { if (selected >= results.length) selected = 0; });

  function onKey(e) {
    if (!$paletteOpen) return;
    if (e.key === 'Escape') { closePalette(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); selected = Math.min(selected + 1, results.length - 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); selected = Math.max(selected - 1, 0); }
    else if (e.key === 'Enter') { e.preventDefault(); run(results[selected]); }
  }
  function run(cmd) { if (!cmd) return; closePalette(); cmd.run(); }
</script>

<svelte:window onkeydown={onKey} />

{#if $paletteOpen}
  <div class="cp-overlay" onclick={closePalette} role="presentation">
    <div class="cp" onclick={(e) => e.stopPropagation()} role="dialog" aria-label="Command palette">
      <input class="cp-input" placeholder="Type a command…" bind:value={query} bind:this={inputEl} />
      <div class="cp-list">
        {#each results as cmd, i (cmd.id)}
          <button class="cp-item {i === selected ? 'sel' : ''}" onmouseenter={() => (selected = i)} onclick={() => run(cmd)}>
            <span>{cmd.label}</span>
            {#if cmd.group}<span class="cp-group">{cmd.group}</span>{/if}
          </button>
        {:else}
          <div class="cp-empty">No matching commands</div>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style>
  .cp-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: flex; justify-content: center; align-items: flex-start; padding-top: 14vh; z-index: 200; }
  .cp { width: min(560px, 92vw); background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--r-lg); box-shadow: var(--shadow); overflow: hidden; }
  .cp-input { width: 100%; border: 0; background: transparent; color: var(--text); padding: 16px 18px; font-size: 15px; outline: none; border-bottom: 1px solid var(--border); }
  .cp-list { max-height: 340px; overflow-y: auto; padding: 6px; }
  .cp-item { display: flex; justify-content: space-between; align-items: center; width: 100%; text-align: left; background: transparent; border: 0; padding: 10px 12px; border-radius: var(--r-sm); color: var(--text); }
  .cp-item.sel { background: var(--accent-dim); }
  .cp-group { font-size: 11px; color: var(--text-mut); text-transform: uppercase; letter-spacing: .04em; }
  .cp-empty { padding: 18px; text-align: center; color: var(--text-mut); }
</style>
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npx vitest run web/src/components/CommandPalette.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/CommandPalette.svelte web/src/components/CommandPalette.test.js
git commit -m "feat(ui): command palette overlay component"
```

---

## Task 12: Sparkline component

**Files:**
- Create: `web/src/components/Sparkline.svelte`

**Interfaces:**
- Consumes: props `data:number[]`, `max:number`, `color:string`.
- Produces: an inline SVG sparkline (area + line), no external deps.

- [ ] **Step 1: Create `web/src/components/Sparkline.svelte`**

```svelte
<script>
  let { data = [], max = 100, color = 'var(--accent)' } = $props();
  const W = 120, H = 36;
  const pts = $derived(
    (data && data.length >= 2)
      ? data.map((v, i) => {
          const x = (i / (data.length - 1)) * W;
          const y = H - Math.max(0, Math.min(1, v / (max || 1))) * H;
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(' ')
      : ''
  );
</script>

<svg class="spark" viewBox="0 0 {W} {H}" preserveAspectRatio="none" aria-hidden="true">
  {#if pts}
    <polygon points="0,{H} {pts} {W},{H}" fill={color} opacity="0.12" />
    <polyline points={pts} fill="none" stroke={color} stroke-width="1.6" />
  {/if}
</svg>

<style>
  .spark { width: 100%; height: 36px; display: block; }
</style>
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add web/src/components/Sparkline.svelte
git commit -m "feat(ui): dependency-free sparkline component"
```

---

## Task 13: Power controls + server switcher

**Files:**
- Create: `web/src/components/PowerControls.svelte`, `web/src/components/ServerSwitcher.svelte`

**Interfaces:**
- Consumes: `activeId`, `activeState` (Task 7), `servers` (Task 7), `api`+`sUrl` (Task 6), `toast` (Task 9).
- Produces: `<PowerControls />` (start/stop/restart/kill, disabled by state); `<ServerSwitcher />` (dropdown to change `activeId`, "Add server" action via prop `onadd`).

- [ ] **Step 1: Create `web/src/components/PowerControls.svelte`**

```svelte
<script>
  import { activeId, activeState } from '../stores/active.js';
  import { api, sUrl } from '../lib/api.js';
  import { toast } from '../stores/toast.js';

  let { onneedsEula } = $props();

  const can = $derived.by(() => {
    const s = $activeState;
    const c = { start: false, stop: false, restart: false, kill: false };
    if (!s.installed) return c;
    if (s.state === 'offline') c.start = true;
    else if (s.state === 'online') { c.stop = c.restart = c.kill = true; }
    else if (s.state === 'starting') { c.stop = c.kill = true; }
    else if (s.state === 'stopping') { c.kill = true; }
    return c;
  });

  async function power(action) {
    const s = $activeState;
    if (action === 'start' && s.installed && !s.eulaAccepted) { onneedsEula?.(); return; }
    if (action === 'kill' && !confirm('Force-kill the server process? Unsaved progress may be lost.')) return;
    try { await api.post(sUrl($activeId, '/power'), { action }); }
    catch (e) { toast(e.message, 'err'); }
  }
</script>

<div class="power">
  <button class="pw start" disabled={!can.start} onclick={() => power('start')} title="Start">▶</button>
  <button class="pw restart" disabled={!can.restart} onclick={() => power('restart')} title="Restart">⟳</button>
  <button class="pw stop" disabled={!can.stop} onclick={() => power('stop')} title="Stop">■</button>
  <button class="pw kill" disabled={!can.kill} onclick={() => power('kill')} title="Force kill">✕</button>
</div>

<style>
  .power { display: flex; gap: 6px; }
  .pw { width: 36px; height: 36px; border-radius: var(--r-sm); border: 1px solid var(--border); background: var(--surface-2); color: var(--text-dim); font-size: 14px; }
  .pw:not(:disabled):hover { color: var(--text); border-color: var(--text-mut); }
  .pw:disabled { opacity: .35; cursor: not-allowed; }
  .pw.start:not(:disabled) { color: var(--ok); }
  .pw.stop:not(:disabled), .pw.kill:not(:disabled) { color: var(--bad); }
</style>
```

- [ ] **Step 2: Create `web/src/components/ServerSwitcher.svelte`**

```svelte
<script>
  import { servers } from '../stores/servers.js';
  import { activeId, activeServer } from '../stores/active.js';

  let { onadd } = $props();
  let open = $state(false);

  function dot(state) { return state === 'online' ? 'online' : (state === 'starting' || state === 'stopping' ? 'busy' : ''); }
  function pick(id) { activeId.set(id); open = false; }
</script>

<div class="switcher">
  <button class="sw-btn" onclick={() => (open = !open)}>
    <span class="s-dot {dot($activeServer?.state)}"></span>
    <span class="sw-name">{$activeServer?.name ?? 'Select a server'}</span>
    <span class="caret">▾</span>
  </button>
  {#if open}
    <div class="sw-menu">
      {#each $servers as s (s.id)}
        <button class="sw-item {s.id === $activeId ? 'active' : ''}" onclick={() => pick(s.id)}>
          <span class="s-dot {dot(s.state)}"></span>
          <span class="sw-meta"><span class="sw-name">{s.name}</span><span class="sw-sub">{s.versionLabel}</span></span>
        </button>
      {/each}
      <button class="sw-add" onclick={() => { open = false; onadd?.(); }}>＋ Add server</button>
    </div>
  {/if}
</div>

<style>
  .switcher { position: relative; }
  .sw-btn { display: flex; align-items: center; gap: 8px; background: transparent; border: 0; color: var(--text); font-size: 18px; font-weight: 600; }
  .caret { color: var(--text-mut); font-size: 12px; }
  .s-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--text-mut); }
  .s-dot.online { background: var(--ok); box-shadow: 0 0 8px var(--ok); }
  .s-dot.busy { background: var(--warn); }
  .sw-menu { position: absolute; top: calc(100% + 8px); left: 0; min-width: 240px; background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--r-md); box-shadow: var(--shadow); padding: 6px; z-index: 40; }
  .sw-item { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; background: transparent; border: 0; padding: 8px 10px; border-radius: var(--r-sm); color: var(--text); }
  .sw-item.active, .sw-item:hover { background: var(--surface-3); }
  .sw-meta { display: flex; flex-direction: column; }
  .sw-sub { font-size: 12px; color: var(--text-mut); }
  .sw-add { width: 100%; text-align: left; background: transparent; border: 0; border-top: 1px solid var(--border); margin-top: 4px; padding: 10px; color: var(--accent); }
</style>
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add web/src/components/PowerControls.svelte web/src/components/ServerSwitcher.svelte
git commit -m "feat(ui): power controls + server switcher"
```

---

## Task 14: Sidebar + Topbar

**Files:**
- Create: `web/src/components/Sidebar.svelte`, `web/src/components/Topbar.svelte`

**Interfaces:**
- Consumes: `activeServer`, `activeState`; `openPalette` (Task 10).
- Produces: `<Sidebar {view} onnavigate />` (nav items → emits view id); `<Topbar onadd onneedsEula />` (brand-free top bar: switcher + address + palette hint + power controls).

- [ ] **Step 1: Create `web/src/components/Sidebar.svelte`**

```svelte
<script>
  let { view = 'console', onnavigate } = $props();
  const items = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'console', label: 'Console' },
    { id: 'files', label: 'Files' },
    { id: 'properties', label: 'Settings' },
    { id: 'players', label: 'Players' },
    { id: 'backups', label: 'Backups' },
    { id: 'schedules', label: 'Automation' }
  ];
</script>

<aside class="sidebar">
  <div class="brand"><span class="brand-mark">◧</span><span class="brand-name">MineEN</span></div>
  <nav>
    {#each items as it (it.id)}
      <button class="nav-item {view === it.id ? 'active' : ''}" onclick={() => onnavigate?.(it.id)}>{it.label}</button>
    {/each}
  </nav>
</aside>

<style>
  .sidebar { width: 220px; flex: 0 0 220px; background: var(--surface-1); border-right: 1px solid var(--border); display: flex; flex-direction: column; padding: 16px 12px; }
  .brand { display: flex; align-items: center; gap: 10px; padding: 8px 10px 18px; font-weight: 700; font-size: 17px; letter-spacing: -.01em; }
  .brand-mark { color: var(--accent); font-size: 20px; }
  nav { display: flex; flex-direction: column; gap: 2px; }
  .nav-item { text-align: left; background: transparent; border: 0; padding: 9px 12px; border-radius: var(--r-sm); color: var(--text-dim); font-size: 13.5px; }
  .nav-item:hover { color: var(--text); background: var(--surface-2); }
  .nav-item.active { color: var(--text); background: var(--surface-3); }
  @media (max-width: 720px) { .sidebar { width: 64px; flex-basis: 64px; } .brand-name, .nav-item { font-size: 0; } }
</style>
```

- [ ] **Step 2: Create `web/src/components/Topbar.svelte`**

```svelte
<script>
  import ServerSwitcher from './ServerSwitcher.svelte';
  import PowerControls from './PowerControls.svelte';
  import { activeState } from '../stores/active.js';
  import { openPalette } from '../stores/palette.js';
  import { toast } from '../stores/toast.js';

  let { onadd, onneedsEula } = $props();
  const isMac = navigator.platform.toLowerCase().includes('mac');

  function copyAddress() {
    const a = $activeState.address;
    if (a) navigator.clipboard?.writeText(a).then(() => toast('Address copied', 'ok'));
  }
</script>

<header class="topbar">
  <ServerSwitcher {onadd} />
  <div class="tb-right">
    {#if $activeState.address}
      <button class="addr mono" onclick={copyAddress} title="Copy address">{$activeState.address}</button>
    {/if}
    <button class="cmdk" onclick={openPalette}>{isMac ? '⌘' : 'Ctrl'} K</button>
    <PowerControls {onneedsEula} />
  </div>
</header>

<style>
  .topbar { display: flex; align-items: center; justify-content: space-between; padding: 14px 22px; border-bottom: 1px solid var(--border); background: var(--surface-1); }
  .tb-right { display: flex; align-items: center; gap: 12px; }
  .addr { background: var(--surface-2); border: 1px solid var(--border); color: var(--text-dim); padding: 6px 10px; border-radius: var(--r-sm); font-size: 12.5px; }
  .cmdk { background: var(--surface-2); border: 1px solid var(--border); color: var(--text-mut); padding: 6px 9px; border-radius: var(--r-sm); font-size: 12px; }
</style>
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add web/src/components/Sidebar.svelte web/src/components/Topbar.svelte
git commit -m "feat(ui): sidebar navigation + top bar"
```

---

## Task 15: Console view

**Files:**
- Create: `web/src/views/Console.svelte`

**Interfaces:**
- Consumes: `logLines` (Task 8), `classify` (Task 5), `activeId`, `api`+`sUrl` (Task 6), `toast`.
- Produces: `<Console />` — colorized live log with autoscroll + a filter box + a command input.

- [ ] **Step 1: Create `web/src/views/Console.svelte`**

```svelte
<script>
  import { logLines } from '../stores/consoleLog.js';
  import { classify } from '../lib/console.js';
  import { activeId } from '../stores/active.js';
  import { api, sUrl } from '../lib/api.js';
  import { toast } from '../stores/toast.js';

  let filter = $state('');
  let command = $state('');
  let atBottom = $state(true);
  let box = $state(null);

  const rows = $derived(
    $logLines
      .map((line) => ({ line, ...classify(line) }))
      .filter((r) => !filter || r.line.toLowerCase().includes(filter.toLowerCase()))
  );

  $effect(() => {
    // re-run when rows change; stick to bottom if we were at the bottom
    rows.length;
    if (atBottom && box) box.scrollTop = box.scrollHeight;
  });

  function onScroll() {
    if (!box) return;
    atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 40;
  }

  async function submit(e) {
    e.preventDefault();
    const cmd = command.trim();
    if (!cmd) return;
    try { await api.post(sUrl($activeId, '/command'), { command: cmd }); command = ''; }
    catch (err) { toast(err.message, 'err'); }
  }
</script>

<section class="console-view">
  <div class="console-tools">
    <input class="filter" placeholder="Filter log…" bind:value={filter} />
  </div>
  <div class="console" bind:this={box} onscroll={onScroll}>
    {#each rows as r}
      <div class="line {r.kind} {r.level}">
        {#if r.time}<span class="time mono">{r.time}</span>{/if}
        {#if r.kind === 'log'}<span class="lvl {r.level}">{r.level}</span>{/if}
        <span class="msg">{r.msg}</span>
      </div>
    {/each}
  </div>
  <form class="cmd" onsubmit={submit}>
    <input class="mono" placeholder="Type a server command…" bind:value={command} spellcheck="false" autocomplete="off" />
    <button type="submit">Send</button>
  </form>
</section>

<style>
  .console-view { display: flex; flex-direction: column; height: 100%; gap: 10px; }
  .console-tools { display: flex; }
  .filter { background: var(--surface-2); border: 1px solid var(--border); color: var(--text); border-radius: var(--r-sm); padding: 7px 10px; width: 240px; }
  .console { flex: 1; overflow-y: auto; background: #05060a; border: 1px solid var(--border); border-radius: var(--r-md); padding: 12px; font-family: var(--mono); font-size: 12.5px; line-height: 1.55; }
  .line { display: flex; gap: 8px; white-space: pre-wrap; word-break: break-word; }
  .line.panel .msg { color: var(--accent); }
  .line.command .msg { color: var(--info); }
  .line.warn .msg { color: var(--warn); }
  .line.error .msg { color: var(--bad); }
  .time { color: var(--text-mut); }
  .lvl { text-transform: uppercase; font-size: 10px; padding: 0 5px; border-radius: 4px; align-self: center; }
  .lvl.info { color: var(--text-mut); }
  .lvl.warn { color: var(--warn); }
  .lvl.error { color: var(--bad); }
  .cmd { display: flex; gap: 8px; }
  .cmd input { flex: 1; background: var(--surface-2); border: 1px solid var(--border); color: var(--text); border-radius: var(--r-sm); padding: 9px 12px; }
  .cmd button { background: var(--accent); color: var(--accent-ink); border: 0; border-radius: var(--r-sm); padding: 0 16px; font-weight: 600; }
</style>
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add web/src/views/Console.svelte
git commit -m "feat(ui): real-time console view"
```

---

## Task 16: Dashboard view

**Files:**
- Create: `web/src/views/Dashboard.svelte`

**Interfaces:**
- Consumes: `telemetry` (Task 8), `activeState` (Task 7), `Sparkline` (Task 12), `fmtUptime` (Task 4).
- Produces: `<Dashboard />` — CPU/memory/storage tiles with sparklines + TPS/uptime/players/latency health row + server-info card.

- [ ] **Step 1: Create `web/src/views/Dashboard.svelte`**

```svelte
<script>
  import { telemetry } from '../stores/telemetry.js';
  import { activeState } from '../stores/active.js';
  import Sparkline from '../components/Sparkline.svelte';
  import { fmtUptime } from '../lib/format.js';

  const gb = (mb) => (mb / 1024).toFixed(2);
  const last = $derived($telemetry.last);
  const tps = $derived(last.tps);
  const tpsTag = $derived(tps == null ? ['—', ''] : tps >= 19 ? ['STABLE', 'ok'] : tps >= 15 ? ['BUSY', 'warn'] : ['LAGGING', 'bad']);
</script>

<section class="dash">
  <div class="tiles">
    <div class="tile">
      <div class="t-label">CPU</div>
      <div class="t-val">{last.cpu ?? 0}%</div>
      <Sparkline data={$telemetry.cpu} max={100} color="var(--info)" />
    </div>
    <div class="tile">
      <div class="t-label">Memory</div>
      <div class="t-val">{gb(last.memUsedMB ?? 0)} / {gb(last.memMaxMB ?? $telemetry.memMax)} GB</div>
      <Sparkline data={$telemetry.mem} max={$telemetry.memMax} color="var(--accent)" />
    </div>
    <div class="tile">
      <div class="t-label">Storage</div>
      <div class="t-val">{(last.storageMB ?? 0) >= 1024 ? gb(last.storageMB) + ' GB' : (last.storageMB ?? 0) + ' MB'}</div>
    </div>
  </div>

  <div class="health">
    <div class="h-card"><span>TPS</span><strong>{tps == null ? '—' : tps.toFixed(2)}</strong><em class="tag {tpsTag[1]}">{tpsTag[0]}</em></div>
    <div class="h-card"><span>Uptime</span><strong class="mono">{fmtUptime($activeState.uptimeMs)}</strong></div>
    <div class="h-card"><span>Players</span><strong>{last.playerCount ?? $activeState.playerCount ?? 0} / {last.maxPlayers ?? $activeState.maxPlayers ?? 20}</strong></div>
    <div class="h-card"><span>Latency</span><strong>{last.latency == null ? '—' : last.latency + ' ms'}</strong></div>
  </div>

  <div class="card">
    <h3>Server</h3>
    <div class="info">
      <div class="row"><span>Name</span><strong>{$activeState.name ?? '—'}</strong></div>
      <div class="row"><span>Version</span><strong>{$activeState.versionLabel ?? '—'}</strong></div>
      <div class="row"><span>Address</span><strong class="mono">{$activeState.address ?? '—'}</strong></div>
      <div class="row"><span>Memory</span><strong>{$activeState.memoryMB ? gb($activeState.memoryMB) + ' GB' : '—'}</strong></div>
    </div>
  </div>
</section>

<style>
  .dash { display: flex; flex-direction: column; gap: 16px; }
  .tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
  .tile, .card, .h-card { background: var(--surface-1); border: 1px solid var(--border); border-radius: var(--r-md); padding: 16px; }
  .t-label { color: var(--text-mut); font-size: 11px; text-transform: uppercase; letter-spacing: .05em; }
  .t-val { font-size: 22px; font-weight: 650; margin: 6px 0 10px; }
  .health { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
  .h-card { display: flex; flex-direction: column; gap: 4px; }
  .h-card span { color: var(--text-mut); font-size: 11px; text-transform: uppercase; letter-spacing: .05em; }
  .h-card strong { font-size: 20px; }
  .tag { font-size: 11px; font-style: normal; padding: 2px 6px; border-radius: 5px; width: fit-content; }
  .tag.ok { color: var(--ok); background: var(--accent-dim); }
  .tag.warn { color: var(--warn); }
  .tag.bad { color: var(--bad); }
  .card h3 { margin: 0 0 12px; font-size: 14px; }
  .info { display: flex; flex-direction: column; gap: 8px; }
  .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
  .row span { color: var(--text-dim); }
  @media (max-width: 720px) { .tiles, .health { grid-template-columns: 1fr 1fr; } }
</style>
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add web/src/views/Dashboard.svelte
git commit -m "feat(ui): real-time dashboard view"
```

---

## Task 17: Modal shell + Empty state + EULA modal

**Files:**
- Create: `web/src/components/Modal.svelte`, `web/src/views/EmptyState.svelte`, `web/src/components/EulaModal.svelte`

**Interfaces:**
- Produces: `<Modal {title} onclose>…</Modal>`; `<EmptyState onadd />`; `<EulaModal {open} onaccept onclose />`.

- [ ] **Step 1: Create `web/src/components/Modal.svelte`**

```svelte
<script>
  let { title, onclose, children } = $props();
</script>

<div class="overlay" onclick={onclose} role="presentation">
  <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
    <div class="head"><h3>{title}</h3><button class="x" onclick={onclose}>✕</button></div>
    <div class="body">{@render children?.()}</div>
  </div>
</div>

<style>
  .overlay { position: fixed; inset: 0; background: rgba(0,0,0,.55); display: flex; align-items: center; justify-content: center; z-index: 150; padding: 20px; }
  .modal { width: min(480px, 96vw); background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--r-lg); box-shadow: var(--shadow); }
  .head { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border); }
  .head h3 { margin: 0; font-size: 15px; }
  .x { background: transparent; border: 0; color: var(--text-mut); font-size: 15px; }
  .body { padding: 20px; }
</style>
```

- [ ] **Step 2: Create `web/src/views/EmptyState.svelte`**

```svelte
<script>
  let { onadd } = $props();
</script>

<section class="empty">
  <div class="glyph">◧</div>
  <h2>No servers yet</h2>
  <p>Spin up a fresh Minecraft server or point MineEN at a folder you already have. You'll be online in a couple of minutes.</p>
  <button class="cta" onclick={onadd}>＋ Add your first server</button>
</section>

<style>
  .empty { max-width: 440px; margin: 14vh auto 0; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; }
  .glyph { font-size: 44px; color: var(--accent); }
  h2 { margin: 0; }
  p { color: var(--text-dim); margin: 0; }
  .cta { margin-top: 8px; background: var(--accent); color: var(--accent-ink); border: 0; border-radius: var(--r-md); padding: 12px 20px; font-weight: 600; font-size: 14px; }
</style>
```

- [ ] **Step 3: Create `web/src/components/EulaModal.svelte`**

```svelte
<script>
  import Modal from './Modal.svelte';
  let { open, onaccept, onclose } = $props();
  let checked = $state(false);
  $effect(() => { if (open) checked = false; });
</script>

{#if open}
  <Modal title="Minecraft EULA" {onclose}>
    <p>To run a Minecraft server you must accept the
      <a href="https://aka.ms/MinecraftEULA" target="_blank" rel="noopener">Minecraft End User License Agreement</a>.</p>
    <label class="check"><input type="checkbox" bind:checked /> I agree to the Minecraft EULA</label>
    <div class="foot"><button class="go" disabled={!checked} onclick={onaccept}>Accept & Continue</button></div>
  </Modal>
{/if}

<style>
  .check { display: flex; align-items: center; gap: 8px; margin: 16px 0; color: var(--text-dim); }
  .foot { display: flex; justify-content: flex-end; }
  .go { background: var(--accent); color: var(--accent-ink); border: 0; border-radius: var(--r-sm); padding: 9px 16px; font-weight: 600; }
  .go:disabled { opacity: .4; }
</style>
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/Modal.svelte web/src/views/EmptyState.svelte web/src/components/EulaModal.svelte
git commit -m "feat(ui): modal shell, empty state, EULA modal"
```

---

## Task 18: Add-server modal

**Files:**
- Create: `web/src/components/AddServerModal.svelte`

**Interfaces:**
- Consumes: `Modal` (Task 17), `api` (Task 6), `toast`. Reads `install` progress via a prop `installProgress` set by `App` (Task 19).
- Produces: `<AddServerModal {open} {installProgress} oncreated onclose />` — "Download new" (version dropdown) / "Use existing folder" (native pick + validate) tabs; on submit calls `POST /api/servers` and emits `oncreated(id, mode)`.

- [ ] **Step 1: Create `web/src/components/AddServerModal.svelte`**

```svelte
<script>
  import Modal from './Modal.svelte';
  import { api } from '../lib/api.js';
  import { toast } from '../stores/toast.js';

  let { open, installProgress = null, oncreated, onclose } = $props();

  let mode = $state('download');
  let name = $state('');
  let version = $state('');
  let versions = $state([]);
  let path = $state('');
  let isServer = $state(false);
  let hint = $state('');
  let busy = $state(false);

  $effect(() => { if (open && !versions.length) loadVersions(); });

  async function loadVersions() {
    try { const r = await api.get('/api/versions'); versions = r.versions; version = versions[0] ?? ''; }
    catch (e) { toast('Paper API error: ' + e.message, 'err'); }
  }
  async function pick() {
    try {
      const r = await api.post('/api/pick-folder', {});
      if (!r.cancelled && r.path) { path = r.path; isServer = !!r.isServer; hint = r.isServer ? `✓ Server detected${r.jar ? ' (' + r.jar + ')' : ''}` : 'No server jar / server.properties found'; }
    } catch (e) { toast(e.message, 'err'); }
  }
  async function create() {
    busy = true;
    try {
      if (mode === 'existing') {
        if (!path.trim()) { toast('Pick a folder first', 'err'); busy = false; return; }
        const { id } = await api.post('/api/servers', { mode: 'existing', name, path });
        oncreated?.(id, 'existing');
      } else {
        const { id } = await api.post('/api/servers', { mode: 'download', name, version });
        oncreated?.(id, 'download');
      }
    } catch (e) { toast(e.message, 'err'); }
    finally { busy = false; }
  }
</script>

{#if open}
  <Modal title="Add Server" {onclose}>
    <div class="seg">
      <button class:active={mode === 'download'} onclick={() => (mode = 'download')}>Download new</button>
      <button class:active={mode === 'existing'} onclick={() => (mode = 'existing')}>Use existing folder</button>
    </div>
    <label class="field"><span>Server name</span><input bind:value={name} placeholder="My Server" /></label>
    {#if mode === 'download'}
      <label class="field"><span>Minecraft version</span>
        <select bind:value={version}>
          {#each versions as v}<option value={v}>{v}</option>{:else}<option>Loading…</option>{/each}
        </select>
      </label>
    {:else}
      <span class="lbl">Your server folder</span>
      <div class="pick"><input class="mono" bind:value={path} placeholder="C:\\path\\to\\server" /><button onclick={pick}>📁 Browse…</button></div>
      <div class="hint {isServer ? 'good' : 'bad'}">{hint || 'Choose your server folder, or paste its path.'}</div>
    {/if}
    {#if installProgress}
      <div class="prog"><div class="bar" style="width:{installProgress.percent ?? 0}%"></div></div>
      <span class="prog-label">{installProgress.label}</span>
    {/if}
    <div class="foot">
      <button onclick={onclose}>Cancel</button>
      <button class="go" disabled={busy || (mode === 'existing' && !isServer)} onclick={create}>Create</button>
    </div>
  </Modal>
{/if}

<style>
  .seg { display: flex; gap: 6px; background: var(--surface-3); padding: 4px; border-radius: var(--r-sm); margin-bottom: 16px; }
  .seg button { flex: 1; background: transparent; border: 0; color: var(--text-dim); padding: 8px; border-radius: var(--r-sm); }
  .seg button.active { background: var(--surface-1); color: var(--text); }
  .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
  .field span, .lbl { font-size: 12px; color: var(--text-dim); }
  .field input, .field select, .pick input { background: var(--surface-1); border: 1px solid var(--border); color: var(--text); border-radius: var(--r-sm); padding: 9px 11px; width: 100%; }
  .pick { display: flex; gap: 8px; }
  .pick button { background: var(--surface-3); border: 1px solid var(--border); color: var(--text); border-radius: var(--r-sm); padding: 0 12px; white-space: nowrap; }
  .hint { font-size: 12px; margin: 8px 0; }
  .hint.good { color: var(--ok); }
  .hint.bad { color: var(--text-mut); }
  .prog { height: 6px; background: var(--surface-3); border-radius: 3px; margin-top: 14px; overflow: hidden; }
  .bar { height: 100%; background: var(--accent); transition: width .2s; }
  .prog-label { font-size: 12px; color: var(--text-dim); }
  .foot { display: flex; justify-content: flex-end; gap: 8px; margin-top: 18px; }
  .foot .go { background: var(--accent); color: var(--accent-ink); border: 0; font-weight: 600; }
  .foot button { border: 1px solid var(--border); background: var(--surface-1); color: var(--text); border-radius: var(--r-sm); padding: 9px 16px; }
</style>
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add web/src/components/AddServerModal.svelte
git commit -m "feat(ui): add-server modal (download / existing folder)"
```

---

## Task 19: App shell — wire everything to the live socket

**Files:**
- Rewrite: `web/src/App.svelte`
- Create: `web/src/App.test.js`

**Interfaces:**
- Consumes: every store + component above.
- Produces: the running app — one `createSocket`, dispatch of all WS message types into stores, view routing, ⌘K binding, add-server + EULA flows, install-progress plumbing.

- [ ] **Step 1: Write the failing smoke test `web/src/App.test.js`**

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import App from './App.svelte';

beforeEach(() => {
  // Minimal WebSocket stub so App mounts without a real server.
  global.WebSocket = class {
    constructor() { this.readyState = 1; setTimeout(() => this.onopen && this.onopen(), 0); }
    send() {}
    close() {}
  };
  global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, servers: [] }) }));
});

describe('App', () => {
  it('renders the MineEN brand and the empty state with no servers', async () => {
    render(App);
    expect(await screen.findByText('MineEN')).toBeInTheDocument();
    expect(await screen.findByText('No servers yet')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it, verify failure**

Run: `npx vitest run web/src/App.test.js`
Expected: FAIL (App still the Task 1 stub — no "No servers yet").

- [ ] **Step 3: Rewrite `web/src/App.svelte`**

```svelte
<script>
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import Sidebar from './components/Sidebar.svelte';
  import Topbar from './components/Topbar.svelte';
  import Toast from './components/Toast.svelte';
  import CommandPalette from './components/CommandPalette.svelte';
  import AddServerModal from './components/AddServerModal.svelte';
  import EulaModal from './components/EulaModal.svelte';
  import EmptyState from './views/EmptyState.svelte';
  import Console from './views/Console.svelte';
  import Dashboard from './views/Dashboard.svelte';

  import { createSocket } from './lib/ws.js';
  import { api, sUrl } from './lib/api.js';
  import { servers, reduceServers } from './stores/servers.js';
  import { activeId, activeState, ensureActive } from './stores/active.js';
  import { pushStats, seedTelemetry, resetTelemetry } from './stores/telemetry.js';
  import { setLog, appendLog } from './stores/consoleLog.js';
  import { toast } from './stores/toast.js';
  import { openPalette, closePalette, setCommands } from './stores/palette.js';

  let view = $state('console');
  let socket;
  let addOpen = $state(false);
  let eulaOpen = $state(false);
  let installProgress = $state(null);

  const views = { console: Console, dashboard: Dashboard };
  const Current = $derived(views[view] ?? Console);

  // Re-select on the socket whenever the active server changes.
  let lastSelected = null;
  $effect(() => {
    const id = $activeId;
    if (id && id !== lastSelected) {
      lastSelected = id;
      resetTelemetry();
      socket?.send({ type: 'select', serverId: id });
      loadActive(id);
    }
  });

  async function loadActive(id) {
    try {
      const [a, b] = await Promise.all([api.get(sUrl(id, '/state')), api.get(sUrl(id, '/logs'))]);
      activeState.set(a.state);
      setLog(b.lines);
    } catch (e) { toast(e.message, 'err'); }
  }

  function dispatch(msg) {
    switch (msg.type) {
      case 'servers':
        servers.set(reduceServers(msg.servers));
        ensureActive();
        break;
      case 'history':
        if (msg.serverId === get(activeId)) { setLog(msg.lines); seedTelemetry(msg.telemetry); }
        break;
      case 'log':
        if (msg.serverId === get(activeId)) appendLog(msg.line);
        break;
      case 'state':
        if (msg.serverId === get(activeId)) activeState.set(msg.state);
        break;
      case 'players':
        if (msg.serverId === get(activeId)) activeState.update((s) => ({ ...s, players: msg.players, playerCount: msg.playerCount }));
        break;
      case 'stats':
        if (msg.serverId === get(activeId)) pushStats(msg);
        break;
      case 'install':
        handleInstall(msg);
        break;
    }
  }

  function handleInstall(msg) {
    if (msg.phase === 'downloading') installProgress = { percent: msg.percent, label: `Downloading… ${msg.percent}%` };
    else if (msg.phase === 'done') installProgress = { percent: 100, label: 'Installed!' };
    else if (msg.phase === 'error') { installProgress = null; toast(msg.message || 'Install failed', 'err'); }
  }

  function onCreated(id, mode) {
    addOpen = false;
    installProgress = null;
    activeId.set(id);
    if (mode === 'download') eulaOpen = true;
    else toast('Server added', 'ok');
  }

  async function acceptEula() {
    try { await api.post(sUrl(get(activeId), '/eula'), { accept: true }); eulaOpen = false; toast('EULA accepted — you can start now', 'ok'); }
    catch (e) { toast(e.message, 'err'); }
  }

  function onKey(e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); }
  }

  // Command palette registry (rebuilds when the view/servers change).
  $effect(() => {
    setCommands([
      { id: 'nav-dashboard', label: 'Go to Dashboard', group: 'Navigate', run: () => (view = 'dashboard') },
      { id: 'nav-console', label: 'Go to Console', group: 'Navigate', run: () => (view = 'console') },
      { id: 'add', label: 'Add a server', group: 'Server', run: () => (addOpen = true) }
    ]);
  });

  onMount(() => {
    socket = createSocket(dispatch, () => { const id = get(activeId); if (id) socket.send({ type: 'select', serverId: id }); });
    api.get('/api/servers').then((d) => { servers.set(reduceServers(d.servers)); ensureActive(); }).catch(() => {});
    return () => socket?.close();
  });
</script>

<svelte:window onkeydown={onKey} />

<div class="shell">
  <Sidebar {view} onnavigate={(v) => (view = v)} />
  <div class="main">
    <Topbar onadd={() => (addOpen = true)} onneedsEula={() => (eulaOpen = true)} />
    <div class="content">
      {#if $servers.length === 0}
        <EmptyState onadd={() => (addOpen = true)} />
      {:else}
        <Current onneedsEula={() => (eulaOpen = true)} />
      {/if}
    </div>
  </div>
</div>

<AddServerModal open={addOpen} {installProgress} oncreated={onCreated} onclose={() => (addOpen = false)} />
<EulaModal open={eulaOpen} onaccept={acceptEula} onclose={() => (eulaOpen = false)} />
<CommandPalette />
<Toast />

<style>
  .shell { display: flex; height: 100vh; }
  .main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
  .content { flex: 1; overflow-y: auto; padding: 22px; }
</style>
```

- [ ] **Step 4: Run the smoke test, verify pass**

Run: `npx vitest run web/src/App.test.js`
Expected: PASS.

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: all suites pass (format, console, palette, servers, telemetry, CommandPalette, App).

- [ ] **Step 6: Build**

Run: `npm run build`
Expected: exits 0; `web/dist` regenerated.

- [ ] **Step 7: Commit**

```bash
git add web/src/App.svelte web/src/App.test.js
git commit -m "feat(ui): wire MineEN app shell to the live WebSocket"
```

---

## Task 20: End-to-end verification against the real backend

**Files:** none (manual verification via the preview tooling).

**Interfaces:**
- Consumes: the full app + the real backend.

- [ ] **Step 1: Build and start**

Run: `npm run build && npm start`
Expected: console prints "MineEN Panel is running" with the local + network URLs.

- [ ] **Step 2: Load the panel**

Open `http://localhost:9999/` (use the preview/browser tooling). Expected: MineEN sidebar + top bar; empty state if no servers, otherwise the active server's Console.

- [ ] **Step 3: Verify the create flow**

Click "Add your first server" → "Download new" → pick a version → Create. Expected: download progress bar advances; EULA modal appears; accept it; the server appears in the switcher and Console shows `[panel]` install lines.

- [ ] **Step 4: Verify real-time + power**

Start the server. Expected: Console streams live log lines; the Dashboard tiles/sparklines move; power buttons enable/disable by state. Use a test server on a **non-default port (e.g. 25566)** — the host already runs a real Minecraft server on 25565.

- [ ] **Step 5: Verify command palette**

Press ⌘K / Ctrl-K → type "console"/"dashboard"/"add" → Enter runs the command.

- [ ] **Step 6: Check the console + network for errors**

Use the browser tooling to read console messages + network requests. Expected: no uncaught errors; `/ws` connected; `/api/*` calls 200.

- [ ] **Step 7: Remove the old vanilla frontend**

```bash
git rm -r public/index.html public/css public/js
git commit -m "chore: remove legacy ZeroCloud vanilla frontend"
```

Note: the `public/` directory is now unused by the server (Express serves `web/dist`). If `public/` is empty after this, remove it. Any remaining static assets the app needs should be imported through Vite instead.

- [ ] **Step 8: Final build + test gate**

Run: `npm run build && npm test`
Expected: both succeed. P0 foundation complete.

---

## Self-Review (completed against the spec)

- **Spec coverage (P0 slice):** Svelte+Vite compiled shell (Tasks 1,2,19) ✓ · premium dark design system (Task 3) ✓ · command palette (Tasks 10,11,19) ✓ · real-time WS data layer (Tasks 6,7,8,19) ✓ · MineEN identity, ZeroCloud removed (Tasks 1,14,20) ✓ · Console vertical (Task 15) ✓ · Dashboard/telemetry vertical (Task 16) ✓ · server create/select/power/EULA (Tasks 13,17,18,19) ✓ · mobile-responsive shell (Tasks 14,16 media queries) ✓. **Deferred to P0.2 (documented):** Files, Properties/Settings, Players, Backups, Schedules view ports. **Deferred to P1+:** onboarding wizard, provisioner, Java, optimize, sharing, content, doctor — separate plans per the design spec.
- **Placeholder scan:** no TBD/TODO; every code step contains complete code; every command has an expected result.
- **Type/name consistency:** store exports (`servers`, `reduceServers`, `activeId`, `activeState`, `ensureActive`, `telemetry`, `pushStats`, `seedTelemetry`, `resetTelemetry`, `logLines`, `setLog`, `appendLog`, `toasts`, `toast`, `paletteOpen`, `commands`, `openPalette`, `closePalette`, `setCommands`) are defined before the tasks that consume them; `api`/`sUrl`/`createSocket`/`classify`/`filterCommands`/`fmtUptime` signatures match across tasks; WS message handling in Task 19 matches the frozen contract.
