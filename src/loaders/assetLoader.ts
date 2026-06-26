import type { ILevelData } from '../data/levelSchema';

export class AssetLoader {
  async loadLevel(region: string, round: number): Promise<ILevelData | null> {
    try {
      const url = `/data/levels/${region.toLowerCase()}/round-${String(round).padStart(2, '0')}.json`;
      const res = await fetch(url);
      if (!res.ok) return null;
      return await res.json() as ILevelData;
    } catch {
      return null;
    }
  }

  async loadSprite(_name: string): Promise<HTMLImageElement | null> {
    return null;
  }
}

export const assetLoader = new AssetLoader();
