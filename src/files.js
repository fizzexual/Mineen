import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

// Resolve a user-supplied relative path against a server's base dir and refuse
// anything that tries to escape it (path traversal protection).
export function safeResolve(baseDir, relPath = '') {
  const clean = String(relPath).replace(/\\/g, '/').replace(/^\/+/, '');
  const abs = path.resolve(baseDir, clean);
  const rel = path.relative(baseDir, abs);
  if (rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('Path escapes the server directory');
  return abs;
}

const TEXT_EXT = new Set([
  '.txt', '.properties', '.yml', '.yaml', '.json', '.json5', '.conf', '.cfg',
  '.toml', '.ini', '.log', '.md', '.sh', '.bat', '.mcmeta', '.lang', '.csv', '.xml', '.html', '.css', '.js'
]);

export function isTextFile(name) { return TEXT_EXT.has(path.extname(name).toLowerCase()); }

export async function list(baseDir, relPath = '') {
  const abs = safeResolve(baseDir, relPath);
  const dirents = await fsp.readdir(abs, { withFileTypes: true });
  const items = await Promise.all(dirents.map(async (d) => {
    const full = path.join(abs, d.name);
    let size = 0, mtime = 0;
    try { const st = await fsp.stat(full); size = st.size; mtime = st.mtimeMs; } catch { /* dangling */ }
    return { name: d.name, dir: d.isDirectory(), size, mtime, editable: !d.isDirectory() && isTextFile(d.name) };
  }));
  items.sort((a, b) => (a.dir === b.dir ? a.name.localeCompare(b.name) : a.dir ? -1 : 1));
  return { path: path.relative(baseDir, abs).replace(/\\/g, '/'), items };
}

export async function readFile(baseDir, relPath) {
  return fsp.readFile(safeResolve(baseDir, relPath), 'utf8');
}

export async function writeFile(baseDir, relPath, content) {
  const abs = safeResolve(baseDir, relPath);
  await fsp.mkdir(path.dirname(abs), { recursive: true });
  await fsp.writeFile(abs, content ?? '');
}

export async function mkdir(baseDir, relPath) {
  await fsp.mkdir(safeResolve(baseDir, relPath), { recursive: true });
}

export async function remove(baseDir, relPath) {
  const abs = safeResolve(baseDir, relPath);
  if (abs === path.resolve(baseDir)) throw new Error('Refusing to delete the server root');
  await fsp.rm(abs, { recursive: true, force: true });
}

export async function rename(baseDir, relPath, newName) {
  const abs = safeResolve(baseDir, relPath);
  if (/[\\/]/.test(newName)) throw new Error('New name must not contain path separators');
  await fsp.rename(abs, path.join(path.dirname(abs), newName));
}

export function downloadPath(baseDir, relPath) {
  const abs = safeResolve(baseDir, relPath);
  if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) throw new Error('Not a downloadable file');
  return abs;
}
