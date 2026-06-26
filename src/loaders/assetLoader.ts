/**
 * Asset & level loader — architecture.md §2.1 (`/loaders`), asset_pipeline.md §3.
 *
 * Fetches level JSON from the single active-mode `/assets/` (or `/data/`) location
 * the build copied, validates it as untrusted input (§19.4.1), and returns typed
 * ILevelData. Throws fatally if licensed-fidelity mode is selected but files are
 * missing (asset_pipeline.md §3).
 */
import { GameMode, Region } from '../core/config';
import { bossRound, brickRounds } from '../core/constants';
import { sanitizeLevel } from '../data/levelValidator';
import { ILevelData } from '../data/schemas';

/** Resolve the level URL for a given region + round. */
export function levelUrl(region: Region, round: number): string {
  const env = (import.meta as unknown as { env?: { BASE_URL?: string } }).env;
  const base = env?.BASE_URL ?? '/';
  const file = round === bossRound(region) ? `round-${round}-boss` : `round-${String(round).padStart(2, '0')}`;
  return `${base}data/levels/${region.toLowerCase()}/${file}.json`;
}

/** Fetch and sanitize a single level (untrusted input, §19.4.1). */
export async function loadLevel(region: Region, round: number, _mode: GameMode): Promise<ILevelData> {
  const url = levelUrl(region, round);
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new Error(`Asset load failed (network): ${url}`);
  }
  if (!res.ok) {
    // Fatal for licensed-fidelity; clean-room should always have fallback levels.
    throw new Error(`Level asset missing (${res.status}): ${url}`);
  }
  const json = await res.json();
  return sanitizeLevel(json);
}

/** Load all rounds for a region (used to build the manifest digest). */
export async function loadAllLevels(region: Region, mode: GameMode): Promise<ILevelData[]> {
  const out: ILevelData[] = [];
  const total = brickRounds(region) + 1; // include boss
  for (let r = 1; r <= total; r++) {
    out.push(await loadLevel(region, r, mode));
  }
  return out;
}
