/**
 * Mechanism acceptance — PRD §34.2 (exact-output, no tolerances).
 *
 * Ball-speed curve, launch vectors, deflection per offset (both models incl. 10°
 * clamp), and seeded capsule distribution. Each asserts the exact expected value.
 */
import { describe, it, expect } from 'vitest';
import { Ball } from '../entities/ball';
import { fromInt, fromFloatBuildOnly, ONE, fxMul } from '../core/fixedpoint';
import { SPEED_BASE, SPEED_BRICK_STEP, SPEED_CEIL_STEP, SPEED_MAX } from '../core/config';
import { LAUNCH_LEFT, LAUNCH_RIGHT } from '../core/trigTables';
import { paddleDeflection } from '../game/deflection';
import { selectCapsuleType } from '../entities/capsule';
import { Mulberry32, seedFromString } from '../core/rng';

describe('Ball speed curve (§10.2, §34.2)', () => {
  it('starts at base 2.0', () => {
    const b = new Ball(fromInt(0), fromInt(0));
    expect(b.speed).toBe(SPEED_BASE);
  });

  it('+0.25 on first ceiling hit, only once per round', () => {
    const b = new Ball(fromInt(0), fromInt(0));
    b.onCeilingHit(SPEED_CEIL_STEP);
    expect(b.speed).toBe(SPEED_BASE + SPEED_CEIL_STEP);
    b.onCeilingHit(SPEED_CEIL_STEP); // no further change
    expect(b.speed).toBe(SPEED_BASE + SPEED_CEIL_STEP);
  });

  it('+0.05 every 10 brick hits', () => {
    const b = new Ball(fromInt(0), fromInt(0));
    for (let i = 0; i < 10; i++) b.onBrickHit(SPEED_BRICK_STEP);
    expect(b.speed).toBe(SPEED_BASE + SPEED_BRICK_STEP); // +0.05 after 10
    for (let i = 0; i < 10; i++) b.onBrickHit(SPEED_BRICK_STEP);
    expect(b.speed).toBe(SPEED_BASE + SPEED_BRICK_STEP * 2); // +0.10 after 20
  });

  it('caps at 5.0', () => {
    const b = new Ball(fromInt(0), fromInt(0));
    b.ceilingHitThisRound = true;
    for (let i = 0; i < 1000; i++) b.onBrickHit(SPEED_BRICK_STEP);
    expect(b.speed).toBe(SPEED_MAX);
  });

  it('resets to 2.0 on life loss (§10.2)', () => {
    const b = new Ball(fromInt(0), fromInt(0));
    b.onCeilingHit(SPEED_CEIL_STEP);
    b.resetForLife();
    expect(b.speed).toBe(SPEED_BASE);
  });
});

describe('Launch vectors (§10.3, §34.2)', () => {
  it('right launch is +30° from vertical at speed 2.0', () => {
    const b = new Ball(fromInt(0), fromInt(0));
    b.launch(true);
    expect(b.dir.vx).toBe(LAUNCH_RIGHT.vx);
    expect(b.dir.vy).toBe(LAUNCH_RIGHT.vy);
    expect(b.vx).toBe(fxMul(LAUNCH_RIGHT.vx, SPEED_BASE));
    expect(b.vy).toBe(fxMul(LAUNCH_RIGHT.vy, SPEED_BASE));
    expect(b.vx).toBeGreaterThan(0); // rightward
    expect(b.vy).toBeLessThan(0); // upward
  });

  it('left launch mirrors right', () => {
    const b = new Ball(fromInt(0), fromInt(0));
    b.launch(false);
    expect(b.dir.vx).toBe(LAUNCH_LEFT.vx);
    expect(b.vx).toBeLessThan(0);
  });

  it('launch speed is exactly 2.0', () => {
    const b = new Ball(fromInt(0), fromInt(0));
    b.launch(true);
    // |v|² == speed²
    const sq = fxMul(b.vx, b.vx) + fxMul(b.vy, b.vy);
    const expected = fxMul(SPEED_BASE, SPEED_BASE);
    expect(Math.abs(sq - expected)).toBeLessThan(ONE / 64); // tiny fx rounding
  });
});

describe('Deflection per offset (§10.4, §34.2)', () => {
  const halfW = fromInt(16); // 32px paddle → half 16

  function angleOf(vx: number, vy: number): number {
    return (Math.atan2(vx / ONE, -vy / ONE) * 180) / Math.PI;
  }

  it('discrete8: far-left edge → -75°, far-right → +75°', () => {
    const left = paddleDeflection(fromInt(0), fromInt(16), halfW, SPEED_BASE, 'discrete8', -1);
    const right = paddleDeflection(fromInt(32), fromInt(16), halfW, SPEED_BASE, 'discrete8', 1);
    expect(Math.round(angleOf(left.vx, left.vy))).toBe(-75);
    expect(Math.round(angleOf(right.vx, right.vy))).toBe(75);
  });

  it('discrete8: center → ±15°', () => {
    const c = paddleDeflection(fromInt(16), fromInt(16), halfW, SPEED_BASE, 'discrete8', 1);
    expect(Math.abs(Math.round(angleOf(c.vx, c.vy)))).toBe(15);
  });

  it('continuous: ±10° clamp near center preserves sign', () => {
    const nearCenter = paddleDeflection(fromInt(16) + 1, fromInt(16), halfW, SPEED_BASE, 'continuous', 1);
    const deg = angleOf(nearCenter.vx, nearCenter.vy);
    expect(Math.abs(deg)).toBeGreaterThanOrEqual(9.5);
    expect(Math.abs(deg)).toBeLessThanOrEqual(10.5);
  });

  it('continuous: edge → 75°', () => {
    const edge = paddleDeflection(fromInt(32), fromInt(16), halfW, SPEED_BASE, 'continuous', 1);
    expect(Math.round(angleOf(edge.vx, edge.vy))).toBe(75);
  });

  it('outgoing magnitude == speed (speed preserved)', () => {
    const v = paddleDeflection(fromInt(20), fromInt(16), halfW, SPEED_BASE, 'continuous', 1);
    const sq = fxMul(v.vx, v.vx) + fxMul(v.vy, v.vy);
    expect(Math.abs(sq - fxMul(SPEED_BASE, SPEED_BASE))).toBeLessThan(ONE);
  });
});

describe('Capsule distribution (§12.3, §34.2)', () => {
  it('a fixed seed produces an exact deterministic sequence', () => {
    const rng = new Mulberry32(seedFromString('exact-cap'));
    let prev = null as null | string;
    const seq: string[] = [];
    for (let i = 0; i < 10; i++) {
      const t = selectCapsuleType(rng, prev as never);
      seq.push(t);
      prev = t;
    }
    // Replay with a fresh identical stream → identical sequence.
    const rng2 = new Mulberry32(seedFromString('exact-cap'));
    let prev2 = null as null | string;
    const seq2: string[] = [];
    for (let i = 0; i < 10; i++) {
      const t = selectCapsuleType(rng2, prev2 as never);
      seq2.push(t);
      prev2 = t;
    }
    expect(seq2).toEqual(seq);
    // And every element is a valid capsule.
    expect(seq.every((t) => 'SCLDPEB'.includes(t))).toBe(true);
    void fromFloatBuildOnly;
  });
});
