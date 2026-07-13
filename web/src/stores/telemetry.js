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
