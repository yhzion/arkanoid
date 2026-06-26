import { describe, it, expect } from 'vitest';
import { RoundStateTracker } from '../../src/core/roundState';
import { Ball } from '../../src/entities/ball';
import { toFloat, toFx } from '../../src/core/fxMath';

// PRD §10.2: speed scaling is shared across all active balls (multi-ball
// sharing) and resets to base 2.0 when a life is lost.
describe('RoundStateTracker speed scaling (§10.2)', () => {
  it('resets ceiling/brick counters and base speed on death', () => {
    const rs = new RoundStateTracker();
    rs.brickHitsInRound = 50;
    rs.hasCeilingBeenHit = true;
    rs.restartAfterDeath();
    expect(rs.brickHitsInRound).toBe(0);
    expect(rs.hasCeilingBeenHit).toBe(false);
    expect(toFloat(rs.balls[0].speed)).toBeCloseTo(2.0, 2);
  });

  it('applies the same scaled speed to every active ball', () => {
    const rs = new RoundStateTracker();
    rs.hasCeilingBeenHit = true;
    rs.brickHitsInRound = 10; // +0.25 (ceiling) + 0.05 (one group) = 2.30
    rs.balls = [new Ball(), new Ball()];
    rs.balls[1].speed = toFx(4); // diverged before sharing
    rs.applyScaledSpeed();
    expect(toFloat(rs.balls[0].speed)).toBeCloseTo(2.30, 2);
    expect(toFloat(rs.balls[1].speed)).toBeCloseTo(2.30, 2);
  });
});

// PRD §12.1: active Vaus power-ups end when a life is lost.
// (Characterization: restartAfterDeath already calls vaus.reset() + clears mega.)
describe('RoundStateTracker power-up reset on death (§12.1)', () => {
  it('clears Vaus power-ups and mega on death', () => {
    const rs = new RoundStateTracker();
    rs.vaus.laserActive = true;
    rs.vaus.catchActive = true;
    rs.vaus.enlarge();
    rs.megaActive = true;
    rs.restartAfterDeath();
    expect(rs.vaus.laserActive).toBe(false);
    expect(rs.vaus.catchActive).toBe(false);
    expect(rs.vaus.enlargeActive).toBe(false);
    expect(rs.megaActive).toBe(false);
  });
});
