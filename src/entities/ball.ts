export interface BallState {
  x: number; y: number;
  vx: number; vy: number;
  width: number; height: number;
  speed: number;
  held: boolean;
  caught: boolean;
  catchOffsetX: number;
  active: boolean;
  hitCount: number;
  ceilingHit: boolean;
  wallBounceCount: number;
  separatedFromBoss: boolean;
}

export function createBall(): BallState {
  return {
    x: 112, y: 216, vx: 0, vy: 0,
    width: 5, height: 4, speed: 2.0,
    held: true, caught: false, catchOffsetX: 0,
    active: true, hitCount: 0, ceilingHit: false,
    wallBounceCount: 0, separatedFromBoss: true,
  };
}

export const BASE_SPEED = 2.0;
export const MAX_SPEED = 5.0;
export const CEILING_SPEED_STEP = 0.25;
export const BRICK_HIT_SPEED_STEP = 0.05;
export const SLOW_SPEED = 1.5;
export const LAUNCH_ANGLE = 60;
