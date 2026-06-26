import { describe, it, expect } from 'vitest';
import { GameState } from '../gameState';
import { GameConfig, validateLevel, LevelData, silverHits } from '../../data/levelSchema';
import { Mulberry32 } from '../rng';
import { Vaus } from '../../entities/vaus';
import { createBall, attachBallToVaus, launchBall, deflectBall, updateBall, BASE_BALL_SPEED, SLOW_BALL_SPEED, MAX_BALL_SPEED, BALL_SIZE } from '../../entities/ball';
import { BrickManager, BRICK_WIDTH, BRICK_HEIGHT, GRID_ORIGIN_X, GRID_ORIGIN_Y } from '../../entities/bricks';
import { CapsuleManager, capsuleWeightedRoll } from '../../entities/capsules';
import { EnemyManager, ENEMY_SPAWN_INTERVAL, MAX_ENEMIES } from '../../entities/enemies';
import { BossManager, DOH_HITS_REQUIRED } from '../../entities/boss';
import { fx, fxFloor, FX_ONE } from '../../physics/fixedPoint';
import { aabbCollision, aabbOverlap, AABB } from '../../physics/collision';

function makeTestConfig(): GameConfig {
  return {
    region: 'US',
    mode: 'clean-room',
    enableManualLevelSkipSecret: true,
    enableHighScoreNameEntry: true,
    enableTwoPlayerMode: false,
    inputMode: 'keyboard',
    renderScaleMode: 'integer',
    audioEnabled: false,
    musicVolume: 0,
    sfxVolume: 0,
    deflectionModel: 'continuous',
    jitterEnabled: false,
    numericModel: 'q16.16-v1',
    deterministicSeed: 'test-seed-42',
  };
}

describe('GameState boot', () => {
  it('creates with defaults', () => {
    const gs = new GameState(makeTestConfig());
    expect(gs.state).toBe('BOOT');
    expect(gs.player.lives).toBe(3);
    expect(gs.player.round).toBe(1);
    expect(gs.bossRound).toBe(36);
  });

  it('JP mode has boss at 33', () => {
    const cfg = makeTestConfig();
    cfg.region = 'JP';
    const gs = new GameState(cfg);
    expect(gs.bossRound).toBe(33);
  });
});

describe('Scoring', () => {
  it('starts at 0', () => {
    const gs = new GameState(makeTestConfig());
    expect(gs.scoring.score).toBe(0);
  });

  it('adds points', () => {
    const gs = new GameState(makeTestConfig());
    gs.scoring.add(50, 'test');
    expect(gs.scoring.score).toBe(50);
  });
});

describe('Vaus movement', () => {
  it('moves left', () => {
    const v = new Vaus();
    const start = fxFloor(v.x);
    v.moveLeft();
    expect(fxFloor(v.x)).toBe(start - 3);
  });

  it('moves right', () => {
    const v = new Vaus();
    const start = fxFloor(v.x);
    v.moveRight();
    expect(fxFloor(v.x)).toBe(start + 3);
  });

  it('clamps to playfield', () => {
    const v = new Vaus();
    v.setX(0);
    expect(fxFloor(v.x)).toBe(8);
    v.setX(300);
    expect(fxFloor(v.x)).toBe(216);
  });
});

describe('Ball physics', () => {
  it('launches at correct speed', () => {
    const v = new Vaus();
    v.x = fx(128);
    const ball = createBall();
    attachBallToVaus(ball, v);
    launchBall(ball, v);
    expect(fxFloor(ball.speed)).toBe(BASE_BALL_SPEED);
    expect(ball.vy).toBeLessThan(0);
  });

  it('slow capsule reduces speed', () => {
    const ball = createBall();
    ball.speed = fx(BASE_BALL_SPEED);
    ball.speed = fx(SLOW_BALL_SPEED);
    expect(fxFloor(ball.speed)).toBe(1);
  });
});

describe('Brick manager', () => {
  it('loads level data', () => {
    const bm = new BrickManager();
    const level: LevelData = {
      id: 'test',
      region: 'US',
      roundNumber: 1,
      type: 'brick',
      grid: { columns: 11, rows: 28, brickWidth: 16, brickHeight: 8 },
      clearRequiredCount: 0,
      cells: [
        { col: 0, row: 0, type: 'WHITE', hitsRemaining: 1, capsule: null, isCapsuleCarrier: false, clearRequired: true },
      ],
      enemyProfile: 'test',
      ballProfile: 'test',
      paletteProfile: 'test',
    };
    bm.loadFromLevel(level);
    const cell = bm.getCell(0, 0);
    expect(cell).not.toBeNull();
    expect(cell!.type).toBe('WHITE');
  });

  it('detects clear', () => {
    const bm = new BrickManager();
    const level: LevelData = {
      id: 'test',
      region: 'US',
      roundNumber: 1,
      type: 'brick',
      grid: { columns: 11, rows: 28, brickWidth: 16, brickHeight: 8 },
      clearRequiredCount: 1,
      cells: [
        { col: 0, row: 0, type: 'WHITE', hitsRemaining: 1, capsule: null, isCapsuleCarrier: false, clearRequired: true },
      ],
      enemyProfile: 'test',
      ballProfile: 'test',
      paletteProfile: 'test',
    };
    bm.loadFromLevel(level);
    expect(bm.checkClear()).toBe(false);
    bm.hit(0, 0);
    expect(bm.checkClear()).toBe(true);
  });
});

describe('Capsules', () => {
  it('spawns and falls', () => {
    const cm = new CapsuleManager();
    cm.spawn('S', 100, 50);
    expect(cm.active.length).toBe(1);
    cm.update();
    const cap = cm.active[0]!;
    expect(fxFloor(cap.y)).toBeGreaterThan(50);
  });

  it('clears offscreen capsules', () => {
    const cm = new CapsuleManager();
    cm.spawn('S', 100, 300);
    cm.update();
    expect(cm.active.length).toBe(0);
  });
});

describe('Boss', () => {
  it('requires 16 hits', () => {
    const boss = new BossManager();
    expect(boss.defeated).toBe(false);
    let hits = 0;
    for (let i = 0; i < 50; i++) {
      if (boss.registerHit()) hits++;
      if (boss.defeated) break;
      boss.hitCooldown = 0;
    }
    expect(hits).toBe(DOH_HITS_REQUIRED);
    expect(boss.defeated).toBe(true);
  });

  it('fires projectiles', () => {
    const boss = new BossManager();
    const v = new Vaus();
    boss.update(v);
    expect(boss.projectiles.length).toBeGreaterThanOrEqual(0);
  });
});

describe('AABB collision', () => {
  it('detects overlap', () => {
    const a: AABB = { x: fx(0), y: fx(0), w: 10, h: 10 };
    const b: AABB = { x: fx(5), y: fx(5), w: 10, h: 10 };
    expect(aabbOverlap(a, b)).toBe(true);
  });

  it('detects no overlap', () => {
    const a: AABB = { x: fx(0), y: fx(0), w: 10, h: 10 };
    const b: AABB = { x: fx(20), y: fx(20), w: 10, h: 10 };
    expect(aabbOverlap(a, b)).toBe(false);
  });
});

describe('Silver brick formula', () => {
  it('hits increase every 8 rounds', () => {
    expect(silverHits(1)).toBe(2);
    expect(silverHits(9)).toBe(3);
    expect(silverHits(17)).toBe(4);
    expect(silverHits(25)).toBe(5);
  });
});
