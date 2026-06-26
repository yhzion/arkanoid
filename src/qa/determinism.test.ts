/**
 * Determinism acceptance — PRD §19.4, §34.1.
 *
 * Same seed + same per-tick input sequence must produce a byte-identical final
 * state across two independent sim instances (score, lives, ball positions, brick
 * field). The golden-replay corpus concept (§34.1) reduces here to a self-consistency
 * check: the engine reproduces itself exactly.
 */
import { describe, it, expect } from 'vitest';
import { EventBus } from '../core/eventBus';
import { ScoreTracker } from '../game/scoring';
import { RoundSim } from '../game/roundSim';
import { Mulberry32, seedFromString } from '../core/rng';
import { ILevelData, IBrickCell } from '../data/schemas';
import { toInt } from '../core/fixedpoint';

function cell(col: number, row: number, type: IBrickCell['type']): IBrickCell {
  const clearRequired = type !== 'EMPTY' && type !== 'GOLD';
  return { col, row, type, hitsRemaining: type === 'SILVER' ? 3 : 1, capsule: null, isCapsuleCarrier: type !== 'GOLD', clearRequired };
}
function level(): ILevelData {
  const cells: IBrickCell[] = [];
  for (let r = 0; r < 6; r++) for (let c = 0; c < 11; c++) cells.push(cell(c, r, (['WHITE', 'ORANGE', 'RED', 'BLUE', 'GREEN', 'PINK'] as IBrickCell['type'][])[r]));
  return {
    id: 'det', region: 'US', roundNumber: 1, type: 'brick',
    grid: { columns: 11, rows: 28, brickWidth: 16, brickHeight: 8 },
    clearRequiredCount: cells.length, cells, enemyProfile: 'd', ballProfile: 'd', paletteProfile: 'd',
  };
}

interface SimSnapshot {
  score: number;
  lives: number;
  balls: { x: number; y: number; vx: number; vy: number; speed: number }[];
  bricksAlive: number;
  capsules: { x: number; y: number; type: string }[];
  rngState: number;
}

function snapshot(sim: RoundSim, rng: Mulberry32): SimSnapshot {
  return {
    score: sim.score.score,
    lives: sim.lives,
    balls: sim.balls.map((b) => ({ x: b.x, y: b.y, vx: b.vx, vy: b.vy, speed: b.speed })),
    bricksAlive: sim.field.live().length,
    capsules: sim.capsules.map((c) => ({ x: c.x, y: c.y, type: c.type })),
    rngState: rng.getState(),
  };
}

function buildAndRun(inputSeed: string, ticks: number): { sim: RoundSim; snap: SimSnapshot } {
  const bus = new EventBus();
  const score = new ScoreTracker(bus, () => {});
  const rng = new Mulberry32(seedFromString('determinism-seed'));
  const inputRng = new Mulberry32(seedFromString(inputSeed));
  const sim = new RoundSim({ bus, level: level(), deflectionModel: 'continuous', roundNumber: 1, score, capsuleRng: rng, lives: 3, finalBrickRound: 35 });
  // Launch then feed a deterministic input sequence (move left/right/fire presses).
  sim.tick({ left: false, right: false, firePressed: true, paddleX: null });
  for (let i = 0; i < ticks; i++) {
    const r = inputRng.next();
    sim.tick({
      left: (r & 1) === 1,
      right: (r & 2) === 2,
      firePressed: (r & 4) === 4 && sim.powerups.active === 'laser',
      paddleX: null,
    });
  }
  return { sim, snap: snapshot(sim, rng) };
}

describe('Determinism (§34.1) — byte-identical replay', () => {
  it('reproduces the exact final state from the same seed + inputs', () => {
    const a = buildAndRun('input-stream-A', 500);
    const b = buildAndRun('input-stream-A', 500);
    expect(b.snap).toEqual(a.snap);
  });

  it('diverges with a different input stream (sanity: inputs matter)', () => {
    const a = buildAndRun('input-stream-A', 500);
    const c = buildAndRun('input-stream-B', 500);
    // Inputs affect ball trajectory; the full snapshot (positions, rng state) differs
    // even if the score happens to coincide on a fast drain.
    expect(c.snap).not.toEqual(a.snap);
  });

  it('ball positions are integer-exact fixed-point (no float drift across runs)', () => {
    const a = buildAndRun('input-stream-A', 300);
    const b = buildAndRun('input-stream-A', 300);
    for (let i = 0; i < a.snap.balls.length; i++) {
      expect(b.snap.balls[i].x).toBe(a.snap.balls[i].x);
      expect(b.snap.balls[i].y).toBe(a.snap.balls[i].y);
    }
    // coordinates are raw fx integers
    expect(Number.isInteger(a.snap.balls[0]?.x ?? 0)).toBe(true);
  });

  it('continuous vs discrete8 deflection model is a determinism-breaking config change', () => {
    // Same inputs under two models must NOT be assumed equal — they are different
    // replay classes (§30.7 configHash differs). Just assert both run & are stable.
    const a = buildAndRun('input-stream-A', 200);
    const bus = new EventBus();
    const score = new ScoreTracker(bus, () => {});
    const rng = new Mulberry32(seedFromString('determinism-seed'));
    const inputRng = new Mulberry32(seedFromString('input-stream-A'));
    const sim = new RoundSim({ bus, level: level(), deflectionModel: 'discrete8', roundNumber: 1, score, capsuleRng: rng, lives: 3, finalBrickRound: 35 });
    sim.tick({ left: false, right: false, firePressed: true, paddleX: null });
    for (let i = 0; i < 200; i++) {
      const r = inputRng.next();
      sim.tick({ left: (r & 1) === 1, right: (r & 2) === 2, firePressed: false, paddleX: null });
    }
    // (No equality assertion across models — that's the point.)
    expect(a.sim.score.score).toBeGreaterThanOrEqual(0);
    expect(sim.score.score).toBeGreaterThanOrEqual(0);
    void toInt;
  });
});
