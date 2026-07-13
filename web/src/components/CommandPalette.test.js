import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import CommandPalette from './CommandPalette.svelte';
import { paletteOpen, commands } from '../stores/palette.js';

describe('CommandPalette', () => {
  it('shows commands when open and runs the selected one on Enter', async () => {
    const run = vi.fn();
    commands.set([{ id: 'x', label: 'Do X', group: 'Test', run }]);
    paletteOpen.set(true);
    render(CommandPalette);
    expect(await screen.findByText('Do X')).toBeInTheDocument();
    await fireEvent.keyDown(window, { key: 'Enter' });
    expect(run).toHaveBeenCalledOnce();
  });
});
