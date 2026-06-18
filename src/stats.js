import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';

const isWin = process.platform === 'win32';
const NUM_CORES = os.cpus().length || 1;
const cpuSamples = new Map(); // pid -> { cpuMs, t }

function run(cmd, args) {
  return new Promise((resolve) => {
    execFile(cmd, args, { windowsHide: true, timeout: 5000 }, (err, stdout) => resolve(err ? null : stdout));
  });
}

// Per-process CPU% and resident memory in bytes. Returns zeros if unavailable.
export async function processStats(pid) {
  if (!pid) return { cpu: 0, memBytes: 0 };

  if (isWin) {
    const out = await run('powershell', [
      '-NoProfile', '-NonInteractive', '-Command',
      `$p = Get-Process -Id ${pid} -ErrorAction SilentlyContinue; if ($p) { '{0} {1}' -f $p.WorkingSet64, $p.TotalProcessorTime.TotalMilliseconds }`
    ]);
    if (!out || !out.trim()) { cpuSamples.delete(pid); return { cpu: 0, memBytes: 0 }; }
    const [memStr, cpuMsStr] = out.trim().split(/\s+/);
    const memBytes = Number(memStr) || 0;
    const cpuMs = Number(cpuMsStr) || 0;
    const now = performance.now();
    let cpu = 0;
    const prev = cpuSamples.get(pid);
    if (prev) {
      const dWall = now - prev.t, dCpu = cpuMs - prev.cpuMs;
      if (dWall > 0) cpu = Math.max(0, Math.min(100, (dCpu / dWall) / NUM_CORES * 100));
    }
    cpuSamples.set(pid, { cpuMs, t: now });
    return { cpu: Math.round(cpu * 10) / 10, memBytes };
  }

  const out = await run('ps', ['-p', String(pid), '-o', 'rss=,%cpu=']);
  if (!out || !out.trim()) return { cpu: 0, memBytes: 0 };
  const [rssKb, pcpu] = out.trim().split(/\s+/);
  return { cpu: Math.round((Number(pcpu) || 0) * 10) / 10, memBytes: (Number(rssKb) || 0) * 1024 };
}

function dirSize(dir) {
  let total = 0, entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return 0; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    try { total += e.isDirectory() ? dirSize(full) : fs.statSync(full).size; } catch { /* vanished */ }
  }
  return total;
}

// Storage scan can be slow on big worlds, so cache per-directory for 20s.
const storageCache = new Map(); // dir -> { bytes, at }
export function storageBytes(dir) {
  const now = performance.now();
  const cached = storageCache.get(dir);
  if (!cached || now - cached.at > 20000) {
    const bytes = dirSize(dir);
    storageCache.set(dir, { bytes, at: now });
    return bytes;
  }
  return cached.bytes;
}

export function systemMemory() { return { total: os.totalmem(), free: os.freemem() }; }
