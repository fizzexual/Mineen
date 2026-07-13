import { writable } from 'svelte/store';

export const toasts = writable([]);
let seq = 0;

export function toast(msg, type = '') {
  const id = ++seq;
  toasts.update((t) => [...t, { id, msg, type }]);
  setTimeout(() => toasts.update((t) => t.filter((x) => x.id !== id)), 3200);
}
