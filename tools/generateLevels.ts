import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'data', 'levels', 'us');

const BRICK_TYPES = ['WHITE','ORANGE','LIGHT_BLUE','GREEN','RED','BLUE','PINK','YELLOW'] as const;

function generatePatterns(round: number) {
  const cells: any[] = [];
  let clearCount = 0;

  const patterns: ((row: number, col: number) => string | null)[] = [
    // round 1: simple rows
    (r, c) => r < 4 ? 'WHITE' : null,
    // round 2
    (r, c) => r < 5 && (r + c) % 3 !== 0 ? BRICK_TYPES[(r * 2 + c) % 8]! : null,
    // round 3
    (r, c) => r < 6 && c % 2 === r % 2 ? BRICK_TYPES[(r + c) % 8]! : null,
    // round 4: diamond pattern
    (r, c) => {
      const centerR = 6, centerC = 5;
      const dist = Math.abs(r - centerR) + Math.abs(c - centerC);
      return dist < 5 && dist >= 0 ? BRICK_TYPES[(r * 3 + c) % 8]! : null;
    },
    // round 5
    (r, c) => r < 7 && c >= 2 && c <= 8 ? BRICK_TYPES[(r * 7 + c) % 8]! : null,
    // round 6
    (r, c) => r < 8 && (r % 3 === c % 3) ? BRICK_TYPES[(r + c) % 8]! : null,
    // round 7: pyramid
    (r, c) => {
      if (r >= 10) return null;
      const halfRows = 5;
      if (r < halfRows) {
        const left = halfRows - r - 1;
        const right = 11 - halfRows + r;
        return c >= left && c <= right ? BRICK_TYPES[(r * 3 + c) % 8]! : null;
      }
      return null;
    },
    // round 8: checkboard
    (r, c) => r < 6 && (r + c) % 2 === 0 ? 'SILVER' : null,
    // round 9: scattered
    (r, c) => r < 12 && (r * 11 + c) % 5 !== 0 ? BRICK_TYPES[(r * 2 + c * 3) % 8]! : null,
    // round 10: arrow
    (r, c) => {
      if (r >= 8) return null;
      const mid = 5;
      const offset = Math.abs(c - mid);
      return offset <= r ? BRICK_TYPES[(r + c) % 8]! : null;
    },
    // round 11: dense
    (r, c) => r < 10 && c > 0 && c < 10 ? BRICK_TYPES[(r * 3 + c * 2) % 8]! : null,
    // round 12
    (r, c) => r < 6 && (c % 3 === 0 || c % 3 === 2) ? BRICK_TYPES[(r + c) % 8]! : null,
    // round 13: double diamond
    (r, c) => {
      const d1 = Math.abs(r - 4) + Math.abs(c - 3);
      const d2 = Math.abs(r - 4) + Math.abs(c - 8);
      return (d1 < 4 || d2 < 4) ? BRICK_TYPES[(r * 2 + c) % 8]! : null;
    },
    // round 14
    (r, c) => r < 9 && c < 10 && c > 0 && (r + c) % 3 !== 0 ? BRICK_TYPES[(r * 5 + c) % 8]! : null,
    // round 15: castle
    (r, c) => {
      if (r >= 10) return null;
      if (r < 3 && c > 1 && c < 9) return BRICK_TYPES[(r * 2 + c) % 8]!;
      if (r >= 3 && r < 6 && (c === 0 || c === 10 || c === 5)) return BRICK_TYPES[(r + c) % 8]!;
      if (r >= 6 && c > 1 && c < 9) return BRICK_TYPES[(r * 3 + c * 2) % 8]!;
      return null;
    },
    // round 16-35: varied patterns with increasing difficulty
  ];

  for (let r = 16; r <= 35; r++) {
    const idx = r - 16;
    patterns.push((row, col) => {
      if (row >= 10 + idx % 4) return null;
      const offset = (row * 7 + col * 13 + idx * 3) % 8;
      if (row < 2) return 'GOLD';
      if (row < 4 + idx % 3) return 'SILVER';
      const skip = (row * 11 + col + idx) % (3 + idx % 3);
      return skip !== 0 ? BRICK_TYPES[offset]! : null;
    });
  }

  const pattern = patterns[Math.min(round - 1, patterns.length - 1)]!;

  for (let row = 0; row < 28; row++) {
    for (let col = 0; col < 11; col++) {
      const type = pattern(row, col);
      if (type) {
        let hitsRemaining = 0;
        let capsule: string | null = null;
        let isCapsuleCarrier = false;
        let clearRequired = true;

        if (type === 'GOLD') {
          clearRequired = false;
        } else if (type === 'SILVER') {
          hitsRemaining = 2 + Math.floor((round - 1) / 8);
        } else {
          if (Math.random() < 0.08) {
            const types = ['S','C','L','D','E','P','B'];
            capsule = types[Math.floor(Math.random() * types.length)]!;
            isCapsuleCarrier = true;
          }
        }

        if (clearRequired && type !== 'EMPTY') clearCount++;

        cells.push({
          col, row, type,
          hitsRemaining,
          capsule,
          isCapsuleCarrier,
          clearRequired,
        });
      } else {
        cells.push({
          col, row, type: 'EMPTY',
          hitsRemaining: 0,
          capsule: null,
          isCapsuleCarrier: false,
          clearRequired: false,
        });
      }
    }
  }

  const bossRound = 36;
  return {
    id: `us-round-${round}`,
    region: 'US',
    roundNumber: round,
    type: round === bossRound ? 'boss' : 'brick',
    grid: { columns: 11, rows: 28, brickWidth: 16, brickHeight: 8 },
    clearRequiredCount: round === bossRound ? 0 : clearCount,
    cells: round === bossRound ? [] : cells,
    enemyProfile: round === bossRound ? 'boss' : `default-round-${round}`,
    ballProfile: round === bossRound ? 'boss' : `default-round-${round}`,
    paletteProfile: `us-round-${round}`,
  };
}

for (let round = 1; round <= 36; round++) {
  const data = generatePatterns(round);
  const filename = `round-${String(round).padStart(2, '0')}.json`;
  const outPath = join(OUT_DIR, filename);
  writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log(`Generated ${filename}`);
}
