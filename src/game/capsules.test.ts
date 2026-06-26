import { describe, it, expect } from 'vitest';
import { Mulberry32, seedFromString } from '../core/rng';
import { selectCapsuleType } from '../entities/capsule';
import { PowerUpManager } from './powerups';
import { CAPSULE_TYPES } from '../data/schemas';

describe('Capsule selection (§12.3, §30.5)', () => {
  it('only ever produces valid capsule types', () => {
    const rng = new Mulberry32(seedFromString('cap'));
    let prev = null as null | string;
    for (let i = 0; i < 1000; i++) {
      const t = selectCapsuleType(rng, prev as never);
      expect(CAPSULE_TYPES).toContain(t);
      prev = t;
    }
  });

  it('duplicate prevention: a repeat of the previous type becomes D', () => {
    // Force a deterministic stream; verify no type repeats back-to-back except D.
    const rng = new Mulberry32(seedFromString('dup-check'));
    let prev: string | null = null;
    for (let i = 0; i < 2000; i++) {
      const t = selectCapsuleType(rng, prev as never);
      if (prev !== null && t === prev) {
        expect(t).toBe('D'); // only D may repeat
      }
      prev = t;
    }
  });

  it('distribution is roughly weighted (S/C/L/D/E about 2x P/B)', () => {
    const rng = new Mulberry32(seedFromString('dist'));
    const counts: Record<string, number> = {};
    let prev: string | null = null;
    const N = 20000;
    for (let i = 0; i < N; i++) {
      const t = selectCapsuleType(rng, prev as never);
      counts[t] = (counts[t] ?? 0) + 1;
      prev = t;
    }
    const standard = (counts.S + counts.C + counts.L + counts.E) / 4; // D inflated by dup rule
    const special = counts.P + counts.B;
    // Each standard type individually should exceed each special type on average.
    expect(counts.S).toBeGreaterThan(counts.P);
    expect(standard).toBeGreaterThan(special / 2);
  });
});

describe('PowerUp replacement matrix (§12.1.1)', () => {
  it('P grants extra life and preserves the active effect', () => {
    const m = new PowerUpManager();
    m.apply('L'); // laser active
    const fx = m.apply('P');
    expect(fx.extraLife).toBe(true);
    expect(m.active).toBe('laser'); // preserved
  });

  it('collecting a new timed effect cancels the previous', () => {
    const m = new PowerUpManager();
    m.apply('S');
    expect(m.active).toBe('slow');
    const fx = m.apply('L');
    expect(fx.cancelledPrevious).toBe('slow');
    expect(m.active).toBe('laser');
  });

  it('E enlarge sets enlarge side-effect; switching away shrinks', () => {
    const m = new PowerUpManager();
    expect(m.apply('E').enlarge).toBe(true);
    expect(m.active).toBe('enlarge');
    const fx = m.apply('L');
    expect(fx.shrink).toBe(true);
  });

  it('D split keeps catch active if catch was active', () => {
    const m = new PowerUpManager();
    m.apply('C');
    const fx = m.apply('D');
    expect(fx.split).toBe(true);
    expect(m.active).toBe('catch');
  });
});
