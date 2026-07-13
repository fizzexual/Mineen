import { describe, it, expect } from 'vitest';
import { classify } from './console.js';

describe('classify', () => {
  it('tags panel lines', () => {
    expect(classify('[panel] Downloading…')).toMatchObject({ kind: 'panel' });
  });
  it('tags echoed commands', () => {
    expect(classify('> say hi')).toMatchObject({ kind: 'command' });
  });
  it('parses a vanilla INFO line', () => {
    expect(classify('[12:00:01] [Server thread/INFO]: Done')).toMatchObject({
      kind: 'log', level: 'info', time: '12:00:01', msg: 'Done'
    });
  });
  it('maps WARN and ERROR levels', () => {
    expect(classify('[12:00:02] [Server thread/WARN]: careful').level).toBe('warn');
    expect(classify('[12:00:03] [Server thread/ERROR]: boom').level).toBe('error');
  });
  it('falls back to a raw log line', () => {
    expect(classify('just text')).toMatchObject({ kind: 'log', level: 'info', msg: 'just text' });
  });
});
