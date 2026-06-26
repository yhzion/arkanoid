/**
 * Simulation-asset manifest digest — PRD §30.7 (D9).
 *
 * The configHash covers only level-data identities: a SHA-256 over the sorted,
 * canonicalized per-round level JSON. Cosmetic packs (audio/sprites/palette) are
 * excluded so a cosmetic change never invalidates a replay.
 */
import { ILevelData } from './schemas';

/** Canonicalize a level to a stable string (sorted keys, deterministic field order). */
function canonicalLevel(level: ILevelData): string {
  // Sort cells by (row, col) for stability regardless of source ordering.
  const sorted = [...level.cells].sort((a, b) => (a.row - b.row) || (a.col - b.col));
  return JSON.stringify({
    id: level.id,
    region: level.region,
    roundNumber: level.roundNumber,
    type: level.type,
    grid: level.grid,
    clearRequiredCount: level.clearRequiredCount,
    cells: sorted.map((c) => ({
      col: c.col,
      row: c.row,
      type: c.type,
      hitsRemaining: c.hitsRemaining,
      capsule: c.capsule,
      isCapsuleCarrier: c.isCapsuleCarrier,
      clearRequired: c.clearRequired,
    })),
  });
}

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Compute the level-manifest digest for a set of levels (§30.7).
 * Digest = SHA-256 of the per-round level hashes, joined by round order.
 */
export async function computeLevelManifestDigest(levels: ILevelData[]): Promise<string> {
  const byRound = new Map<number, string>();
  for (const lvl of levels) {
    byRound.set(lvl.roundNumber, await sha256Hex(canonicalLevel(lvl)));
  }
  const parts = [...byRound.keys()].sort((a, b) => a - b).map((r) => `${r}:${byRound.get(r)}`);
  return sha256Hex(parts.join('|'));
}
