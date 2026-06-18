import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import net from 'node:net';
import { execFile } from 'node:child_process';
import express from 'express';
import multer from 'multer';
import { WebSocketServer } from 'ws';

import { PUBLIC_DIR, SERVERS_DIR, ensureDirs, loadConfig, looksLikeServer, detectJar } from './src/config.js';
import { manager } from './src/manager.js';
import * as paper from './src/paper.js';
import * as properties from './src/properties.js';
import * as files from './src/files.js';
import * as backups from './src/backups.js';
import { processStats, storageBytes } from './src/stats.js';

const isWin = process.platform === 'win32';

ensureDirs();
manager.init();

const app = express();
app.use(express.json({ limit: '20mb' }));
app.use(express.static(PUBLIC_DIR));

const httpServer = http.createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function lanIp() {
  for (const list of Object.values(os.networkInterfaces())) {
    for (const i of list || []) if (i.family === 'IPv4' && !i.internal) return i.address;
  }
  return '127.0.0.1';
}

function drives() {
  const out = [];
  for (const c of 'CDEFGHIJKLMNOPQRSTUVWXYZAB') {
    try { fs.accessSync(`${c}:\\`); out.push(`${c}:\\`); } catch { /* no drive */ }
  }
  return out;
}

function versionLabel(d) {
  if (d.type === 'paper') return d.version ? `PaperMC ${d.version}` : 'PaperMC';
  return d.version ? `Minecraft ${d.version}` : 'Custom server';
}

function buildState(id) {
  const inst = manager.get(id);
  const d = inst.desc;
  const st = inst.status();
  const port = Number(properties.get(d.dir, 'server-port', 25565)) || 25565;
  return {
    ...st,
    name: d.name,
    type: d.type,
    version: d.version,
    versionLabel: versionLabel(d),
    dir: d.dir,
    memoryMB: d.memoryMB,
    minMemoryMB: d.minMemoryMB,
    maxPlayers: Number(properties.get(d.dir, 'max-players', '20')) || 20,
    motd: properties.get(d.dir, 'motd', ''),
    serverPort: port,
    address: `localhost:${port}`,
    lanAddress: `${lanIp()}:${port}`,
    uptimeMs: st.startedAt ? Date.now() - st.startedAt : 0
  };
}

function listServers() {
  return manager.descriptors().map((d) => {
    const st = manager.get(d.id).status();
    return {
      id: d.id, name: d.name, type: d.type, version: d.version,
      versionLabel: versionLabel(d), state: st.state,
      installed: st.installed, playerCount: st.playerCount, dir: d.dir
    };
  });
}

function broadcast(obj) {
  const msg = JSON.stringify(obj);
  for (const client of wss.clients) if (client.readyState === 1) client.send(msg);
}
function broadcastServers() { broadcast({ type: 'servers', servers: listServers() }); }

// Forward per-server events (tagged with serverId) to every panel.
manager.on('event', (e) => {
  if (e.type === 'log') broadcast({ type: 'log', serverId: e.serverId, line: e.line });
  else if (e.type === 'players') broadcast({ type: 'players', serverId: e.serverId, players: e.players, playerCount: e.playerCount });
  else if (e.type === 'state') { broadcast({ type: 'state', serverId: e.serverId, state: buildState(e.serverId) }); broadcastServers(); }
});

// ---------------------------------------------------------------------------
// WebSocket: send the sidebar list; replay a server's console on demand
// ---------------------------------------------------------------------------

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'servers', servers: listServers() }));
  ws.on('message', (raw) => {
    try {
      const m = JSON.parse(raw);
      if (m.type === 'select' && manager.has(m.serverId)) {
        const inst = manager.get(m.serverId);
        ws.send(JSON.stringify({ type: 'history', serverId: m.serverId, lines: inst.logs, telemetry: inst.history }));
        ws.send(JSON.stringify({ type: 'state', serverId: m.serverId, state: buildState(m.serverId) }));
      }
    } catch { /* ignore */ }
  });
});

