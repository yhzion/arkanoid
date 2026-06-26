import { toFx } from './fx.js';

export const W = 256;
export const H = 240;
export const WALL = 8;
export const PLAY_LEFT = WALL;
export const PLAY_RIGHT = WALL + 192; // 200
export const PLAY_TOP = WALL;          // 8
export const PLAY_BOTTOM = H;          // 240
export const GRID_OX = 16;
export const GRID_OY = 16;
export const COLS = 11;
export const ROWS = 28;
export const BRICK_W = 16;
export const BRICK_H = 8;
export const VAUS_Y = 224;
export const VAUS_H = 8;
export const VAUS_W = 32;
export const VAUS_W_E = 48;
export const BASE_SPEED = toFx(2.0);
export const SLOW_SPEED = toFx(1.5);
export const MAX_SPEED = toFx(5.0);
export const CEILING_STEP = toFx(0.25);
export const BRICK_STEP = toFx(0.05);
export const CAPSULE_FALL = toFx(1.0);
export const LASER_SPEED = toFx(5.0);
export const ENEMY_SPEED_Y = {
  Konerd: toFx(0.5), Pyradok: toFx(0.6), Tri_sphere: toFx(0.5), Opopo: toFx(0.4),
};
export const ENEMY_TYPES = ['Konerd', 'Pyradok', 'Tri_sphere', 'Opopo'];

export const BRICK_TYPES = [
  'EMPTY', 'WHITE', 'ORANGE', 'LIGHT_BLUE', 'GREEN', 'RED', 'BLUE', 'PINK', 'YELLOW', 'SILVER', 'GOLD',
];
export const COLORS = {
  EMPTY: '#000', WHITE: '#eeeeee', ORANGE: '#ff8800', LIGHT_BLUE: '#66ccff', GREEN: '#33cc33',
  RED: '#ff3333', BLUE: '#3366ff', PINK: '#ff66cc', YELLOW: '#ffcc00', SILVER: '#bbbbbb', GOLD: '#ffcc33',
};
export const SCORES = {
  WHITE: 50, ORANGE: 60, LIGHT_BLUE: 70, GREEN: 80, RED: 90, BLUE: 100, PINK: 110, YELLOW: 120,
};
export const GLYPHS = {
  WHITE: 'W', ORANGE: 'O', LIGHT_BLUE: 'L', GREEN: 'G', RED: 'R', BLUE: 'B', PINK: 'P', YELLOW: 'Y', SILVER: 'S', GOLD: 'Au',
};
export const CAPSULES = ['S', 'C', 'L', 'D', 'P', 'E', 'B'];
export const CAPSULE_COLORS = {
  S: '#ff8800', C: '#ffcc00', L: '#ff3333', D: '#66ccff', P: '#999999', E: '#3366ff', B: '#ff66cc',
};

export function silverHits(round) {
  return 2 + Math.floor((round - 1) / 8);
}

function newCell(col, row, type, capsule = null, isCarrier = false) {
  const clearRequired = type !== 'EMPTY' && type !== 'GOLD';
  let hits = 1;
  if (type === 'SILVER') hits = silverHits(row + 1); // placeholder; overwritten per round
  if (type === 'GOLD') hits = 999;
  return {
    col, row, type, hitsRemaining: hits, capsule, isCapsuleCarrier: isCarrier, clearRequired,
  };
}

function hashPos(round, col, row) {
  return Math.abs(Math.sin(round * 12.9898 + col * 78.233 + row * 37.719) * 43758.5453) % 1;
}

export function generateRound(round, region = 'US') {
  const cells = [];
  const colorOrder = ['WHITE', 'ORANGE', 'LIGHT_BLUE', 'GREEN', 'RED', 'BLUE', 'PINK', 'YELLOW'];
  const rowsToFill = Math.min(4 + Math.floor((round - 1) / 2), 12);
  const startRow = 2 + ((round - 1) % 3);

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      let type = 'EMPTY';
      let capsule = null;
      let carrier = false;
      if (r >= startRow && r < startRow + rowsToFill) {
        const colorIdx = (r + Math.floor((round - 1) / 3)) % colorOrder.length;
        type = colorOrder[colorIdx];
        // Procedural silver/gold accents (clean-room, not reference layouts).
        const h = hashPos(round, c, r);
        if (h < 0.03 + round * 0.002) type = 'GOLD';
        else if (h > 0.92 - round * 0.005) type = 'SILVER';
      }
      cells.push(newCell(c, r, type, capsule, carrier));
    }
  }

  // Silver hit counts
  for (const cell of cells) {
    if (cell.type === 'SILVER') cell.hitsRemaining = silverHits(round);
  }

  // Place capsule carriers on random colored bricks.
  const colored = cells.filter((c) => SCORES[c.type]);
  const carrierCount = Math.min(2 + Math.floor(round / 5), 5);
  // Deterministic shuffle using round-based hash
  colored.sort((a, b) => hashPos(round, a.col, a.row) - hashPos(round, b.col, b.row));
  for (let i = 0; i < Math.min(carrierCount, colored.length); i++) {
    colored[i].isCapsuleCarrier = true;
  }

  const clearRequiredCount = cells.filter((c) => c.clearRequired).length;
  return {
    id: `${region.toLowerCase()}-round-${String(round).padStart(2, '0')}`,
    region,
    roundNumber: round,
    type: 'brick',
    grid: { columns: COLS, rows: ROWS, brickWidth: BRICK_W, brickHeight: BRICK_H },
    clearRequiredCount,
    cells,
    enemyProfile: 'default',
    ballProfile: 'default',
    paletteProfile: 'default',
  };
}

export function generateBossRound(region = 'US') {
  const roundNumber = region === 'US' ? 36 : 33;
  return {
    id: `${region.toLowerCase()}-round-${roundNumber}-boss`,
    region,
    roundNumber,
    type: 'boss',
    grid: { columns: COLS, rows: ROWS, brickWidth: BRICK_W, brickHeight: BRICK_H },
    clearRequiredCount: 0,
    cells: [],
    enemyProfile: 'boss',
    ballProfile: 'boss',
    paletteProfile: 'boss',
  };
}

export function defaultConfig() {
  return {
    region: 'US',
    mode: 'clean-room',
    enableManualLevelSkipSecret: true,
    enableHighScoreNameEntry: true,
    enableTwoPlayerMode: false,
    inputMode: 'relative-pointer',
    renderScaleMode: 'integer',
    audioEnabled: true,
    musicVolume: 0.4,
    sfxVolume: 0.4,
    deflectionModel: 'continuous',
    jitterEnabled: false,
    numericModel: 'q16.16-v1',
    deterministicSeed: String(Date.now()),
  };
}
