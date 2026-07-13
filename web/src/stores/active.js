import { writable, derived, get } from 'svelte/store';
import { servers } from './servers.js';

export const activeId = writable(null);
export const activeState = writable({});

export const activeServer = derived([servers, activeId], ([$servers, $id]) =>
  $servers.find((s) => s.id === $id) || null);

// Ensure some server is active once the list is known.
export function ensureActive() {
  const list = get(servers);
  const id = get(activeId);
  if (!list.length) { activeId.set(null); return; }
  if (!id || !list.find((s) => s.id === id)) activeId.set(list[0].id);
}
