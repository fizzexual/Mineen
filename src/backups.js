import fs from 'node:fs';
import path from 'node:path';
import archiver from 'archiver';
import unzipper from 'unzipper';
import { BACKUPS_DIR } from './config.js';

function dirFor(id) {
  const d = path.join(BACKUPS_DIR, id);
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  return d;
}

function stamp(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
}

export function list(id) {
  const d = dirFor(id);
  return fs.readdirSync(d)
    .filter((f) => f.endsWith('.zip'))
    .map((f) => {
      const st = fs.statSync(path.join(d, f));
      return { name: f, size: st.size, mtime: st.mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);
}

// Stream a zip of the whole server directory to disk (low memory use).
export function create(id, serverDir, ts) {
  const dest = path.join(dirFor(id), `backup-${stamp(ts)}.zip`);
  return new Promise((resolve, reject) => {
    const out = fs.createWriteStream(dest);
    const archive = archiver('zip', { zlib: { level: 6 } });
    out.on('close', () => resolve({ name: path.basename(dest), size: archive.pointer() }));
    archive.on('warning', (e) => { if (e.code !== 'ENOENT') reject(e); });
    archive.on('error', reject);
    archive.pipe(out);
    // Skip exclusively-locked files (the world lock can't be read while the
    // server is running on Windows) and partial downloads.
    archive.glob('**/*', { cwd: serverDir, dot: true, ignore: ['*.jar.part', '**/session.lock', '**/*.lock'] });
    archive.finalize();
  });
}

// Restore a backup into the server directory (overwrites existing files).
export async function restore(id, serverDir, name) {
  const src = path.join(dirFor(id), path.basename(name));
  if (!fs.existsSync(src)) throw new Error('Backup not found');
  await fs.createReadStream(src).pipe(unzipper.Extract({ path: serverDir })).promise();
}

export function remove(id, name) {
  const f = path.join(dirFor(id), path.basename(name));
  if (fs.existsSync(f)) fs.rmSync(f);
}

export function filePath(id, name) {
  const f = path.join(dirFor(id), path.basename(name));
  if (!fs.existsSync(f)) throw new Error('Backup not found');
  return f;
}
