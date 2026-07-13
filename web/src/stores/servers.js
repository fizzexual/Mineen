import { writable } from 'svelte/store';

export function reduceServers(list) {
  if (!Array.isArray(list)) return [];
  return [...list].sort((a, b) => String(a.name).localeCompare(String(b.name), undefined, { sensitivity: 'base' }));
}

export const servers = writable([]);
