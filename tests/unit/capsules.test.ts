import { describe, it, expect } from 'vitest';
import { CapsuleManager } from '../../src/entities/capsules';
import { SeededRNG } from '../../src/core/rng';
import { toFx } from '../../src/core/fxMath';

// PRD §12.1: only one falling capsule may be active at a time.
// PRD §30.5: a skipped drop must NOT advance the capsule PRNG.
describe('CapsuleManager single-capsule rule (§12.1, §30.5)', () => {
  it('drops at most one capsule and does not draw RNG while one is active', () => {
    const mgr = new CapsuleManager();
    const rng = new SeededRNG(123);

    mgr.spawn(toFx(50), toFx(16), toFx(50), toFx(8), rng);
    expect(mgr.activeCapsules.length).toBe(1);

    const stateAfterFirst = rng.getState();
    mgr.spawn(toFx(80), toFx(16), toFx(50), toFx(8), rng); // must be ignored

    expect(mgr.activeCapsules.length).toBe(1);
    expect(rng.getState()).toBe(stateAfterFirst);
  });
});

// PRD §12.3: M/R (and any) capsule placed via level data spawns explicitly,
// bypassing the random table and without advancing the capsule PRNG (§30.5).
describe('CapsuleManager explicit-type spawn (§12.3)', () => {
  it('spawns the explicit type (M) without drawing RNG', () => {
    const mgr = new CapsuleManager();
    const rng = new SeededRNG(123);
    const stateBefore = rng.getState();

    mgr.spawn(toFx(50), toFx(16), toFx(50), toFx(8), rng, 'M');

    expect(mgr.activeCapsules.length).toBe(1);
    expect(mgr.activeCapsules[0].type).toBe('M');
    expect(rng.getState()).toBe(stateBefore); // no RNG draw
  });

  it('spawns the explicit type (R) without drawing RNG', () => {
    const mgr = new CapsuleManager();
    const rng = new SeededRNG(123);
    const stateBefore = rng.getState();

    mgr.spawn(toFx(50), toFx(16), toFx(50), toFx(8), rng, 'R');

    expect(mgr.activeCapsules[0].type).toBe('R');
    expect(rng.getState()).toBe(stateBefore);
  });

  it('falls back to a random standard type and advances RNG when type is null/undefined', () => {
    const standard = new Set(['S', 'C', 'L', 'D', 'P', 'E', 'B']);

    const mgrNull = new CapsuleManager();
    const rngNull = new SeededRNG(123);
    const stateBeforeNull = rngNull.getState();
    mgrNull.spawn(toFx(50), toFx(16), toFx(50), toFx(8), rngNull, null);
    expect(standard.has(mgrNull.activeCapsules[0].type as string)).toBe(true);
    expect(rngNull.getState()).not.toBe(stateBeforeNull); // RNG advanced

    const mgrUndef = new CapsuleManager();
    const rngUndef = new SeededRNG(123);
    const stateBeforeUndef = rngUndef.getState();
    mgrUndef.spawn(toFx(50), toFx(16), toFx(50), toFx(8), rngUndef);
    expect(standard.has(mgrUndef.activeCapsules[0].type as string)).toBe(true);
    expect(rngUndef.getState()).not.toBe(stateBeforeUndef);
  });

  it('honors the single-capsule rule even when an explicit type is requested', () => {
    const mgr = new CapsuleManager();
    const rng = new SeededRNG(123);

    mgr.spawn(toFx(50), toFx(16), toFx(50), toFx(8), rng, 'M');
    expect(mgr.activeCapsules.length).toBe(1);

    mgr.spawn(toFx(80), toFx(16), toFx(50), toFx(8), rng, 'R'); // must be ignored
    expect(mgr.activeCapsules.length).toBe(1);
    expect(mgr.activeCapsules[0].type).toBe('M');
  });
});

import { EventBus, GameEvents } from '../../src/core/eventBus';

// PRD §17.3: CAPSULE_SPAWNED must be emitted so its SFX cue can fire,
// but only when a capsule is actually spawned (not when skipped).
describe('CapsuleManager CAPSULE_SPAWNED emission (§17.3)', () => {
  it('emits CAPSULE_SPAWNED when a capsule is actually spawned', () => {
    const mgr = new CapsuleManager();
    const rng = new SeededRNG(1);
    let fired = 0;
    const handler = () => { fired++; };
    EventBus.on(GameEvents.CAPSULE_SPAWNED, handler);
    mgr.spawn(toFx(50), toFx(16), toFx(50), toFx(8), rng, 'M');
    EventBus.off(GameEvents.CAPSULE_SPAWNED, handler);
    expect(fired).toBe(1);
  });

  it('does not emit when the single-capsule rule skips the spawn', () => {
    const mgr = new CapsuleManager();
    const rng = new SeededRNG(1);
    mgr.spawn(toFx(50), toFx(16), toFx(50), toFx(8), rng, 'M'); // first, accepted
    let fired = 0;
    const handler = () => { fired++; };
    EventBus.on(GameEvents.CAPSULE_SPAWNED, handler);
    mgr.spawn(toFx(80), toFx(16), toFx(50), toFx(8), rng, 'R'); // skipped (already one active)
    EventBus.off(GameEvents.CAPSULE_SPAWNED, handler);
    expect(fired).toBe(0);
  });
});
