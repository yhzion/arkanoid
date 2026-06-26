import { describe, it, expect } from 'vitest';
import { Mulberry32 } from '../rng';
import { fx, fxFloor, fxMul, fxDiv, fxClamp, FX_ONE } from '../../physics/fixedPoint';
import { Vaus, PLAYFIELD_LEFT, PLAYFIELD_RIGHT, VAUS_NORMAL_WIDTH, VAUS_ENLARGED_WIDTH } from '../../entities/vaus';
import { createBall, attachBallToVaus, launchBall, deflectBall, BASE_BALL_SPEED, BALL_SIZE } from '../../entities/ball';
import { GRID_ORIGIN_X, GRID_ORIGIN_Y, BRICK_WIDTH, BRICK_HEIGHT } from '../../entities/bricks';
import { validateLevel, silverHits, silverHitScore } from '../../data/levelSchema';

describe('Mulberry32 RNG', () => {
  it('produces deterministic sequence', () => {
    const rng = new Mulberry32(12345);
    const seq = Array.from({ length: 5 }, () => rng.next());
    const rng2 = new Mulberry32(12345);
    expect(seq).toEqual(Array.from({ length: 5 }, () => rng2.next()));
  });

  it('different seeds produce different sequences', () => {
    const rng1 = new Mulberry32(42);
    const rng2 = new Mulberry32(43);
    expect(rng1.next()).not.toBe(rng2.next());
  });
});

describe('Fixed-point', () => {
  it('fx converts to fixed point', () => {
    expect(fxFloor(fx(2.5))).toBe(2);
    expect(fxFloor(fx(0))).toBe(0);
    expect(fxFloor(fx(-1.5))).toBe(-2);
  });

  it('fxMul multiplies', () => {
    const result = fxMul(fx(3), fx(4));
    expect(fxFloor(result)).toBe(12);
  });

  it('fxDiv divides', () => {
    const result = fxDiv(fx(10), fx(2));
    expect(fxFloor(result)).toBe(5);
  });
});

describe('Vaus', () => {
  it('moves left and right within bounds', () => {
    const v = new Vaus();
    v.setX(PLAYFIELD_LEFT);
    v.moveLeft();
    expect(fxFloor(v.x)).toBe(PLAYFIELD_LEFT);

    v.setX(PLAYFIELD_RIGHT - VAUS_NORMAL_WIDTH);
    v.moveRight();
    expect(fxFloor(v.x)).toBe(PLAYFIELD_RIGHT - VAUS_NORMAL_WIDTH);
  });

  it('enlarge changes width', () => {
    const v = new Vaus();
    v.enlarged = true;
    v.width = VAUS_ENLARGED_WIDTH;
    expect(v.width).toBe(VAUS_ENLARGED_WIDTH);
  });
});

describe('Ball', () => {
  it('creates with correct defaults', () => {
    const ball = createBall();
    expect(ball.caught).toBe(true);
    expect(ball.active).toBe(false);
    expect(fxFloor(ball.speed)).toBe(BASE_BALL_SPEED);
  });

  it('attaches to vaus', () => {
    const v = new Vaus();
    const ball = createBall();
    attachBallToVaus(ball, v);
    expect(ball.caught).toBe(true);
    expect(ball.y).toBeLessThan(v.y);
  });

  it('launches from vaus', () => {
    const v = new Vaus();
    v.x = fx(128);
    const ball = createBall();
    attachBallToVaus(ball, v);
    launchBall(ball, v);
    expect(ball.active).toBe(true);
    expect(ball.caught).toBe(false);
    expect(ball.vy).toBeLessThan(0);
  });
});

describe('Level validation', () => {
  it('validates correct level', () => {
    const level = {
      id: 'test',
      region: 'US' as const,
      roundNumber: 1,
      type: 'brick' as const,
      grid: { columns: 11, rows: 28, brickWidth: 16, brickHeight: 8 },
      clearRequiredCount: 0,
      cells: [],
      enemyProfile: 'test',
      ballProfile: 'test',
      paletteProfile: 'test',
    };
    expect(validateLevel(level)).toHaveLength(0);
  });

  it('detects grid errors', () => {
    const level = {
      id: 'test',
      region: 'US' as const,
      roundNumber: 1,
      type: 'brick' as const,
      grid: { columns: 10, rows: 28, brickWidth: 16, brickHeight: 8 },
      clearRequiredCount: 0,
      cells: [],
      enemyProfile: 'test',
      ballProfile: 'test',
      paletteProfile: 'test',
    };
    expect(validateLevel(level).length).toBeGreaterThan(0);
  });
});

describe('Silver brick formula', () => {
  it('calculates hits', () => {
    expect(silverHits(1)).toBe(2);
    expect(silverHits(8)).toBe(2);
    expect(silverHits(9)).toBe(3);
    expect(silverHits(16)).toBe(3);
    expect(silverHits(17)).toBe(4);
  });

  it('calculates score', () => {
    expect(silverHitScore(1)).toBe(50);
    expect(silverHitScore(10)).toBe(500);
  });
});
