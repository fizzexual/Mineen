import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

export const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const PUBLIC_DIR = path.join(ROOT, 'public');
export const CONFIG_FILE = path.join(ROOT, 'panel-config.json');

export const SERVERS_DIR = path.join(ROOT, 'servers');     // auto-created server folders live here
export const SERVERS_FILE = path.join(ROOT, 'servers.json'); // the registry of all managed servers
export const LEGACY_SERVER_DIR = path.join(ROOT, 'server');  // single-server layout from v1 (migrated in)

// Panel-level config (just the listen address/port).
const PANEL_DEFAULTS = { panelPort: 9999, host: '0.0.0.0' };
// Defaults applied to a newly created server.
export const SERVER_DEFAULTS = { memoryMB: 2048, minMemoryMB: 1024 };

export function ensureDirs() {
  if (!fs.existsSync(SERVERS_DIR)) fs.mkdirSync(SERVERS_DIR, { recursive: true });
}

// ---- Panel config ----------------------------------------------------------

function readRaw() {
  try {
    return { ...PANEL_DEFAULTS, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) };
  } catch {
    return { ...PANEL_DEFAULTS };
  }
}

export function loadConfig() {
  const cfg = readRaw();
  // Runtime-only env overrides — intentionally never written back to disk.
  if (process.env.PORT) cfg.panelPort = Number(process.env.PORT) || cfg.panelPort;
  if (process.env.HOST) cfg.host = process.env.HOST;
  return cfg;
}

export function saveConfig(cfg) {
  const merged = { ...readRaw(), ...cfg };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2));
  return merged;
}

// ---- Server registry -------------------------------------------------------

export function newId() {
  return crypto.randomUUID().slice(0, 8);
}

// Find a likely server jar inside a folder (for "use existing folder").
export function detectJar(dir) {
  let jars;
  try { jars = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.jar')); }
  catch { return null; }
  if (!jars.length) return null;
  const preferred = jars.find((j) => /paper|purpur|spigot|bukkit|fabric|forge|server|vanilla|mohist|pufferfish|folia/i.test(j));
  if (preferred) return preferred;
  return jars
    .map((j) => ({ j, size: (() => { try { return fs.statSync(path.join(dir, j)).size; } catch { return 0; } })() }))
    .sort((a, b) => b.size - a.size)[0].j;
}

export function detectVersion(jar) {
  const m = jar && jar.match(/(\d+\.\d+(?:\.\d+)?)/);
  return m ? m[1] : null;
}

// A folder "looks like a server" if it has a jar or a server.properties.
export function looksLikeServer(dir) {
  try {
    const files = fs.readdirSync(dir);
    return files.some((f) => f.toLowerCase().endsWith('.jar')) || files.includes('server.properties');
  } catch {
    return false;
  }
}

function migrate() {
  // First run: adopt the old single-server `server/` folder if it has a jar.
  const servers = [];
  if (fs.existsSync(LEGACY_SERVER_DIR) && detectJar(LEGACY_SERVER_DIR)) {
    const old = readRaw();
    servers.push({
      id: newId(),
      name: old.serverName || 'My Server',
      type: 'paper',
      version: old.version || detectVersion(detectJar(LEGACY_SERVER_DIR)),
      jar: old.jar || detectJar(LEGACY_SERVER_DIR),
      dir: LEGACY_SERVER_DIR,
      memoryMB: old.memoryMB || SERVER_DEFAULTS.memoryMB,
      minMemoryMB: old.minMemoryMB || SERVER_DEFAULTS.minMemoryMB,
      createdAt: Date.now()
    });
  }
  return servers;
}

export function loadServers() {
  try {
    const data = JSON.parse(fs.readFileSync(SERVERS_FILE, 'utf8'));
    return Array.isArray(data.servers) ? data.servers : [];
  } catch {
    const migrated = migrate();
    saveServers(migrated);
    return migrated;
  }
}

export function saveServers(servers) {
  fs.writeFileSync(SERVERS_FILE, JSON.stringify({ servers }, null, 2));
  return servers;
}
