// Level data generator for 36 rounds (US NES)
import { LevelData, CellData } from './levelSchema';
export type { LevelData, CellData };

const BRICK_TYPES = ['WHITE', 'ORANGE', 'LIGHT_BLUE', 'GREEN', 'RED', 'BLUE', 'PINK', 'YELLOW'];

function createEmptyCells(): CellData[] {
  const cells: CellData[] = [];
  for (let row = 0; row < 28; row++) {
    for (let col = 0; col < 11; col++) {
      cells.push({
        col,
        row,
        type: 'EMPTY',
        hitsRemaining: 0,
        capsule: null,
        isCapsuleCarrier: false,
        clearRequired: false,
      });
    }
  }
  return cells;
}

function getCell(cells: CellData[], col: number, row: number): CellData {
  return cells[row * 11 + col];
}

function setBrick(cells: CellData[], col: number, row: number, type: string, capsule?: string): void {
  const cell = getCell(cells, col, row);
  cell.type = type;
  cell.hitsRemaining = type === 'SILVER' ? 2 : type === 'GOLD' ? 999 : 1;
  cell.clearRequired = type !== 'GOLD' && type !== 'EMPTY';
  cell.capsule = capsule || null;
  cell.isCapsuleCarrier = !!capsule;
}

// Generate a round with a simple pattern
function generateRound(roundNum: number): LevelData {
  const cells = createEmptyCells();
  const pattern = roundNum % 7;

  // Simple pattern generation
  for (let row = 4; row < 20; row++) {
    for (let col = 0; col < 11; col++) {
      const shouldPlace = (() => {
        switch (pattern) {
          case 0: return row % 2 === 0; // Every other row
          case 1: return col % 2 === 0; // Every other column
          case 2: return (row + col) % 2 === 0; // Checkerboard
          case 3: return col >= 2 && col <= 8; // Center block
          case 4: return row >= 8 && row <= 14; // Middle rows
          case 5: return (col === 0 || col === 10) || (row === 4 || row === 19); // Border
          case 6: return Math.abs(col - 5) + Math.abs(row - 12) < 6; // Diamond
          default: return true;
        }
      })();

      if (shouldPlace) {
        const type = BRICK_TYPES[(row + col + roundNum) % BRICK_TYPES.length];
        const capsule = (row * 11 + col) % 17 === 0 ? 'D' : undefined; // Scattered capsules
        setBrick(cells, col, row, type, capsule);
      }
    }
  }

  // Add silver bricks in later rounds
  if (roundNum > 10) {
    for (let i = 0; i < Math.min(roundNum - 10, 5); i++) {
      const col = (roundNum + i * 3) % 11;
      const row = 6 + i * 2;
      setBrick(cells, col, row, 'SILVER');
    }
  }

  // Add gold bricks in later rounds
  if (roundNum > 20) {
    for (let i = 0; i < Math.min(roundNum - 20, 3); i++) {
      const col = 3 + i * 2;
      const row = 10;
      setBrick(cells, col, row, 'GOLD');
    }
  }

  const clearRequiredCount = cells.filter((c) => c.clearRequired).length;

  return {
    id: `us-round-${String(roundNum).padStart(2, '0')}`,
    region: 'US',
    roundNumber: roundNum,
    type: 'brick',
    grid: {
      columns: 11,
      rows: 28,
      brickWidth: 16,
      brickHeight: 8,
    },
    clearRequiredCount,
    cells,
    enemyProfile: `default-round-${String(roundNum).padStart(2, '0')}`,
    ballProfile: `default-round-${String(roundNum).padStart(2, '0')}`,
    paletteProfile: `us-round-${String(roundNum).padStart(2, '0')}`,
  };
}

// Generate boss round (Round 36)
function generateBossRound(): LevelData {
  const cells = createEmptyCells();
  return {
    id: 'us-round-36-boss',
    region: 'US',
    roundNumber: 36,
    type: 'boss',
    grid: {
      columns: 11,
      rows: 28,
      brickWidth: 16,
      brickHeight: 8,
    },
    clearRequiredCount: 0,
    cells,
    enemyProfile: 'boss',
    ballProfile: 'boss',
    paletteProfile: 'us-round-36',
  };
}

// Generate all 36 rounds
export function generateAllLevels(): LevelData[] {
  const levels: LevelData[] = [];
  for (let i = 1; i <= 35; i++) {
    levels.push(generateRound(i));
  }
  levels.push(generateBossRound());
  return levels;
}

// Get level by round number
export function getLevel(round: number): LevelData {
  if (round === 36) return generateBossRound();
  return generateRound(round);
}