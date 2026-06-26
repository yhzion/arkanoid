import { Fx, fx, fxFloor, fxMul, fxDiv, FX_ONE, FX_NEG_ONE, fxClamp } from '../physics/fixedPoint';
import { AABB } from '../physics/collision';
import { UNIT_VECTOR_LUT, angleToIndex, DISCRETE8_INDEX, DISCRETE8_ANGLES } from '../physics/angleTable';
import { Vaus, VAUS_NORMAL_WIDTH, VAUS_ENLARGED_WIDTH, PLAYFIELD_LEFT, PLAYFIELD_RIGHT } from './vaus';

export const BALL_SIZE = 5;
export const BASE_BALL_SPEED = 2.0;
export const SLOW_BALL_SPEED = 1.5;
export const MAX_BALL_SPEED = 5.0;
export const CEILING_SPEED_STEP = 0.25;
export const BRICK_HIT_SPEED_STEP = 0.05;

export interface BallState {
  x: Fx;
  y: Fx;
  vx: Fx;
  vy: Fx;
  speed: Fx;
  active: boolean;
  caught: boolean;
  speedHits: number;
  ceilingHitUsed: boolean;
  loopCount: number;
}

export function createBall(): BallState {
  return {
    x: fx(0),
    y: fx(0),
    vx: fx(0),
    vy: fx(0),
    speed: fx(BASE_BALL_SPEED),
    active: false,
    caught: true,
    speedHits: 0,
    ceilingHitUsed: false,
    loopCount: 0,
  };
}

export function attachBallToVaus(ball: BallState, vaus: Vaus): void {
  ball.x = fx(fxFloor(vaus.centerX()) - BALL_SIZE / 2);
  ball.y = fx(fxFloor(vaus.y) - BALL_SIZE);
  ball.vx = fx(0);
  ball.vy = fx(0);
  ball.active = false;
  ball.caught = true;
}

export function launchBall(ball: BallState, vaus: Vaus, rng?: () => number): void {
  const vausCenter = fxFloor(vaus.centerX());
  const launchRight = vausCenter >= 128;
  const angleDeg = launchRight ? 60 : 120;
  const idx = angleToIndex(angleDeg);
  const unit = UNIT_VECTOR_LUT[idx]!;
  ball.speed = fx(BASE_BALL_SPEED);
  ball.vx = fxMul(unit.vx, ball.speed);
  ball.vy = fxMul(unit.vy, ball.speed);
  ball.active = true;
  ball.caught = false;
  ball.speedHits = 0;
  ball.ceilingHitUsed = false;
  ball.loopCount = 0;
}

export function deflectBall(ball: BallState, vaus: Vaus, model: 'continuous' | 'discrete8'): void {
  const vausCenter = fxFloor(vaus.centerX());
  const ballCenter = fxFloor(ball.x) + BALL_SIZE / 2;
  const relative = ballCenter - vausCenter;
  const halfWidth = vaus.width / 2;
  const scale = relative / halfWidth;
  const clamped = Math.max(-1, Math.min(1, scale));

  let angleDeg: number;
  if (model === 'discrete8') {
    const q = Math.round((clamped + 1) * 128 / 256);
    const zoneIdx = Math.min(255, Math.max(0, Math.round(q * 255)));
    const zone = DISCRETE8_INDEX[zoneIdx]!;
    angleDeg = DISCRETE8_ANGLES[zone]!;
  } else {
    const q = Math.round((clamped + 1) * 128);
    const idx = Math.min(256, Math.max(0, q));
    angleDeg = (idx / 256) * 180 - 90;
    if (Math.abs(angleDeg) < 10) {
      angleDeg = angleDeg >= 0 ? 10 : -10;
    }
  }

  const idx = angleToIndex(angleDeg);
  const unit = UNIT_VECTOR_LUT[idx]!;
  ball.vx = fxMul(unit.vx, ball.speed);
  ball.vy = fxMul(unit.vy, ball.speed);
  ball.loopCount = 0;
}

export function updateBall(ball: BallState, dt: number = 1): void {
  if (!ball.active || ball.caught) return;
  ball.x = fx(fxFloor(ball.x) + fxFloor(fxMul(ball.vx, fx(dt))));
  ball.y = fx(fxFloor(ball.y) + fxFloor(fxMul(ball.vy, fx(dt))));
}

export function ballAABB(ball: BallState): AABB {
  return { x: ball.x, y: ball.y, w: BALL_SIZE, h: BALL_SIZE };
}
