import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { telemetry, pushStats, resetTelemetry } from './telemetry.js';

beforeEach(() => resetTelemetry());

describe('pushStats', () => {
  it('appends cpu/mem samples and stores last', () => {
    pushStats({ cpu: 20, memUsedMB: 512, memMaxMB: 2048, tps: 20 });
    const t = get(telemetry);
    expect(t.cpu).toEqual([20]);
    expect(t.mem).toEqual([512]);
    expect(t.memMax).toBe(2048);
    expect(t.last.tps).toBe(20);
  });
  it('caps history at 60 samples', () => {
    for (let i = 0; i < 70; i++) pushStats({ cpu: i, memUsedMB: i, memMaxMB: 2048 });
    expect(get(telemetry).cpu.length).toBe(60);
    expect(get(telemetry).cpu[0]).toBe(10);
  });
});
