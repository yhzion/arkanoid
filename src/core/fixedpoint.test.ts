import { describe, it, expect } from 'vitest';
import { ONE, fxMul, fxDiv, fxClamp, fxAbs, fxSign, fromInt, toInt, fromFloatBuildOnly } from './fixedpoint';

describe('Q16.16 fixed-point (§30.2)', () => {
  it('represents 1.0 as 65536', () => {
    expect(ONE).toBe(65536);
    expect(toInt(fromInt(7))).toBe(7);
  });

  it('multiplies with >>16 semantics', () => {
    // 2.0 * 3.0 == 6.0
    const r = fxMul(fromInt(2), fromInt(3));
    expect(toInt(r)).toBe(6);
    // 1.5 * 2.0 == 3.0
    expect(toInt(fxMul(fromFloatBuildOnly(1.5), fromInt(2)))).toBe(3);
  });

  it('divides with (a<<16)/b semantics', () => {
    // 6.0 / 3.0 == 2.0
    expect(toInt(fxDiv(fromInt(6), fromInt(3)))).toBe(2);
    // 5.0 / 2.0 == 2 (truncated)
    expect(toInt(fxDiv(fromInt(5), fromInt(2)))).toBe(2);
  });

  it('clamps', () => {
    expect(fxClamp(fromInt(10), fromInt(0), fromInt(5))).toBe(fromInt(5));
    expect(fxClamp(fromInt(-10), fromInt(0), fromInt(5))).toBe(fromInt(0));
  });

  it('abs and sign', () => {
    expect(fxAbs(fromInt(-3))).toBe(fromInt(3));
    expect(fxSign(fromInt(-3))).toBe(-ONE);
    expect(fxSign(0)).toBe(0);
    expect(fxSign(fromInt(3))).toBe(ONE);
  });

  it('keeps integer arithmetic exact across the playfield range', () => {
    // 184px * 184px product intermediate stays well below 2^53.
    const big = fromInt(184);
    const sq = fxMul(big, big);
    expect(toInt(sq)).toBe(184 * 184);
  });
});
