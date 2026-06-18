import path from 'node:path';
import fs from 'node:fs';
import { EventEmitter } from 'node:events';
import { MinecraftServer } from './minecraft.js';
import {
  SERVERS_DIR, SERVER_DEFAULTS, loadServers, saveServers,
  newId, detectJar, detectVersion, looksLikeServer
} from './config.js';

class Manager extends EventEmitter {
  constructor() {
    super();
    this.instances = new Map(); // id -> MinecraftServer
  }

  init() {
    for (const desc of loadServers()) this._add(desc);
  }

  _add(desc) {
    const inst = new MinecraftServer(desc);
    inst.on('log', (line) => this.emit('event', { serverId: desc.id, type: 'log', line }));
    inst.on('state', () => this.emit('event', { serverId: desc.id, type: 'state' }));
    inst.on('players', (p) => this.emit('event', { serverId: desc.id, type: 'players', ...p }));
    this.instances.set(desc.id, inst);
    return inst;
  }

  has(id) { return this.instances.has(id); }

  get(id) {
    const inst = this.instances.get(id);
    if (!inst) throw new Error('Server not found');
    return inst;
  }

  descriptors() { return [...this.instances.values()].map((i) => i.desc); }
  persist() { saveServers(this.descriptors()); }

  // Register a server folder the user already has on disk.
  addExisting({ name, dir }) {
    const abs = path.resolve(dir);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) throw new Error('That folder does not exist');
    if (this.descriptors().some((d) => path.resolve(d.dir) === abs)) throw new Error('That folder is already added');
    const jar = detectJar(abs);
    if (!jar && !looksLikeServer(abs)) throw new Error('No Minecraft server detected in that folder');
    const inst = this._add({
      id: newId(),
      name: name?.trim() || path.basename(abs) || 'Server',
      type: jar && /paper/i.test(jar) ? 'paper' : 'custom',
      version: detectVersion(jar),
      jar: jar || null,
      dir: abs,
      memoryMB: SERVER_DEFAULTS.memoryMB,
      minMemoryMB: SERVER_DEFAULTS.minMemoryMB,
      createdAt: Date.now()
    });
    this.persist();
    return inst;
  }

  // Create an empty record for a Paper download; caller fills the jar in afterwards.
  createForDownload({ name }) {
    const id = newId();
    const dir = path.join(SERVERS_DIR, id);
    fs.mkdirSync(dir, { recursive: true });
    const inst = this._add({
      id, name: name?.trim() || 'New Server', type: 'paper',
      version: null, jar: null, dir,
      memoryMB: SERVER_DEFAULTS.memoryMB, minMemoryMB: SERVER_DEFAULTS.minMemoryMB,
      createdAt: Date.now()
    });
    this.persist();
    return inst;
  }

  finalizeDownload(id, { version, jar }) {
    this.get(id).update({ version, jar });
    this.persist();
    return this.get(id);
  }

  update(id, patch) {
    this.get(id).update(patch);
    this.persist();
    return this.get(id);
  }

  async remove(id, deleteFiles = false) {
    const inst = this.get(id);
    if (inst.state !== 'offline') await inst.stop();
    // Only ever delete files we created ourselves (inside SERVERS_DIR), never a
    // user's pre-existing external folder.
    if (deleteFiles && path.resolve(inst.dir).startsWith(path.resolve(SERVERS_DIR))) {
      fs.rmSync(inst.dir, { recursive: true, force: true });
    }
    this.instances.delete(id);
    this.persist();
  }
}

export const manager = new Manager();
