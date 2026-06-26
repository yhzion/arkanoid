import { Fx, fx, fxFloor } from '../physics/fixedPoint';
import { AABB } from '../physics/collision';
import { LevelData, BrickCell, BrickType, silverHits } from '../data/levelSchema';

export interface BrickGridCell {
  type: BrickType;
  hitsRemaining: number;
  capsule: string | null;
  isCapsuleCarrier: boolean;
  clearRequired: boolean;
}

export const BRICK_WIDTH = 16;
export const BRICK_HEIGHT = 8;
export const GRID_COLS = 11;
export const GRID_ROWS = 28;
export const GRID_ORIGIN_X = 16;
export const GRID_ORIGIN_Y = 16;

export class BrickManager {
  grid: BrickGridCell[][] = [];
  cleared = false;

  loadFromLevel(level: LevelData): void {
    this.grid = [];
    this.cleared = false;
    for (let row = 0; row < GRID_ROWS; row++) {
      this.grid[row] = [];
      for (let col = 0; col < GRID_COLS; col++) {
        this.grid[row]![col] = { type: 'EMPTY', hitsRemaining: 0, capsule: null, isCapsuleCarrier: false, clearRequired: false };
      }
    }
    for (const cell of level.cells) {
      if (cell.row >= 0 && cell.row < GRID_ROWS && cell.col >= 0 && cell.col < GRID_COLS) {
        const hits = cell.type === 'SILVER' ? (cell.hitsRemaining || silverHits(level.roundNumber)) : (cell.type === 'EMPTY' || cell.type === 'GOLD' ? 0 : 1);
        this.grid[cell.row]![cell.col] = {
          type: cell.type,
          hitsRemaining: hits,
          capsule: cell.capsule,
          isCapsuleCarrier: cell.isCapsuleCarrier,
          clearRequired: cell.clearRequired,
        };
      }
    }
  }

  getCell(col: number, row: number): BrickGridCell | null {
    if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) return null;
    return this.grid[row]![col] ?? null;
  }

  isDestroyed(col: number, row: number): boolean {
    const cell = this.getCell(col, row);
    return cell === null || cell.type === 'EMPTY';
  }

  getAABB(col: number, row: number): AABB {
    return {
      x: fx(GRID_ORIGIN_X + col * BRICK_WIDTH),
      y: fx(GRID_ORIGIN_Y + row * BRICK_HEIGHT),
      w: BRICK_WIDTH,
      h: BRICK_HEIGHT,
    };
  }

  hit(col: number, row: number): { destroyed: boolean; points: number } {
    const cell = this.getCell(col, row);
    if (!cell || cell.type === 'EMPTY' || cell.type === 'GOLD') {
      return { destroyed: false, points: 0 };
    }
    cell.hitsRemaining--;
    if (cell.hitsRemaining <= 0) {
      cell.type = 'EMPTY';
      return { destroyed: true, points: this.getPointValue(col, row) };
    }
    return { destroyed: false, points: 0 };
  }

  private getPointValue(col: number, row: number): number {
    const cell = this.getCell(col, row);
    if (!cell) return 0;
    const scores: Record<string, number> = {
      WHITE: 50, ORANGE: 60, LIGHT_BLUE: 70, GREEN: 80,
      RED: 90, BLUE: 100, PINK: 110, YELLOW: 120,
      SILVER: 0, GOLD: 0, EMPTY: 0,
    };
    return scores[cell.type] ?? 0;
  }

  checkClear(): boolean {
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const cell = this.grid[row]![col]!;
        if (cell.clearRequired && cell.type !== 'EMPTY') return false;
      }
    }
    this.cleared = true;
    return true;
  }

  getRemainingClearCount(): number {
    let count = 0;
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const cell = this.grid[row]![col]!;
        if (cell.clearRequired && cell.type !== 'EMPTY') count++;
      }
    }
    return count;
  }
}
