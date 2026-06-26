import { toFx, fromFx, fxMul, fxDiv, fxClamp, fxAbs, FX_ONE, FX_HALF } from './fixed';

export interface AABB {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

export function aabbOverlap(a: AABB, b: AABB): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export interface CollisionResult {
  hit: boolean;
  normal: Vec2;
  penetration: number;
}

export function aabbCollision(ball: AABB, other: AABB): CollisionResult {
  const overlapX = Math.min(ball.x + ball.w - other.x, other.x + other.w - ball.x);
  const overlapY = Math.min(ball.y + ball.h - other.y, other.y + other.h - ball.y);

  if (overlapX <= 0 || overlapY <= 0) return { hit: false, normal: { x: 0, y: 0 }, penetration: 0 };

  if (overlapX < overlapY) {
    const sign = ball.x + ball.w / 2 < other.x + other.w / 2 ? -1 : 1;
    return { hit: true, normal: { x: sign, y: 0 }, penetration: overlapX };
  } else {
    const sign = ball.y + ball.h / 2 < other.y + other.h / 2 ? -1 : 1;
    return { hit: true, normal: { x: 0, y: sign }, penetration: overlapY };
  }
}

export function reflectVelocity(vx: number, vy: number, normal: Vec2, speed: number): Vec2 {
  if (normal.x !== 0) vx = -vx;
  if (normal.y !== 0) vy = -vy;
  const len = Math.sqrt(vx * vx + vy * vy);
  if (len === 0) return { x: 0, y: -speed };
  return { x: (vx / len) * speed, y: (vy / len) * speed };
}

export const ANGLE_TABLE: { vx: number; vy: number }[] = (() => {
  const table: { vx: number; vy: number }[] = [];
  for (let i = 0; i <= 256; i++) {
    const angle = (i / 256) * 75 * (Math.PI / 180);
    table.push({ vx: Math.sin(angle), vy: -Math.cos(angle) });
  }
  return table;
})();

export const ZONE_ANGLES = [75, 55, 35, 15, 15, 35, 55, 75];

export function deflectBall(
  ballX: number, vausCx: number, vausW: number, speed: number, model: 'continuous' | 'discrete8'
): Vec2 {
  const relative = ballX - vausCx;
  const halfW = vausW / 2;
  let factor = fxDiv(toFx(relative), toFx(halfW));
  factor = fxClamp(factor, -FX_ONE, FX_ONE);

  if (model === 'discrete8') {
    const zone = Math.floor((fromFx(factor) + 1) / 2 * 8);
    const clamped = Math.min(Math.max(zone, 0), 7);
    const angleDeg = ZONE_ANGLES[clamped];
    const rad = angleDeg * (Math.PI / 180);
    return { x: Math.sin(rad) * speed, y: -Math.cos(rad) * speed };
  }

  const index = Math.round(((fromFx(factor) + 1) / 2) * 256);
  const clampedIdx = Math.min(Math.max(index, 0), 256);
  const unit = ANGLE_TABLE[clampedIdx];

  const minAngle = 10 * (Math.PI / 180);
  let vy = unit.vy;
  let vx = unit.vx;
  if (Math.abs(vx) < Math.sin(minAngle)) {
    const sign = vx >= 0 ? 1 : -1;
    vx = Math.sin(minAngle) * sign;
    vy = -Math.cos(minAngle);
  }

  return { x: vx * speed, y: vy * speed };
}

export function wallBounce(vx: number, vy: number, x: number, y: number, w: number, h: number, fieldW: number, fieldH: number): { vx: number; vy: number; wallHit: boolean; ceilingHit: boolean } {
  let wallHit = false;
  let ceilingHit = false;
  if (x < 0) { x = 0; vx = -vx; wallHit = true; }
  if (x + w > fieldW) { x = fieldW - w; vx = -vx; wallHit = true; }
  if (y < 0) { y = 0; vy = -vy; ceilingHit = true; }
  return { vx, vy, wallHit, ceilingHit };
}
