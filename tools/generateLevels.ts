/**
 * Clean-room level generator — PRD §14 (stage data), §11.4 (silver hits), §12.3 (carriers).
 *
 * Produces valid, varied 11x28 brick layouts deterministically (mulberry32 per round)
 * into public/data/levels/us/. These are NOT the exact NES layouts — pixel-exact
 * fidelity parity is §14.6 / M5 (deferred, needs a licensed reference package). The
 * generator guarantees schema validity: correct clearRequiredCount, silver/gold rules,
 * and per-cell authoritative hitsRemaining (§11.4 formula used only as a generator).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Mulberry32, seedFromString } from '../src/core/rng';
import { BrickType, CAPSULE_TYPES, CapsuleType, COLORED_BRICKS, IBrickCell, ILevelData } from '../src/data/schemas';
import { GRID_COLS, GRID_ROWS } from '../src/core/constants';

const OUT_DIR = join(process.cwd(), 'public', 'data', 'levels', 'us');

function silverHits(round: number): number {
  return 2 + Math.floor((round - 1) / 8); // §11.4
}

function buildBrickRound(round: number): ILevelData {
  const rng = new Mulberry32(seedFromString(`us-round-${round}`));
  const cells: IBrickCell[] = [];
  const palette: BrickType[] = [...COLORED_BRICKS];
  // Density grows slightly with round; top ~8..14 rows filled.
  const filledRows = Math.min(14, 6 + Math.floor(round / 3));
  const sh = silverHits(round);

  // Candidate carrier count: 1..3.
  const carrierCount = 1 + (rng.next() % 3);
  const carrierSlots = new Set<number>();
  while (carrierSlots.size < carrierCount) carrierSlots.add(rng.next() % (filledRows * GRID_COLS));

  let cellIdx = 0;
  for (let row = 0; row < filledRows; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      // Carve some gaps for variety (skip ~1..2 cells per row in later rounds).
      const gapChance = Math.min(0.25, round * 0.01);
      if (cellIdx > 0 && rng.next() / 2 ** 32 < gapChance && row > 0) {
        cells.push(emptyCell(col, row));
        cellIdx++;
        continue;
      }
      let type: BrickType;
      const roll = rng.next() / 2 ** 32;
      if (round >= 4 && roll < 0.08) type = 'GOLD';
      else if (round >= 2 && roll < 0.22) type = 'SILVER';
      else type = palette[rng.next() % palette.length];

      const isGold = type === 'GOLD';
      const isSilver = type === 'SILVER';
      const clearRequired = !isGold; // colored + silver count; gold never
      const isCarrier = !isGold && !isSilver && carrierSlots.has(cellIdx);
      const capsule: CapsuleType | null = null; // type chosen at runtime by RNG (§12.3)
      cells.push({
        col,
        row,
        type,
        hitsRemaining: isSilver ? sh : isGold ? 0 : 1,
        capsule,
        isCapsuleCarrier: isCarrier,
        clearRequired,
      });
      cellIdx++;
    }
  }
  // Fill remaining grid with EMPTY cells (explicit, for completeness/tools).
  for (let row = filledRows; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) cells.push(emptyCell(col, row));
  }

  return {
    id: `us-round-${String(round).padStart(2, '0')}`,
    region: 'US',
    roundNumber: round,
    type: 'brick',
    grid: { columns: GRID_COLS, rows: GRID_ROWS, brickWidth: 16, brickHeight: 8 },
    clearRequiredCount: cells.filter((c) => c.clearRequired).length,
    cells,
    enemyProfile: `default-round-${round}`,
    ballProfile: `default-round-${round}`,
    paletteProfile: `us-round-${round}`,
  };
}

function emptyCell(col: number, row: number): IBrickCell {
  return { col, row, type: 'EMPTY', hitsRemaining: 0, capsule: null, isCapsuleCarrier: false, clearRequired: false };
}

function buildBossRound(round: number): ILevelData {
  return {
    id: `us-round-${String(round).padStart(2, '0')}`,
    region: 'US',
    roundNumber: round,
    type: 'boss',
    grid: { columns: GRID_COLS, rows: GRID_ROWS, brickWidth: 16, brickHeight: 8 },
    clearRequiredCount: 0,
    cells: [],
    enemyProfile: `boss-round-${round}`,
    ballProfile: `boss-round-${round}`,
    paletteProfile: `us-round-${round}`,
  };
}

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });
  const manifest: string[] = [];
  for (let r = 1; r <= 35; r++) {
    const level = buildBrickRound(r);
    const path = join(OUT_DIR, `round-${String(r).padStart(2, '0')}.json`);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify(level, null, 2) + '\n', 'utf8');
    manifest.push(`round-${String(r).padStart(2, '0')}.json`);
  }
  const boss = buildBossRound(36);
  await writeFile(join(OUT_DIR, 'round-36-boss.json'), JSON.stringify(boss, null, 2) + '\n', 'utf8');
  manifest.push('round-36-boss.json');

  await writeFile(join(OUT_DIR, 'manifest.json'), JSON.stringify({ region: 'US', levels: manifest }, null, 2) + '\n', 'utf8');
  // Touch CAPSULE_TYPES so the import is retained for tooling consumers.
  void CAPSULE_TYPES;
  console.log(`Generated ${manifest.length} US levels into ${OUT_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
