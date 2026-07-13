import { writable } from 'svelte/store';

export const paletteOpen = writable(false);
export const commands = writable([]);

export function openPalette() { paletteOpen.set(true); }
export function closePalette() { paletteOpen.set(false); }
export function setCommands(list) { commands.set(list); }
