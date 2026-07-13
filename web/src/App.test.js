import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import App from './App.svelte';

beforeEach(() => {
  // Minimal WebSocket stub so App mounts without a real server.
  global.WebSocket = class {
    constructor() { this.readyState = 1; setTimeout(() => this.onopen && this.onopen(), 0); }
    send() {}
    close() {}
  };
  global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, servers: [] }) }));
});

describe('App', () => {
  it('renders the MineEN brand and the empty state with no servers', async () => {
    render(App);
    expect(await screen.findByText('MineEN')).toBeInTheDocument();
    expect(await screen.findByText('No servers yet')).toBeInTheDocument();
  });
});
