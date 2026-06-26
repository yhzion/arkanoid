import { LevelData } from '../data/levelSchema';

export class AssetLoader {
  private cache = new Map<string, any>();

  async loadLevel(region: string, round: number): Promise<LevelData> {
    const path = `/data/levels/${region}/round-${round.toString().padStart(2, '0')}.json`;
    if (this.cache.has(path)) return this.cache.get(path) as LevelData;
    const resp = await fetch(path);
    if (!resp.ok) {
      const generated = this.generateLevel(region, round);
      this.cache.set(path, generated);
      return generated;
    }
    const data = await resp.json() as LevelData;
    this.cache.set(path, data);
    return data;
  }

  private generateLevel(region: string, round: number): LevelData {
    const cells: LevelData['cells'] = [];
    const isBoss = (region === 'US' && round === 36) || (region === 'JP' && round === 33);

    if (isBoss) {
      return {
        id: `${region}-round-${round}`,
        region: region as 'US' | 'JP',
        roundNumber: round,
        type: 'boss',
        grid: { columns: 11, rows: 28, brickWidth: 16, brickHeight: 8 },
        clearRequiredCount: 0,
        cells: [],
        enemyProfile: 'boss',
        ballProfile: 'boss',
        paletteProfile: 'boss',
      };
    }

    const brickTypes = ['WHITE', 'ORANGE', 'LIGHT_BLUE', 'GREEN', 'RED', 'BLUE', 'PINK', 'YELLOW'];
    let clearCount = 0;

    for (let row = 0; row < 28; row++) {
      for (let col = 0; col < 11; col++) {
        let type: string = 'EMPTY';
        let hitsRemaining = 0;
        let clearRequired = false;
        let capsule: string | null = null;
        let isCapsuleCarrier = false;

        if (row < 14 && (row + col) % 4 !== 0) {
          if (row < 2) {
            type = 'GOLD';
          } else if (row < 4) {
            type = 'SILVER';
            const hits = 2 + Math.floor((round - 1) / 8);
            hitsRemaining = hits;
          } else {
            const idx = (row + col) % brickTypes.length;
            type = brickTypes[idx]!;
          }
          clearRequired = type !== 'GOLD';
          if (clearRequired) clearCount++;
          if (type !== 'GOLD' && type !== 'SILVER' && Math.random() < 0.1) {
            capsule = ['S', 'C', 'L', 'D', 'P', 'E', 'B'][Math.floor(Math.random() * 7)] as string;
            isCapsuleCarrier = true;
          }
        }

        cells.push({ col, row, type: type as any, hitsRemaining, capsule: capsule as any, isCapsuleCarrier, clearRequired });
      }
    }

    return {
      id: `${region}-round-${round}`,
      region: region as 'US' | 'JP',
      roundNumber: round,
      type: 'brick',
      grid: { columns: 11, rows: 28, brickWidth: 16, brickHeight: 8 },
      clearRequiredCount: clearCount,
      cells,
      enemyProfile: `default-round-${round}`,
      ballProfile: `default-round-${round}`,
      paletteProfile: `${region}-round-${round}`,
    };
  }
}
