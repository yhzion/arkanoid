export type BrickType =
  | 'EMPTY' | 'WHITE' | 'ORANGE' | 'LIGHT_BLUE' | 'GREEN'
  | 'RED' | 'BLUE' | 'PINK' | 'YELLOW' | 'SILVER' | 'GOLD';

export type CapsuleType = 'S' | 'C' | 'L' | 'D' | 'P' | 'E' | 'B';

export interface IBrickCell {
  col: number;
  row: number;
  type: BrickType;
  hitsRemaining: number;
  isCapsuleCarrier: boolean;
  clearRequired: boolean;
}

export interface ILevelData {
  id: string;
  region: 'US' | 'JP';
  roundNumber: number;
  type: 'brick' | 'boss';
  grid: { columns: number; rows: number; brickWidth: number; brickHeight: number };
  clearRequiredCount: number;
  cells: IBrickCell[];
}

export function silverHits(round: number): number {
  return 2 + Math.floor((round - 1) / 8);
}

export function validateLevel(level: ILevelData): string[] {
  const errors: string[] = [];
  if (level.grid.columns !== 11) errors.push('Grid must have 11 columns');
  if (level.grid.rows !== 28) errors.push('Grid must have 28 rows');
  if (level.grid.brickWidth !== 16) errors.push('Brick width must be 16');
  if (level.grid.brickHeight !== 8) errors.push('Brick height must be 8');

  let clearCount = 0;
  for (const cell of level.cells) {
    if (cell.col < 0 || cell.col >= 11) errors.push(`Cell col ${cell.col} out of bounds`);
    if (cell.row < 0 || cell.row >= 28) errors.push(`Cell row ${cell.row} out of bounds`);
    if (cell.clearRequired) clearCount++;
    if (cell.type === 'GOLD' && cell.clearRequired) errors.push(`Gold brick at ${cell.col},${cell.row} cannot be clear-required`);
  }
  if (clearCount !== level.clearRequiredCount) {
    errors.push(`clearRequiredCount ${level.clearRequiredCount} != actual ${clearCount}`);
  }
  return errors;
}
