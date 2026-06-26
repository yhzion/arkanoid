import { describe, it, expect } from 'vitest';
import { FixedStepper } from './fixedStep';
import { TICK_MS, MAX_TICKS_PER_FRAME } from './constants';

describe('FixedStepper (§7.2 / §30.6)', () => {
  it('runs one tick per TICK_MS of accumulated time', () => {
    const ticks: number[] = [];
    const s = new FixedStepper({ onTick: (t) => ticks.push(t) });
    s.advance(TICK_MS);
    s.advance(TICK_MS);
    expect(ticks).toEqual([0, 1]);
  });

  it('batches multiple ticks when delta exceeds several steps', () => {
    const ticks: number[] = [];
    const s = new FixedStepper({ onTick: (t) => ticks.push(t) });
    s.advance(TICK_MS * 3);
    expect(ticks).toEqual([0, 1, 2]);
  });

  it('enforces the per-frame cap (max 5 ticks)', () => {
    const ticks: number[] = [];
    const s = new FixedStepper({ onTick: (t) => ticks.push(t) });
    s.advance(TICK_MS * 20);
    expect(ticks.length).toBe(MAX_TICKS_PER_FRAME);
    // tick index continues monotonically; cap does not change absolute index
    expect(s.getTickIndex()).toBe(MAX_TICKS_PER_FRAME);
  });

  it('reports interpolation alpha in [0,1)', () => {
    let alpha = -1;
    const s = new FixedStepper({ onTick: () => {}, onFrame: (a) => (alpha = a) });
    s.advance(TICK_MS * 1.5); // 1 tick, 0.5 remainder
    expect(alpha).toBeGreaterThanOrEqual(0.4);
    expect(alpha).toBeLessThan(1);
  });
});
