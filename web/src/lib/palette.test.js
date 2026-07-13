import { describe, it, expect } from 'vitest';
import { filterCommands } from './palette.js';

const cmds = [
  { id: 'start', label: 'Start server' },
  { id: 'stop', label: 'Stop server' },
  { id: 'files', label: 'Open Files' }
];

describe('filterCommands', () => {
  it('returns all for empty query', () => {
    expect(filterCommands(cmds, '')).toHaveLength(3);
  });
  it('matches subsequences case-insensitively', () => {
    const r = filterCommands(cmds, 'ss');
    expect(r[0].id).toBe('start'); // "Start Server" ranks for 'ss'
    expect(r.find((c) => c.id === 'files')).toBeUndefined();
  });
  it('ranks a contiguous prefix above a scattered match', () => {
    const r = filterCommands(cmds, 'sto');
    expect(r[0].id).toBe('stop');
  });
  it('ranks a more contiguous match above a scattered one when both match', () => {
    const r = filterCommands([
      { id: 'start', label: 'Start server' },
      { id: 'server', label: 'Server' }
    ], 'se');
    const ids = r.map((c) => c.id);
    expect(ids).toContain('server');
    expect(ids).toContain('start');
    expect(r[0].id).toBe('server'); // "Server" (contiguous s-e) outranks "Start server" (scattered)
  });
});
