import { describe, it, expect } from 'vitest';
import { fmtBytes, fmtUptime, esc } from './format.js';

describe('fmtBytes', () => {
  it('formats zero and units', () => {
    expect(fmtBytes(0)).toBe('0 B');
    expect(fmtBytes(1024)).toBe('1.0 KB');
    expect(fmtBytes(1048576)).toBe('1.0 MB');
  });
});

describe('fmtUptime', () => {
  it('returns dash for empty', () => expect(fmtUptime(0)).toBe('—'));
  it('formats seconds and minutes', () => {
    expect(fmtUptime(45000)).toBe('45s');
    expect(fmtUptime(65000)).toBe('1m 5s');
  });
});

describe('esc', () => {
  it('escapes html', () => expect(esc('<b>&"')).toBe('&lt;b&gt;&amp;&quot;'));
});
