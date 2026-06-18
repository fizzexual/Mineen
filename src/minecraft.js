import { spawn, execFile } from 'node:child_process';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';

const ANSI = /\x1b\[[0-9;]*m/g;
const MAX_LOG_LINES = 500;

// One instance per managed server. `desc` is a registry descriptor:
//   { id, name, dir, jar, memoryMB, minMemoryMB, ... }
export class MinecraftServer extends EventEmitter {
  constructor(desc) {
    super();
    this.desc = desc;
    this.id = desc.id;
    this.proc = null;
    this.state = 'offline'; // offline | starting | online | stopping
    this.logs = [];
    this.players = new Set();
    this.startedAt = null;
    this.stdoutBuf = '';
  }

  update(desc) { this.desc = { ...this.desc, ...desc }; }

  // ---- status helpers -------------------------------------------------------

  get dir() { return this.desc.dir; }

  jarPath() {
    if (this.desc.jar) {
      const p = path.join(this.dir, this.desc.jar);
      if (fs.existsSync(p)) return p;
    }
    try {
      const jar = fs.readdirSync(this.dir).find((f) => f.toLowerCase().endsWith('.jar'));
      return jar ? path.join(this.dir, jar) : null;
    } catch {
      return null;
    }
  }

  isInstalled() { return Boolean(this.jarPath()); }

  eulaFile() { return path.join(this.dir, 'eula.txt'); }

  eulaAccepted() {
    try { return /eula\s*=\s*true/i.test(fs.readFileSync(this.eulaFile(), 'utf8')); }
    catch { return false; }
  }

  acceptEula() { fs.writeFileSync(this.eulaFile(), '#Accepted via MineEN Panel\neula=true\n'); }

  status() {
    return {
      id: this.id,
      state: this.state,
      players: [...this.players],
      playerCount: this.players.size,
      installed: this.isInstalled(),
      eulaAccepted: this.eulaAccepted(),
      startedAt: this.startedAt,
      pid: this.proc?.pid || null
    };
  }

  // ---- lifecycle ------------------------------------------------------------

  start() {
    if (this.state !== 'offline') throw new Error(`Server is ${this.state}`);
    const jar = this.jarPath();
    if (!jar) throw new Error('No server jar found in this folder.');
    if (!this.eulaAccepted()) throw new Error('The Minecraft EULA has not been accepted.');

    const args = [
      `-Xms${this.desc.minMemoryMB}M`,
      `-Xmx${this.desc.memoryMB}M`,
      '-jar', path.basename(jar),
      'nogui'
    ];

    this.setState('starting');
    this.pushLog(`[panel] Starting server: java ${args.join(' ')}`);

    this.proc = spawn('java', args, { cwd: this.dir });
    this.startedAt = Date.now();
    this.players.clear();
    this.emitPlayers();

    this.proc.stdout.on('data', (d) => this.onData(d));
    this.proc.stderr.on('data', (d) => this.onData(d));
    this.proc.on('error', (err) => { this.pushLog(`[panel] Failed to launch java: ${err.message}`); this.cleanup(); });
    this.proc.on('exit', (code) => {
      this.pushLog(this.state === 'stopping'
        ? '[panel] Server stopped.'
        : `[panel] Server process exited unexpectedly (code ${code}).`);
      this.cleanup();
    });
  }

  async stop() {
    if (this.state === 'offline' || !this.proc) throw new Error('Server is not running');
    this.setState('stopping');
    this.pushLog('[panel] Stopping server...');
    this.write('stop');
    const pid = this.proc.pid;
    await new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pushLog('[panel] Graceful stop timed out — force killing.');
        this.forceKill(pid);
        resolve();
      }, 25000);
      this.proc.once('exit', () => { clearTimeout(timer); resolve(); });
    });
  }

  async restart() {
    if (this.state !== 'offline') {
      await this.stop();
      await new Promise((r) => setTimeout(r, 1500));
    }
    this.start();
  }

  sendCommand(cmd) {
    if (this.state !== 'online' && this.state !== 'starting') throw new Error('Server is not running');
    const trimmed = String(cmd).trim();
    if (!trimmed) return;
    this.pushLog(`> ${trimmed}`);
    this.write(trimmed);
  }

  // ---- internals ------------------------------------------------------------

  write(line) { if (this.proc?.stdin?.writable) this.proc.stdin.write(line + '\n'); }

  forceKill(pid) {
    if (!pid) return;
    if (process.platform === 'win32') execFile('taskkill', ['/pid', String(pid), '/T', '/F'], { windowsHide: true }, () => {});
    else { try { process.kill(pid, 'SIGKILL'); } catch { /* gone */ } }
  }

  cleanup() {
    this.proc = null;
    this.startedAt = null;
    this.players.clear();
    this.emitPlayers();
    this.setState('offline');
  }

  onData(chunk) {
    this.stdoutBuf += chunk.toString('utf8');
    const lines = this.stdoutBuf.split(/\r?\n/);
    this.stdoutBuf = lines.pop() || '';
    for (const line of lines) this.handleLine(line.replace(ANSI, ''));
  }

  handleLine(line) {
    if (!line.length) return;
    this.pushLog(line);
    if (this.state === 'starting' && /: Done \(/.test(line)) this.setState('online');
    let m;
    if ((m = line.match(/: ([A-Za-z0-9_]{1,16}) joined the game/))) { this.players.add(m[1]); this.emitPlayers(); }
    else if ((m = line.match(/: ([A-Za-z0-9_]{1,16}) left the game/))) { this.players.delete(m[1]); this.emitPlayers(); }
  }

  pushLog(line) {
    this.logs.push(line);
    if (this.logs.length > MAX_LOG_LINES) this.logs.shift();
    this.emit('log', line);
  }

  setState(state) {
    if (this.state === state) return;
    this.state = state;
    this.emit('state', this.status());
  }

  emitPlayers() { this.emit('players', { players: [...this.players], playerCount: this.players.size }); }
}
