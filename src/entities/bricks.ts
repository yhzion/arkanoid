/**
 * Brick field — PRD §11, §14.
 *
 * Holds the per-cell brick state derived from level data, provides AABBs for
 * collision, and tracks the clear-required count. Silver bricks decrement on hit
 * (authoritative hitsRemaining, §11.4); gold is indestructible (reflect only);
 * colored bricks are destroyed in one hit.
 */
import { Fx, fromInt } from '../core/fixedpoint';
import { BRICK_H, BRICK_W, GRID_COLS, GRID_ORIGIN_X, GRID_ORIGIN_Y, GRID_ROWS } from '../core/constants';
import { BrickType, ILevelData } from '../data/schemas';

export interface Brick {
  col: number;
  row: number;
  type: BrickType;
  hitsRemaining: number;
  alive: boolean;
  clearRequired: boolean;
  isCapsuleCarrier: boolean;
}

export interface BrickAABB {
  x: Fx;
  y: Fx;
  w: Fx;
  h: Fx;
}

export class BrickField {
  private cells: Map<number, Brick> = new Map(); // key = row*COLS + col
  /** Remaining clear-required bricks (colored + silver, never gold). */
  clearRemaining = 0;

  constructor(level: ILevelData) {
    for (const c of level.cells) {
      if (c.type === 'EMPTY') continue;
      const b: Brick = {
        col: c.col,
        row: c.row,
        type: c.type,
        hitsRemaining: c.hitsRemaining,
        alive: true,
        clearRequired: c.clearRequired,
        isCapsuleCarrier: c.isCapsuleCarrier,
      };
      this.cells.set(this.key(c.col, c.row), b);
      if (b.clearRequired) this.clearRemaining++;
    }
  }

  private key(col: number, row: number): number {
    return row * GRID_COLS + col;
  }

  get(col: number, row: number): Brick | undefined {
    return this.cells.get(this.key(col, row));
  }

  /** All live bricks (for spatial iteration). */
  live(): Brick[] {
    const out: Brick[] = [];
    for (const b of this.cells.values()) if (b.alive) out.push(b);
    return out;
  }

  aabb(b: Brick): BrickAABB {
    return {
      x: fromInt(GRID_ORIGIN_X + b.col * BRICK_W),
      y: fromInt(GRID_ORIGIN_Y + b.row * BRICK_H),
      w: fromInt(BRICK_W),
      h: fromInt(BRICK_H),
    };
  }

  /**
   * Apply one hit to a brick. Returns 'destroyed' | 'damaged' | 'indestructible'.
   * Colored → destroyed. Silver → decrement; destroyed at 0. Gold → indestructible.
   */
  hit(b: Brick): 'destroyed' | 'damaged' | 'indestructible' {
    if (b.type === 'GOLD') return 'indestructible';
    if (b.hitsRemaining > 1) {
      b.hitsRemaining--;
      return 'damaged';
    }
    this.destroy(b);
    return 'destroyed';
  }

  destroy(b: Brick): void {
    if (!b.alive) return;
    b.alive = false;
    if (b.clearRequired && this.clearRemaining > 0) this.clearRemaining--;
  }

  /** Grid dims (for tools/iteration). */
  get cols(): number {
    return GRID_COLS;
  }
  get rows(): number {
    return GRID_ROWS;
  }
}