// TCP connect time to a running server's port, used as a "latency" readout.
function pingLatency(port) {
  return new Promise((resolve) => {
    const start = performance.now();
    const sock = net.connect({ host: '127.0.0.1', port });
    const finish = (v) => { sock.destroy(); resolve(v); };
    sock.on('connect', () => finish(Math.round(performance.now() - start)));
    sock.on('error', () => finish(null));
    sock.setTimeout(2000, () => finish(null));
  });
}

// Live resource stats + health for every running server (drives the graphs).
setInterval(async () => {
  if (!wss.clients.size) return;
  for (const inst of manager.instances.values()) {
    if (inst.state === 'offline') continue;
    const st = inst.status();
    const { cpu, memBytes } = await processStats(st.pid);
    const memUsedMB = Math.round(memBytes / 1048576);
    inst.pushTelemetry(cpu, memUsedMB);
    const port = Number(properties.get(inst.dir, 'server-port', 25565)) || 25565;
    const latency = st.state === 'online' ? await pingLatency(port) : null;
    broadcast({
      type: 'stats', serverId: inst.id, cpu,
      memUsedMB, memMaxMB: inst.desc.memoryMB,
      storageMB: Math.round(storageBytes(inst.dir) / 1048576),
      tps: st.tps, latency,
      players: st.players, playerCount: st.playerCount,
      maxPlayers: Number(properties.get(inst.dir, 'max-players', '20')) || 20,
      uptimeMs: st.startedAt ? Date.now() - st.startedAt : 0
    });
  }
}, 2000);

// Poll TPS from each online server (response is captured silently, not logged).
setInterval(() => {
  for (const inst of manager.instances.values()) inst.sendInternal('tps');
}, 5000);

// ---------------------------------------------------------------------------
// Generic responders + per-server resolver
// ---------------------------------------------------------------------------

const ok = (res, data = {}) => res.json({ ok: true, ...data });
const fail = (res, err, code = 400) => res.status(code).json({ ok: false, error: err.message || String(err) });
const dirOf = (req) => manager.get(req.params.id).dir;

// ---- Server registry -------------------------------------------------------

app.get('/api/servers', (req, res) => ok(res, { servers: listServers() }));

app.post('/api/servers', async (req, res) => {
  const { mode, name, version, path: folder } = req.body || {};
  try {
    if (mode === 'existing') {
      const inst = manager.addExisting({ name, dir: folder });
      broadcastServers();
      return ok(res, { id: inst.id, state: buildState(inst.id) });
    }
    if (mode === 'download') {
      if (!version) throw new Error('Pick a Minecraft version');
      const inst = manager.createForDownload({ name });
      broadcastServers();
      broadcast({ type: 'log', serverId: inst.id, line: `[panel] Downloading PaperMC ${version}...` });
      let last = -1;
      try {
        const result = await paper.downloadJar(version, inst.dir, (r, t) => {
          const pct = t ? Math.floor((r / t) * 100) : 0;
          if (pct !== last) { last = pct; broadcast({ type: 'install', serverId: inst.id, phase: 'downloading', percent: pct }); }
        });
        manager.finalizeDownload(inst.id, { version: result.version, jar: result.jar });
        properties.ensureDefault(inst.dir);
        broadcast({ type: 'log', serverId: inst.id, line: `[panel] Installed ${result.jar} (build ${result.build}).` });
        broadcast({ type: 'install', serverId: inst.id, phase: 'done' });
        broadcast({ type: 'state', serverId: inst.id, state: buildState(inst.id) });
        broadcastServers();
        return ok(res, { id: inst.id });
      } catch (e) {
        await manager.remove(inst.id, true); // roll back the half-made server
        broadcast({ type: 'install', serverId: inst.id, phase: 'error', message: e.message });
        broadcastServers();
        return fail(res, e, 502);
      }
    }
    throw new Error('Unknown mode');
  } catch (e) { fail(res, e); }
});

