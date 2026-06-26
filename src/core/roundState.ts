import type { ILevelData, IBrickCell, BrickType } from '../data/levelSchema';
import { silverHits } from '../data/levelSchema';

export function loadLevelData(region: string, round: number): ILevelData {
  try {
    const data = levelDataMap[`${region}-round-${round}`];
    if (data) return data;
  } catch {}
  return generateDefaultLevel(region, round);
}

const levelDataMap: Record<string, ILevelData> = {};

export function registerLevelData(level: ILevelData): void {
  levelDataMap[`${level.region}-round-${level.roundNumber}`] = level;
}

function generateDefaultLevel(region: string, round: number): ILevelData {
  const cells: ILevelData['cells'] = [];
  const rows = Math.min(8 + Math.floor(round / 5), 20);
  const colors: BrickType[] = ['RED','BLUE','GREEN','YELLOW','PINK','ORANGE','LIGHT_BLUE','WHITE'];

  for (let r = 0; r < 28; r++) {
    for (let c = 0; c < 11; c++) {
      let type: BrickType = 'EMPTY';
      let hitsRemaining = 0;
      let clearRequired = false;
      let isCapsuleCarrier = false;

      if (r < rows && c >= 0 && c < 11) {
        const isGold = round > 10 && r < 2 && (c === 0 || c === 10);
        const isSilver = !isGold && round > 5 && r < 3 && (c % 3 === 0);
        if (isGold) {
          type = 'GOLD';
          hitsRemaining = 0;
          clearRequired = false;
        } else if (isSilver) {
          type = 'SILVER';
          hitsRemaining = silverHits(round);
          clearRequired = true;
        } else {
          type = colors[Math.abs((r + c * 3) % colors.length)];
          hitsRemaining = 1;
          clearRequired = true;
          if (round > 3 && Math.random() < 0.08) {
            isCapsuleCarrier = true;
          }
        }
      }

      cells.push({
        col: c, row: r,
        type,
        hitsRemaining,
        capsule: isCapsuleCarrier ? 'S' : null,
        isCapsuleCarrier,
        clearRequired,
      });
    }
  }

  const clearRequiredCount = cells.filter(c => c.clearRequired).length;

  return {
    id: `${region.toLowerCase()}-round-${String(round).padStart(2, '0')}`,
    region: region as 'US' | 'JP',
    roundNumber: round,
    type: 'brick',
    grid: { columns: 11, rows: 28, brickWidth: 16, brickHeight: 8 },
    clearRequiredCount,
    cells,
    enemyProfile: `default-round-${String(round).padStart(2, '0')}`,
    ballProfile: `default-round-${String(round).padStart(2, '0')}`,
    paletteProfile: `us-round-${String(round).padStart(2, '0')}`,
  };
}
