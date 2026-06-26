import type { Vec2 } from '../physics/collision';

export const BALL_W = 5;
export const BALL_H = 4;
export const BASE_BALL_SPEED = 2.0;
export const MAX_BALL_SPEED = 5.0;
export const SLOW_BALL_SPEED = 1.5;
export const CEILING_HIT_STEP = 0.25;
export const BRICK_HIT_STEP = 0.05;
export const BRICK_HIT_INTERVAL = 10;

export interface BallState {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  speed: number;
  active: boolean;
  stuckToVaus: boolean;
  stuckOffsetX: number;
  autoReleaseTick: number;
  ceilingHitThisRound: boolean;
  brickHitCounter: number;
  loopCounter: number;
  lastCollisionId: number;
}

export function createBall(x: number, y: number): BallState {
  return {
    x, y,
    w: BALL_W, h: BALL_H,
    vx: 0, vy: 0,
    speed: BASE_BALL_SPEED,
    active: false,
    stuckToVaus: true,
    stuckOffsetX: 0,
    autoReleaseTick: 0,
    ceilingHitThisRound: false,
    brickHitCounter: 0,
    loopCounter: 0,
    lastCollisionId: 0,
  };
}

export function launchBall(ball: BallState, vausCx: number, fieldW: number, speed = BASE_BALL_SPEED): void {
  ball.speed = speed;
  const launchRight = vausCx >= fieldW / 2;
  const angleRad = launchRight ? 60 * (Math.PI / 180) : 120 * (Math.PI / 180);
  ball.vx = Math.sin(angleRad) * speed;
  ball.vy = -Math.cos(angleRad) * speed;
  ball.active = true;
  ball.stuckToVaus = false;
  ball.ceilingHitThisRound = false;
  ball.brickHitCounter = 0;
  ball.loopCounter = 0;
}