app.delete('/api/servers/:id', async (req, res) => {
  try {
    await manager.remove(req.params.id, req.query.deleteFiles === 'true');
    broadcastServers();
    ok(res);
  } catch (e) { fail(res, e); }
});

// ---- Native OS folder picker (opens a real desktop dialog) -----------------

app.post('/api/pick-folder', (req, res) => {
  const done = (out) => {
    const p = (out || '').trim();
    if (!p) return ok(res, { path: null, cancelled: true });
    ok(res, { path: p, isServer: looksLikeServer(p), jar: detectJar(p) });
  };
  const opts = { windowsHide: true, timeout: 180000 };

  if (isWin) {
    // Show an invisible, top-most owner form and activate it first, so the
    // folder dialog reliably appears in the FOREGROUND instead of behind the
    // browser (the classic "nothing happens" symptom).
    const ps = [
      "$ErrorActionPreference='Stop'",
      'Add-Type -AssemblyName System.Windows.Forms',
      'Add-Type -AssemblyName System.Drawing',
      '$owner = New-Object System.Windows.Forms.Form',
      "$owner.StartPosition = 'CenterScreen'",
      '$owner.Size = New-Object System.Drawing.Size(1,1)',
      '$owner.Opacity = 0',
      '$owner.ShowInTaskbar = $false',
      '$owner.TopMost = $true',
      '$owner.Show(); $owner.Activate(); $owner.BringToFront()',
      '[System.Windows.Forms.Application]::DoEvents()',
      '$dlg = New-Object System.Windows.Forms.FolderBrowserDialog',
      "$dlg.Description = 'Select your Minecraft server folder'",
      '$dlg.ShowNewFolderButton = $false',
      '$res = $dlg.ShowDialog($owner)',
      '$owner.Close()',
      'if ($res -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::Out.Write($dlg.SelectedPath) }'
    ].join('\n');
    return execFile('powershell', ['-NoProfile', '-STA', '-WindowStyle', 'Hidden', '-Command', ps], opts, (err, stdout) => {
      if (err && !stdout) return fail(res, new Error('Could not open the folder picker'));
      done(stdout);
    });
  }
  if (process.platform === 'darwin') {
    return execFile('osascript', ['-e', 'POSIX path of (choose folder with prompt "Select your Minecraft server folder")'], opts,
      (err, stdout) => (err ? ok(res, { path: null, cancelled: true }) : done(stdout)));
  }
  return execFile('zenity', ['--file-selection', '--directory', '--title=Select your Minecraft server folder'], opts,
    (err, stdout) => { if (err && !stdout) return fail(res, new Error('No native folder picker available (install zenity).')); done(stdout); });
});

// ---- Filesystem inspection (validates a picked/typed path) -----------------

app.get('/api/browse', (req, res) => {
  try {
    let p = req.query.path || '';
    if (!p) {
      if (isWin) return ok(res, { path: '', parent: null, drives: drives(), dirs: [], isServer: false });
      p = '/';
    }
    const abs = path.resolve(p);
    const dirents = fs.readdirSync(abs, { withFileTypes: true });
    const dirs = dirents.filter((d) => d.isDirectory()).map((d) => d.name)
      .filter((n) => !n.startsWith('$')).sort((a, b) => a.localeCompare(b));
    const parentAbs = path.dirname(abs);
    const parent = parentAbs === abs ? '' : parentAbs; // at a drive/fs root -> show drives
    ok(res, { path: abs, parent, dirs, isServer: looksLikeServer(abs), jar: detectJar(abs) });
  } catch (e) { fail(res, e); }
});

// ---- Paper versions --------------------------------------------------------

let versionCache = { at: 0, list: [] };
app.get('/api/versions', async (req, res) => {
  try {
    if (Date.now() - versionCache.at > 3600_000) versionCache = { at: Date.now(), list: await paper.listVersions() };
    ok(res, { versions: versionCache.list });
  } catch (e) { fail(res, e, 502); }
});

