import type { ILevelData, BrickType, IBrickCell } from './levelSchema';

const COLORS: BrickType[] = ['WHITE','ORANGE','LIGHT_BLUE','GREEN','RED','BLUE','PINK','YELLOW'];

function brickType(c: number, r: number, round: number): { type: BrickType; hits: number; clear: boolean; carrier: boolean } {
  if (round > 10 && r < 2 && (c === 0 || c === 10)) return { type: 'GOLD', hits: 0, clear: false, carrier: false };
  if (round > 5 && r < 3 && c % 3 === 0) {
    const hits = 2 + Math.floor((round - 1) / 8);
    return { type: 'SILVER', hits, clear: true, carrier: false };
  }
  const type = COLORS[Math.abs((r * 11 + c + round * 7) % COLORS.length)];
  const carrier = round > 3 && Math.abs((r * 11 + c + round * 3) % 17) === 0;
  return { type, hits: 1, clear: true, carrier };
}

function generateRound(region: 'US' | 'JP', round: number, rows: number): ILevelData {
  const cells: IBrickCell[] = [];
  for (let r = 0; r < 28; r++) {
    for (let c = 0; c < 11; c++) {
      const brick = r < rows ? brickType(c, r, round) : { type: 'EMPTY' as BrickType, hits: 0, clear: false, carrier: false };
      cells.push({
        col: c, row: r,
        type: brick.type,
        hitsRemaining: brick.hits,
        capsule: null,
        isCapsuleCarrier: brick.carrier,
        clearRequired: brick.clear,
      });
    }
  }
  const clearRequiredCount = cells.filter(c => c.clearRequired).length;
  return {
    id: `${region.toLowerCase()}-round-${String(round).padStart(2, '0')}`,
    region,
    roundNumber: round,
    type: 'brick',
    grid: { columns: 11, rows: 28, brickWidth: 16, brickHeight: 8 },
    clearRequiredCount,
    cells,
    enemyProfile: `default-round-${String(round).padStart(2, '0')}`,
    ballProfile: `default-round-${String(round).padStart(2, '0')}`,
    paletteProfile: `${region.toLowerCase()}-round-${String(round).padStart(2, '0')}`,
  };
}

const ROW_PATTERNS: number[] = [
  4, 5, 5, 6, 6, 7, 7, 8, 8, 9,
  9, 10, 10, 10, 11, 11, 12, 12, 13, 13,
  14, 14, 15, 15, 16, 16, 17, 17, 18, 18,
  19, 19, 20, 20, 21,
];

export function generateAllLevels(): Map<string, ILevelData> {
  const map = new Map<string, ILevelData>();
  for (let r = 1; r <= 35; r++) {
    const level = generateRound('US', r, ROW_PATTERNS[r - 1] ?? 8);
    map.set(level.id, level);
  }
  return map;
}
