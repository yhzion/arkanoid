import { ILevelData } from '../data/levelSchema';

export async function loadLevel(url: string): Promise<ILevelData | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}