// ---- Per-server: state / power / command / eula / settings -----------------

app.get('/api/servers/:id/state', (req, res) => {
  try { ok(res, { state: buildState(req.params.id) }); } catch (e) { fail(res, e, 404); }
});

app.get('/api/servers/:id/logs', (req, res) => {
  try { ok(res, { lines: manager.get(req.params.id).logs }); } catch (e) { fail(res, e, 404); }
});

app.post('/api/servers/:id/power', async (req, res) => {
  try {
    const inst = manager.get(req.params.id);
    const { action } = req.body || {};
    if (action === 'start') inst.start();
    else if (action === 'stop') await inst.stop();
    else if (action === 'restart') await inst.restart();
    else if (action === 'kill') inst.kill();
    else throw new Error('Unknown action');
    ok(res, { state: buildState(inst.id) });
  } catch (e) { fail(res, e); }
});

app.post('/api/servers/:id/command', (req, res) => {
  try { manager.get(req.params.id).sendCommand(req.body?.command || ''); ok(res); } catch (e) { fail(res, e); }
});

app.post('/api/servers/:id/eula', (req, res) => {
  try {
    if (!req.body?.accept) throw new Error('You must accept the Minecraft EULA to run a server');
    manager.get(req.params.id).acceptEula();
    broadcast({ type: 'state', serverId: req.params.id, state: buildState(req.params.id) });
    ok(res, { state: buildState(req.params.id) });
  } catch (e) { fail(res, e); }
});

app.get('/api/servers/:id/settings', (req, res) => {
  try { const d = manager.get(req.params.id).desc; ok(res, { settings: { name: d.name, memoryMB: d.memoryMB, minMemoryMB: d.minMemoryMB, autoRestart: Boolean(d.autoRestart) } }); }
  catch (e) { fail(res, e); }
});

app.post('/api/servers/:id/settings', (req, res) => {
  try {
    const { name, memoryMB, minMemoryMB, autoRestart } = req.body || {};
    const patch = {};
    if (typeof name === 'string' && name.trim()) patch.name = name.trim().slice(0, 40);
    if (Number.isFinite(memoryMB)) patch.memoryMB = Math.max(512, Math.floor(memoryMB));
    if (Number.isFinite(minMemoryMB)) patch.minMemoryMB = Math.max(256, Math.floor(minMemoryMB));
    if (typeof autoRestart === 'boolean') patch.autoRestart = autoRestart;
    manager.update(req.params.id, patch);
    broadcast({ type: 'state', serverId: req.params.id, state: buildState(req.params.id) });
    broadcastServers();
    ok(res);
  } catch (e) { fail(res, e); }
});

// ---- Per-server: server.properties -----------------------------------------

app.get('/api/servers/:id/properties', (req, res) => {
  try { ok(res, { entries: properties.read(dirOf(req)) }); } catch (e) { fail(res, e); }
});

app.post('/api/servers/:id/properties', (req, res) => {
  try {
    properties.write(dirOf(req), req.body?.entries || []);
    broadcast({ type: 'state', serverId: req.params.id, state: buildState(req.params.id) });
    ok(res);
  } catch (e) { fail(res, e); }
});

// ---- Per-server: file manager ----------------------------------------------

