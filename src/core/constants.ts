/**
 * Playfield geometry, grid, and entity constants — PRD §6.2, §18.2, §33.
 *
 * Layout (clean-room baseline; pixel-exact fidelity is M5/deferred, §6.2):
 *   logical canvas 256x240
 *   playfield x ∈ [0,192), HUD x ∈ [192,256)
 *   wall thickness 8 → interior x ∈ [8,184), y ∈ [8,232)
 *   brick grid 11 cols x 28 rows, brick 16x8, grid origin (col0,row0) at (8,8)
 */
import { Fx, fromFloatBuildOnly, fromInt } from './fixedpoint';

// Canvas / playfield
export const LOGICAL_W = 256;
export const LOGICAL_H = 240;
export const PLAYFIELD_W = 192;
export const WALL = 8;
export const PLAY_LEFT = WALL; // 8
export const PLAY_RIGHT = PLAYFIELD_W - WALL; // 184 (interior right edge)
export const PLAY_TOP = WALL; // 8
export const PLAY_BOTTOM = 232; // interior bottom edge (ball lost past this)
export const HUD_X = PLAYFIELD_W; // 192

// Brick grid (§11.1, §6.2)
export const GRID_COLS = 11;
export const GRID_ROWS = 28;
export const BRICK_W = 16;
export const BRICK_H = 8;
export const GRID_ORIGIN_X = PLAY_LEFT; // 8
export const GRID_ORIGIN_Y = PLAY_TOP; // 8

// Vaus (§18.2, §33.2)
export const VAUS_W: Fx = fromInt(32);
export const VAUS_W_LARGE: Fx = fromInt(48);
export const VAUS_H = 8;
export const VAUS_MOVE_STEP: Fx = fromInt(3); // px/tick, digital
export const VAUS_Y = PLAY_BOTTOM - 12; // paddle baseline (top edge)

// Ball (§18.2)
export const BALL_W = 5;
export const BALL_H = 4;

// Capsule (§18.2, §33.3)
export const CAPSULE_W = 16;
export const CAPSULE_H = 7;
export const CAPSULE_FALL_SPEED: Fx = fromInt(1); // 1 px/tick
export const CATCH_AUTO_RELEASE_TICKS = 360; // §33.3 / §12.5

// Laser (§33.4, §12.6)
export const LASER_COOLDOWN_TICKS = 15;
export const LASER_MAX_PAIRS = 2; // 4 beams max
export const LASER_SPEED: Fx = fromInt(4);

// Enemy spawn (§13.2)
export const ENEMY_SPAWN_INTERVAL = 480; // 8s
export const ENEMY_MAX_ACTIVE = 3;
export const ENEMY_POINTS = 100;

// Boss DOH (§33.6, §15)
export const BOSS_HITS_TO_DEFEAT = 16;
export const BOSS_PROJECTILE_SPEED: Fx = fromInt(2);
export const BOSS_FIRE_INTERVAL = 90;
export const BOSS_MAX_PROJECTILES = 2;
export const BOSS_HIT_SCORE = 1000;
export const BOSS_DEFEAT_SCORE = 50000;

// Scoring (§16.1)
export const CAPSULE_COLLECT_SCORE = 100;
export const BREAK_WARP_SCORE = 10000;
export const ENEMY_SCORE = 100;

// Lives (§10.5)
export const STARTING_LIVES = 3;
export const EXTRA_LIFE_FIRST = 20000;
export const EXTRA_LIFE_STEP = 60000;

// Region round counts (§2.1)
export function bossRound(region: 'US' | 'JP'): number {
  return region === 'US' ? 36 : 33;
}
export function brickRounds(region: 'US' | 'JP'): number {
  return region === 'US' ? 35 : 32;
}

// Input / loop (§7.2, §30.6)
export const TICKS_PER_SECOND = 60;
export const TICK_MS = 1000 / TICKS_PER_SECOND;
export const MAX_TICKS_PER_FRAME = 5; // catch-up cap (§30.6)

// Title idle/demo timing (§8.2)
export const TITLE_IDLE_TICKS = 600; // 10s
export const DEMO_TICKS = 600;

// fromFloatBuildOnly re-exported for callers that need pixel fractions.
export const _f = fromFloatBuildOnly;
