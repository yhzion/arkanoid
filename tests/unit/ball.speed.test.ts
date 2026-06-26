import { describe, it, expect } from 'vitest';
import { computeScaledSpeed } from '../../src/entities/ball';
import { toFloat } from '../../src/core/fxMath';

// PRD §10.2 / §33.1: base 2.0; +0.25 on first ceiling hit of the round;
// +0.05 per 10 accumulated brick hits; capped at 5.0 px/tick.
describe('computeScaledSpeed (§10.2)', () => {
  const px = (ceilingHit: boolean, brickHits: number) =>
    toFloat(computeScaledSpeed(ceilingHit, brickHits));

  it('is the base 2.0 with no ceiling hit and no brick hits', () => {
    expect(px(false, 0)).toBeCloseTo(2.0, 2);
  });

  it('adds 0.25 for the first ceiling hit', () => {
    expect(px(true, 0)).toBeCloseTo(2.25, 2);
  });

  it('adds 0.05 per full group of 10 brick hits', () => {
    expect(px(false, 9)).toBeCloseTo(2.0, 2); // not yet a full group
    expect(px(false, 10)).toBeCloseTo(2.05, 2);
    expect(px(false, 25)).toBeCloseTo(2.10, 2); // floor(25/10)=2
  });

  it('combines ceiling and brick steps', () => {
    expect(px(true, 100)).toBeCloseTo(2.75, 2); // 2 + 0.25 + 10*0.05
  });

  it('caps at 5.0 px/tick', () => {
    expect(px(true, 100000)).toBeCloseTo(5.0, 2);
  });
});
