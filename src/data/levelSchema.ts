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

export type CapsuleType = 'S' | 'C' | 'L' | 'D' | 'P' | 'E' | 'B' | null;

export interface IBrickCell {
  col: number;
  row: number;
  type: BrickType;
  hitsRemaining: number;
  capsule: CapsuleType;
  isCapsuleCarrier: boolean;
  clearRequired: boolean;
}

export interface ILevelData {
  id: string;
  region: 'US' | 'JP';
  roundNumber: number;
  type: 'brick' | 'boss';
  grid: {
    columns: number;
    rows: number;
    brickWidth: number;
    brickHeight: number;
  };
  clearRequiredCount: number;
  cells: IBrickCell[];
  enemyProfile: string;
  ballProfile: string;
  paletteProfile: string;
}

export function silverHits(round: number): number {
  return 2 + Math.floor((round - 1) / 8);
}

export function validateLevel(level: ILevelData): string[] {
  const errors: string[] = [];
  if (level.grid.columns !== 11) errors.push(`columns must be 11, got ${level.grid.columns}`);
  if (level.grid.rows !== 28) errors.push(`rows must be 28, got ${level.grid.rows}`);
  if (level.cells.length !== level.grid.columns * level.grid.rows) {
    errors.push(`cells length ${level.cells.length} != ${level.grid.columns * level.grid.rows}`);
  }
  const validTypes: BrickType[] = ['EMPTY','WHITE','ORANGE','LIGHT_BLUE','GREEN','RED','BLUE','PINK','YELLOW','SILVER','GOLD'];
  let clearCount = 0;
  for (const cell of level.cells) {
    if (!validTypes.includes(cell.type)) errors.push(`cell (${cell.col},${cell.row}): invalid type ${cell.type}`);
    if (cell.col < 0 || cell.col >= level.grid.columns) errors.push(`cell col ${cell.col} out of range`);
    if (cell.row < 0 || cell.row >= level.grid.rows) errors.push(`cell row ${cell.row} out of range`);
    if (cell.type === 'GOLD' && cell.clearRequired) errors.push(`cell (${cell.col},${cell.row}): gold brick cannot be clearRequired`);
    if (cell.clearRequired) clearCount++;
    if (cell.capsule && !['S','C','L','D','P','E','B'].includes(cell.capsule)) {
      errors.push(`cell (${cell.col},${cell.row}): invalid capsule ${cell.capsule}`);
    }
  }
  if (clearCount !== level.clearRequiredCount) {
    errors.push(`clearRequiredCount ${level.clearRequiredCount} != actual ${clearCount}`);
  }
  return errors;
}