app.get('/api/servers/:id/files', async (req, res) => {
  try { ok(res, await files.list(dirOf(req), req.query.path || '')); } catch (e) { fail(res, e); }
});
app.get('/api/servers/:id/files/content', async (req, res) => {
  try { ok(res, { content: await files.readFile(dirOf(req), req.query.path) }); } catch (e) { fail(res, e); }
});
app.post('/api/servers/:id/files/content', async (req, res) => {
  try { await files.writeFile(dirOf(req), req.body.path, req.body.content); ok(res); } catch (e) { fail(res, e); }
});
app.post('/api/servers/:id/files/mkdir', async (req, res) => {
  try { await files.mkdir(dirOf(req), req.body.path); ok(res); } catch (e) { fail(res, e); }
});
app.post('/api/servers/:id/files/rename', async (req, res) => {
  try { await files.rename(dirOf(req), req.body.path, req.body.newName); ok(res); } catch (e) { fail(res, e); }
});
app.delete('/api/servers/:id/files', async (req, res) => {
  try { await files.remove(dirOf(req), req.query.path); ok(res); } catch (e) { fail(res, e); }
});
app.get('/api/servers/:id/files/download', (req, res) => {
  try { res.download(files.downloadPath(dirOf(req), req.query.path)); } catch (e) { fail(res, e); }
});

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      try { cb(null, files.safeResolve(manager.get(req.params.id).dir, req.query.path || '')); }
      catch (e) { cb(e, ''); }
    },
    filename: (req, file, cb) => cb(null, file.originalname)
  })
});
app.post('/api/servers/:id/files/upload', upload.array('files'), (req, res) =>
  ok(res, { uploaded: (req.files || []).map((f) => f.originalname) }));

// ---- Per-server: player moderation -----------------------------------------

const PLAYER_CMDS = {
  kick: (p) => `kick ${p}`, ban: (p) => `ban ${p}`, pardon: (p) => `pardon ${p}`,
  op: (p) => `op ${p}`, deop: (p) => `deop ${p}`
};
app.post('/api/servers/:id/players/:action', (req, res) => {
  try {
    const fn = PLAYER_CMDS[req.params.action];
    const player = (req.body?.player || '').trim();
    if (!fn) throw new Error('Unknown action');
    if (!/^[A-Za-z0-9_]{1,16}$/.test(player)) throw new Error('Invalid player name');
    manager.get(req.params.id).sendCommand(fn(player));
    ok(res);
  } catch (e) { fail(res, e); }
});

// ---- Per-server: backups ---------------------------------------------------

app.get('/api/servers/:id/backups', (req, res) => {
  try { ok(res, { backups: backups.list(req.params.id) }); } catch (e) { fail(res, e); }
});

app.post('/api/servers/:id/backups', async (req, res) => {
  try {
    const inst = manager.get(req.params.id);
    if (inst.state === 'online') { inst.sendInternal('save-all flush'); await new Promise((r) => setTimeout(r, 1500)); }
    broadcast({ type: 'log', serverId: inst.id, line: '[panel] Creating backup…' });
    const result = await backups.create(inst.id, inst.dir, Date.now());
    broadcast({ type: 'log', serverId: inst.id, line: `[panel] Backup created: ${result.name} (${Math.round(result.size / 1048576)} MB)` });
    ok(res, { backup: result });
  } catch (e) { fail(res, e); }
});

app.post('/api/servers/:id/backups/restore', async (req, res) => {
  try {
    const inst = manager.get(req.params.id);
    if (inst.state !== 'offline') throw new Error('Stop the server before restoring a backup');
    await backups.restore(inst.id, inst.dir, req.body?.name || '');
    broadcast({ type: 'log', serverId: inst.id, line: `[panel] Restored backup: ${req.body?.name}` });
    broadcast({ type: 'state', serverId: inst.id, state: buildState(inst.id) });
    ok(res);
  } catch (e) { fail(res, e); }
});

app.delete('/api/servers/:id/backups', (req, res) => {
  try { backups.remove(req.params.id, req.query.name); ok(res); } catch (e) { fail(res, e); }
});

app.get('/api/servers/:id/backups/download', (req, res) => {
  try { res.download(backups.filePath(req.params.id, req.query.name)); } catch (e) { fail(res, e); }
});

// ---------------------------------------------------------------------------

const cfg = loadConfig();
httpServer.listen(cfg.panelPort, cfg.host, () => {
  console.log('\n  MineEN Panel is running.');
  console.log(`  Local:   http://localhost:${cfg.panelPort}`);
  console.log(`  Network: http://${lanIp()}:${cfg.panelPort}\n`);
});
