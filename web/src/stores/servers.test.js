import { describe, it, expect } from 'vitest';
import { reduceServers } from './servers.js';

describe('reduceServers', () => {
  it('sorts by name, case-insensitive', () => {
    const out = reduceServers([
      { id: '2', name: 'zeta' }, { id: '1', name: 'Alpha' }
    ]);
    expect(out.map((s) => s.id)).toEqual(['1', '2']);
  });
  it('returns [] for non-arrays', () => {
    expect(reduceServers(undefined)).toEqual([]);
  });
});
