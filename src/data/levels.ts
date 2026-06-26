import { ILevelData, IBrickCell, BrickType, silverHits } from './levelSchema';

const COLORS: BrickType[] = ['WHITE', 'ORANGE', 'LIGHT_BLUE', 'GREEN', 'RED', 'BLUE', 'PINK', 'YELLOW'];

function generateRound(round: number, region: 'US' | 'JP'): ILevelData {
  const cells: IBrickCell[] = [];
  const rows = Math.min(4 + Math.floor(round / 3), 14);
  const carrierSet = new Set<string>();
  const carrierCount = Math.min(2 + Math.floor(round / 5), 6);

  for (let i = 0; i < carrierCount; i++) {
    const c = Math.floor((round * 7 + i * 13) % 11);
    const r = Math.floor((round * 3 + i * 11) % rows);
    carrierSet.add(`${c},${r}`);
  }

  let clearCount = 0;
  for (let row = 0; row < 28; row++) {
    for (let col = 0; col < 11; col++) {
      if (row < rows) {
        const isSilver = (row + col + round) % 7 === 0 && round > 3;
        const isGold = (row === 0 && col % 5 === 0) && round > 10;
        const type: BrickType = isGold ? 'GOLD' : isSilver ? 'SILVER' : COLORS[(col + row + round) % COLORS.length];
        const hits = isSilver ? silverHits(round) : isGold ? 999 : 1;
        const clear = !isGold;
        if (clear) clearCount++;
        cells.push({
          col, row, type, hitsRemaining: hits,
          isCapsuleCarrier: carrierSet.has(`${col},${row}`),
          clearRequired: clear,
        });
      } else {
        cells.push({ col, row, type: 'EMPTY', hitsRemaining: 0, isCapsuleCarrier: false, clearRequired: false });
      }
    }
  }

  return {
    id: `${region.toLowerCase()}-round-${String(round).padStart(2, '0')}`,
    region,
    roundNumber: round,
    type: 'brick',
    grid: { columns: 11, rows: 28, brickWidth: 16, brickHeight: 8 },
    clearRequiredCount: clearCount,
    cells,
  };
}

function generateBossRound(region: 'US' | 'JP'): ILevelData {
  const round = region === 'US' ? 36 : 33;
  return {
    id: `${region.toLowerCase()}-round-${round}-boss`,
    region,
    roundNumber: round,
    type: 'boss',
    grid: { columns: 11, rows: 28, brickWidth: 16, brickHeight: 8 },
    clearRequiredCount: 0,
    cells: [],
  };
}

export function generateAllLevels(region: 'US' | 'JP'): ILevelData[] {
  const brickRounds = region === 'US' ? 35 : 32;
  const levels: ILevelData[] = [];
  for (let i = 1; i <= brickRounds; i++) levels.push(generateRound(i, region));
  levels.push(generateBossRound(region));
  return levels;
}
