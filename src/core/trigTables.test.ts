import { describe, it, expect } from 'vitest';
import { ONE, fromInt, fromFloatBuildOnly, toInt, fxAbs, fxMul } from './fixedpoint';
import {
  LAUNCH_LEFT,
  LAUNCH_RIGHT,
  DISCRETE8,
  continuousUnit,
  continuousIndex,
  applyVerticalLoopClamp,
  SIN_10,
} from './trigTables';

/** Convert a unit vec back to degrees-from-vertical for assertion. */
function vecToDeg(u: { vx: number; vy: number }): number {
  // θ = atan2(vx, -vy) — computed in test only (not in sim path).
  return (Math.atan2(u.vx, -u.vy) * 180) / Math.PI;
}
function vecToDegF(u: { vx: number; vy: number }): number {
  return (vecToDeg({ vx: u.vx / ONE, vy: u.vy / ONE }) + 360) % 360;
}

describe('angle LUTs (§30.3 / §10.3 / §10.4)', () => {
  it('launch vectors are ±30° from vertical', () => {
    expect(Math.round(vecToDegF(LAUNCH_RIGHT))).toBe(30);
    // left launch: -30° normalized
    const deg = vecToDeg({ vx: LAUNCH_LEFT.vx / ONE, vy: LAUNCH_LEFT.vy / ONE });
    expect(Math.round(deg)).toBe(-30);
  });

  it('discrete8 zones are ±15/±35/±55/±75', () => {
    const degs = DISCRETE8.map((u) => Math.round(vecToDeg({ vx: u.vx / ONE, vy: u.vy / ONE })));
    expect(degs).toEqual([-75, -55, -35, -15, 15, 35, 55, 75]);
  });

  it('continuous LUT spans ±75° at the ends and ~0 at center', () => {
    const hi = continuousUnit(fromInt(1)); // scalingFactor = +1 → +75°
    const lo = continuousUnit(fromInt(-1)); // -75°
    const mid = continuousUnit(0); // ~center
    expect(Math.round(vecToDeg({ vx: hi.vx / ONE, vy: hi.vy / ONE }))).toBe(75);
    expect(Math.round(vecToDeg({ vx: lo.vx / ONE, vy: lo.vy / ONE }))).toBe(-75);
    // center slot is off-by-a-fraction due to 1/256 truncation; just assert near-vertical
    expect(Math.abs(vecToDeg({ vx: mid.vx / ONE, vy: mid.vy / ONE }))).toBeLessThan(1);
  });

  it('continuousIndex maps scalingFactor to [0,255]', () => {
    expect(continuousIndex(fromInt(-1))).toBe(0);
    expect(continuousIndex(fromInt(1))).toBe(255);
    // (ONE*255)/(2*ONE) = 127.5 → trunc 127 (deterministic)
    expect(continuousIndex(0)).toBe(127);
  });

  it('unit vectors are unit-length in fixed-point (approx)', () => {
    for (const u of [LAUNCH_RIGHT, ...DISCRETE8]) {
      const lenSq = fxMul(u.vx, u.vx) + fxMul(u.vy, u.vy);
      // |len² − 1| < 0.01
      expect(fxAbs(lenSq - ONE)).toBeLessThan(fromFloatBuildOnly(0.01) as number);
    }
  });

  it('vertical-loop clamp forces |θ| ≥ 10° preserving horizontal sign', () => {
    const nearVertical = continuousUnit(0); // ~0° (straight up)
    const clampedPos = applyVerticalLoopClamp(nearVertical, ONE); // hSign +
    const clampedNeg = applyVerticalLoopClamp(nearVertical, -ONE); // hSign −
    expect(Math.round(vecToDeg({ vx: clampedPos.vx / ONE, vy: clampedPos.vy / ONE }))).toBe(10);
    expect(Math.round(vecToDeg({ vx: clampedNeg.vx / ONE, vy: clampedNeg.vy / ONE }))).toBe(-10);
  });

  it('clamp leaves already-steep angles untouched', () => {
    const steep = DISCRETE8[7]; // +75°
    const out = applyVerticalLoopClamp(steep, ONE);
    expect(out).toBe(steep);
    // sanity: SIN_10 built from 10°
    expect(toInt(SIN_10)).toBeLessThanOrEqual(1); // sin(10°)≈0.17 → int 0
  });
});
