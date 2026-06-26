// PRD §6.2: Playfield geometry
export const PLAYFIELD_WIDTH = 192;
export const PLAYFIELD_HEIGHT = 232;
export const WALL_THICKNESS = 8;
export const BRICK_WIDTH = 16;
export const BRICK_HEIGHT = 8;
export const BRICK_COLS = 11;
export const BRICK_ROWS = 28;
export const CANVAS_WIDTH = 256;
export const CANVAS_HEIGHT = 240;

// Grid origin: (left wall + 8, top inset + 8)
export const GRID_ORIGIN_X = WALL_THICKNESS + 8;
export const GRID_ORIGIN_Y = WALL_THICKNESS + 8;

export interface AABB {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function overlaps(a: AABB, b: AABB): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function contains(a: AABB, px: number, py: number): boolean {
  return px >= a.x && px < a.x + a.w && py >= a.y && py < a.y + a.h;
}

// PRD §19.5: Nearest-face normal for AABB collision
export interface CollisionResult {
  normal: { x: number; y: number };
  penetration: number;
}

export function nearestFace(ball: AABB, brick: AABB): CollisionResult {
  const ballCx = ball.x + ball.w / 2;
  const ballCy = ball.y + ball.h / 2;
  const brickCx = brick.x + brick.w / 2;
  const brickCy = brick.y + brick.h / 2;

  const dx = ballCx - brickCx;
  const dy = ballCy - brickCy;

  const overlapX = (ball.w + brick.w) / 2 - Math.abs(dx);
  const overlapY = (ball.h + brick.h) / 2 - Math.abs(dy);

  if (overlapX < overlapY) {
    return {
      normal: { x: dx > 0 ? 1 : -1, y: 0 },
      penetration: overlapX,
    };
  } else {
    return {
      normal: { x: 0, y: dy > 0 ? 1 : -1 },
      penetration: overlapY,
    };
  }
}