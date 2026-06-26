import { Fx, fxFloor } from './fixedPoint';

export interface AABB {
  x: Fx;
  y: Fx;
  w: number;
  h: number;
}

export function aabbOverlap(a: AABB, b: AABB): boolean {
  const ax1 = fxFloor(a.x);
  const ax2 = ax1 + a.w;
  const ay1 = fxFloor(a.y);
  const ay2 = ay1 + a.h;
  const bx1 = fxFloor(b.x);
  const bx2 = bx1 + b.w;
  const by1 = fxFloor(b.y);
  const by2 = by1 + b.h;
  return ax1 < bx2 && ax2 > bx1 && ay1 < by2 && ay2 > by1;
}

export interface CollisionResult {
  collided: boolean;
  normal: 'top' | 'bottom' | 'left' | 'right' | null;
  overlapX: number;
  overlapY: number;
}

export function aabbCollision(a: AABB, b: AABB): CollisionResult {
  const ax1 = fxFloor(a.x);
  const ax2 = ax1 + a.w;
  const ay1 = fxFloor(a.y);
  const ay2 = ay1 + a.h;
  const bx1 = fxFloor(b.x);
  const bx2 = bx1 + b.w;
  const by1 = fxFloor(b.y);
  const by2 = by1 + b.h;

  if (ax1 >= bx2 || ax2 <= bx1 || ay1 >= by2 || ay2 <= by1) {
    return { collided: false, normal: null, overlapX: 0, overlapY: 0 };
  }

  const overlapLeft = (ax2 - bx1);
  const overlapRight = (bx2 - ax1);
  const overlapTop = (ay2 - by1);
  const overlapBottom = (by2 - ay1);

  const minOverlapX = overlapLeft < overlapRight ? overlapLeft : overlapRight;
  const minOverlapY = overlapTop < overlapBottom ? overlapTop : overlapBottom;
  const overlapX = overlapLeft < overlapRight ? overlapLeft : -overlapRight;
  const overlapY = overlapTop < overlapBottom ? overlapTop : -overlapBottom;

  let normal: CollisionResult['normal'];
  if (minOverlapX < minOverlapY) {
    normal = overlapLeft < overlapRight ? 'left' : 'right';
  } else {
    normal = overlapTop < overlapBottom ? 'top' : 'bottom';
  }

  return { collided: true, normal, overlapX, overlapY };
}

export function faceCollision(
  ballAABB: AABB,
  brickAABB: AABB,
): { collided: boolean; face: 'top' | 'bottom' | 'left' | 'right' | 'corner'; crossX: number; crossY: number } {
  const bx = fxFloor(ballAABB.x) + ballAABB.w / 2;
  const by = fxFloor(ballAABB.y) + ballAABB.h / 2;
  const rx1 = fxFloor(brickAABB.x);
  const ry1 = fxFloor(brickAABB.y);
  const rx2 = rx1 + brickAABB.w;
  const ry2 = ry1 + brickAABB.h;

  const crossX = bx < rx1 ? rx1 : bx > rx2 ? rx2 : bx;
  const crossY = by < ry1 ? ry1 : by > ry2 ? ry2 : by;

  const dx = bx - crossX;
  const dy = by - crossY;

  if (dx === 0 && dy === 0) {
    const cx = bx - (rx1 + brickAABB.w / 2);
    const cy = by - (ry1 + brickAABB.h / 2);
    if (Math.abs(cx) > Math.abs(cy)) {
      return { collided: true, face: cx > 0 ? 'right' : 'left', crossX, crossY };
    }
    return { collided: true, face: cy > 0 ? 'bottom' : 'top', crossX, crossY };
  }

  let face: 'top' | 'bottom' | 'left' | 'right' | 'corner';
  if (Math.abs(dx) > Math.abs(dy)) {
    face = dy > 0 ? 'bottom' : 'top';
  } else if (Math.abs(dy) > Math.abs(dx)) {
    face = dx > 0 ? 'right' : 'left';
  } else {
    face = 'corner';
  }

  return { collided: true, face, crossX, crossY };
}
