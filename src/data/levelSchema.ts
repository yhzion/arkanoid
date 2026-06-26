// PRD §14.4: Level JSON Schema
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
  cells: CellData[];
  enemyProfile: string;
  ballProfile: string;
  paletteProfile: string;
}

export interface CellData {
  col: number;
  row: number;
  type: string;
  hitsRemaining: number;
  capsule: string | null;
  isCapsuleCarrier: boolean;
  clearRequired: boolean;
}

// PRD §14.4: Level schema validation
export function validateLevel(data: LevelData): string[] {
  const errors: string[] = [];

  if (data.grid.columns !== 11 || data.grid.rows !== 28) {
    errors.push('Grid must be 11x28');
  }

  if (data.cells.length !== 11 * 28) {
    errors.push('Cell count must be 308');
  }

  const clearRequired = data.cells.filter((c) => c.clearRequired).length;
  if (clearRequired !== data.clearRequiredCount) {
    errors.push('clearRequiredCount mismatch');
  }

  for (const cell of data.cells) {
    if (cell.col < 0 || cell.col > 10) errors.push(`Invalid col: ${cell.col}`);
    if (cell.row < 0 || cell.row > 27) errors.push(`Invalid row: ${cell.row}`);
    if (cell.type === 'GOLD' && cell.clearRequired) {
      errors.push('Gold bricks cannot be clear-required');
    }
  }

  return errors;
}