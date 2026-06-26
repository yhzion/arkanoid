import { describe, it, expect } from 'vitest';
import { Mulberry32, seedFromString } from './rng';

describe('mulberry32 PRNG (§30.4)', () => {
  it('is reproducible from the same seed', () => {
    const a = new Mulberry32(0x12345678);
    const b = new Mulberry32(0x12345678);
    for (let i = 0; i < 50; i++) {
      expect(a.next()).toBe(b.next());
    }
  });

  it('restores state exactly via getState/setState', () => {
    const rng = new Mulberry32(99);
    rng.next();
    rng.next();
    const snap = rng.getState();
    const v1 = rng.next();
    const v2 = rng.next();
    const restored = new Mulberry32(1);
    restored.setState(snap);
    expect(restored.next()).toBe(v1);
    expect(restored.next()).toBe(v2);
  });

  it('produces uint32 values', () => {
    const rng = new Mulberry32(7);
    for (let i = 0; i < 100; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(2 ** 32);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('weightedIndex respects weights deterministically', () => {
    // weights: [2,2,2,2,2,1,1] (S,C,L,D,E,P,B) — index in [0,6]
    const rng = new Mulberry32(42);
    const idx = rng.weightedIndex([2, 2, 2, 2, 2, 1, 1]);
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThanOrEqual(6);
  });

  it('player streams are independent (seed XOR playerIndex)', () => {
    const base = seedFromString('seed-x');
    const p0 = new Mulberry32(Mulberry32.playerSeed(base, 0));
    const p1 = new Mulberry32(Mulberry32.playerSeed(base, 1));
    const same0 = new Mulberry32(Mulberry32.playerSeed(base, 0));
    expect(p0.next()).toBe(same0.next());
    expect(p0.next()).not.toBe(p1.next());
  });

  it('seedFromString is deterministic for identical input', () => {
    expect(seedFromString('abc')).toBe(seedFromString('abc'));
    expect(seedFromString('abc')).not.toBe(seedFromString('abd'));
  });
});
