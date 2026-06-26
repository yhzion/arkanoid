// PRD §14.5: Brick type codes
export type BrickType =
  | 'EMPTY'
  | 'WHITE'
  | 'ORANGE'
  | 'LIGHT_BLUE'
  | 'GREEN'
  | 'RED'
  | 'BLUE'
  | 'PINK'
  | 'YELLOW'
  | 'SILVER'
  | 'GOLD';

// PRD §11.3: Colored brick scores
export const BRICK_SCORES: Record<string, number> = {
  WHITE: 50,
  ORANGE: 60,
  LIGHT_BLUE: 70,
  GREEN: 80,
  RED: 90,
  BLUE: 100,
  PINK: 110,
  YELLOW: 120,
};

// PRD §11.4: Silver brick hits formula
export function silverHits(round: number): number {
  return 2 + Math.floor((round - 1) / 8);
}

export class Brick {
  col: number;
  row: number;
  type: BrickType;
  hitsRemaining: number;
  capsule: string | null;
  isCapsuleCarrier: boolean;
  clearRequired: boolean;
  destroyed = false;
  x: number;
  y: number;
  w = 16;
  h = 8;

  constructor(data: {
    col: number;
    row: number;
    type: BrickType;
    hitsRemaining: number;
    capsule: string | null;
    isCapsuleCarrier: boolean;
    clearRequired: boolean;
  }) {
    this.col = data.col;
    this.row = data.row;
    this.type = data.type;
    this.hitsRemaining = data.hitsRemaining;
    this.capsule = data.capsule;
    this.isCapsuleCarrier = data.isCapsuleCarrier;
    this.clearRequired = data.clearRequired;
    this.x = 8 + this.col * 16;
    this.y = 8 + this.row * 8;
  }

  hit(): boolean {
    if (this.type === 'GOLD') return false;
    if (this.type === 'SILVER') {
      this.hitsRemaining--;
      if (this.hitsRemaining <= 0) {
        this.destroyed = true;
        return true;
      }
      return false;
    }
    this.destroyed = true;
    return true;
  }

  getScore(round: number): number {
    if (this.type === 'SILVER') return 50 * round;
    return BRICK_SCORES[this.type] ?? 0;
  }
}