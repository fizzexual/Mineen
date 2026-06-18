import fs from 'node:fs';
import path from 'node:path';

const file = (baseDir) => path.join(baseDir, 'server.properties');

const DEFAULT_PROPS = {
  'motd': 'A Minecraft Server',
  'server-port': '25565',
  'gamemode': 'survival',
  'difficulty': 'easy',
  'max-players': '20',
  'online-mode': 'true',
  'pvp': 'true',
  'spawn-protection': '16',
  'view-distance': '10',
  'simulation-distance': '10',
  'allow-nether': 'true',
  'allow-flight': 'false',
  'white-list': 'false',
  'enable-command-block': 'false',
  'level-name': 'world',
  'level-seed': '',
  'hardcore': 'false',
  'force-gamemode': 'false',
  'spawn-monsters': 'true',
  'spawn-animals': 'true',
  'enable-rcon': 'false'
};

const defaults = () => Object.entries(DEFAULT_PROPS).map(([key, value]) => ({ key, value }));

export function read(baseDir) {
  let text;
  try { text = fs.readFileSync(file(baseDir), 'utf8'); } catch { return defaults(); }
  const entries = [];
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    entries.push({ key: t.slice(0, eq), value: t.slice(eq + 1) });
  }
  return entries.length ? entries : defaults();
}

export function get(baseDir, key, fallback = null) {
  const found = read(baseDir).find((e) => e.key === key);
  return found ? found.value : fallback;
}

export function write(baseDir, entries) {
  const list = Array.isArray(entries) ? entries : Object.entries(entries).map(([key, value]) => ({ key, value: String(value) }));
  const header = '#Minecraft server properties\n#Edited via MineEN Panel\n';
  const body = list.filter((e) => e.key && e.key.trim()).map((e) => `${e.key}=${e.value ?? ''}`).join('\n');
  fs.writeFileSync(file(baseDir), header + body + '\n');
}

export function ensureDefault(baseDir) {
  if (!fs.existsSync(file(baseDir))) write(baseDir, defaults());
}
