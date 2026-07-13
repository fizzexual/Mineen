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
