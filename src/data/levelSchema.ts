export type BrickType =
  | 'EMPTY' | 'WHITE' | 'ORANGE' | 'LIGHT_BLUE' | 'GREEN'
  | 'RED' | 'BLUE' | 'PINK' | 'YELLOW' | 'SILVER' | 'GOLD';

export type CapsuleType = 'S' | 'C' | 'L' | 'D' | 'P' | 'E' | 'B';

export interface BrickCell {
  col: number;
  row: number;
  type: BrickType;
  hitsRemaining: number;
  capsule: CapsuleType | null;
  isCapsuleCarrier: boolean;
  clearRequired: boolean;
}

export interface LevelData {
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
  cells: BrickCell[];
  enemyProfile: string;
  ballProfile: string;
  paletteProfile: string;
}

export interface GameConfig {
  region: 'US' | 'JP';
  mode: 'licensed-fidelity' | 'clean-room';
  enableManualLevelSkipSecret: boolean;
  enableHighScoreNameEntry: boolean;
  enableTwoPlayerMode: boolean;
  inputMode: 'keyboard' | 'gamepad' | 'relative-pointer' | 'absolute-pointer' | 'touch';
  renderScaleMode: 'integer' | 'fit';
  audioEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
  deflectionModel: 'continuous' | 'discrete8';
  jitterEnabled: boolean;
  numericModel: string;
  deterministicSeed: string;
}

export const BRICK_SCORES: Record<string, number> = {
  WHITE: 50,
  ORANGE: 60,
  LIGHT_BLUE: 70,
  GREEN: 80,
  RED: 90,
  BLUE: 100,
  PINK: 110,
  YELLOW: 120,
  SILVER: 0,
  GOLD: 0,
};

export function silverHitScore(round: number): number {
  return 50 * round;
}

export function silverHits(round: number): number {
  return 2 + Math.floor((round - 1) / 8);
}

export function validateLevel(level: LevelData): string[] {
  const errors: string[] = [];
  if (level.grid.columns !== 11) errors.push('grid.columns must be 11');
  if (level.grid.rows !== 28) errors.push('grid.rows must be 28');
  if (level.grid.brickWidth !== 16) errors.push('grid.brickWidth must be 16');
  if (level.grid.brickHeight !== 8) errors.push('grid.brickHeight must be 8');

  const validTypes: BrickType[] = ['EMPTY','WHITE','ORANGE','LIGHT_BLUE','GREEN','RED','BLUE','PINK','YELLOW','SILVER','GOLD'];
  const validCapsules: CapsuleType[] = ['S','C','L','D','P','E','B'];

  for (const cell of level.cells) {
    if (cell.col < 0 || cell.col >= level.grid.columns) errors.push(`cell col ${cell.col} out of range`);
    if (cell.row < 0 || cell.row >= level.grid.rows) errors.push(`cell row ${cell.row} out of range`);
    if (!validTypes.includes(cell.type)) errors.push(`invalid type ${cell.type} at ${cell.col},${cell.row}`);
    if (cell.capsule && !validCapsules.includes(cell.capsule)) errors.push(`invalid capsule ${cell.capsule} at ${cell.col},${cell.row}`);
    if (cell.type === 'GOLD' && cell.clearRequired) errors.push(`gold brick marked clearRequired at ${cell.col},${cell.row}`);
  }

  let clearCount = 0;
  for (const cell of level.cells) {
    if (cell.clearRequired) clearCount++;
  }
  if (level.clearRequiredCount !== clearCount) {
    errors.push(`clearRequiredCount mismatch: declared ${level.clearRequiredCount}, actual ${clearCount}`);
  }

  if (level.type === 'boss' && level.cells.length > 0) {
    errors.push('boss round should have empty cells');
  }

  return errors;
}
