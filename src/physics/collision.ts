/**
 * Collision detection & resolution — PRD §19.5.
 *
 * AABB-based. The ball sub-steps its movement (≤ ~2 px per step) so overlaps are
 * shallow. When the ball overlaps multiple bricks in one sub-step, exactly one
 * deterministic contact is resolved: the brick whose face the swept center crosses
 * first (approximated by smallest penetration depth — most-recently entered), ties
 * broken by lowest cell index. One brick is destroyed per resolved contact and the
 * ball reflects along that face's normal; for a corner the normal is the axis of
 * smaller penetration.
 */
import { Fx } from '../core/fixedpoint';
import { Ball } from '../entities/ball';
import { Brick, BrickField } from '../entities/bricks';
import { GRID_COLS } from '../core/constants';

export interface Rect {
  x: Fx;
  y: Fx;
  w: Fx;
  h: Fx;
}

export function ballRect(ball: Ball): Rect {
  return { x: ball.x, y: ball.y, w: ball.w, h: ball.h };
}

export function overlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export interface ResolvedContact {
  brick: Brick;
  normal: 'x' | 'y';
}

/**
 * Find the single resolved brick contact for the ball among the field.
 * Returns null if no overlap. Deterministic ordering: penetration asc, then the
 * brick's linear cell index (row*COLS+col) asc.
 */
export function resolveBrickContact(ball: Ball, field: BrickField): ResolvedContact | null {
  const br = ballRect(ball);
  let best: ResolvedContact | null = null;
  let bestKey = Number.POSITIVE_INFINITY;

  for (const brick of field.live()) {
    const ba = field.aabb(brick);
    if (!overlap(br, ba)) continue;
    const overlapX = Math.min(br.x + br.w - ba.x, ba.x + ba.w - br.x);
    const overlapY = Math.min(br.y + br.h - ba.y, ba.y + ba.h - br.y);
    const pen = Math.min(overlapX, overlapY);
    const normal: 'x' | 'y' = overlapX < overlapY ? 'x' : 'y';
    const cellIndex = brick.row * GRID_COLS + brick.col;
    // Penetration scaled so cellIndex only breaks true ties.
    const key = pen * 1e6 + cellIndex;
    if (key < bestKey) {
      bestKey = key;
      best = { brick, normal };
    }
  }
  return best;
}
