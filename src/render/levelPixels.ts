/**
 * Pure level-to-pixels renderer — architecture.md §2.1 (`renderLevelPreview`,
 * `compareReferenceImage`). No native canvas dependency: produces an RGBA buffer of
 * the brick field plus a per-cell color-index grid used for parity diffing (§14.6).
 */
import { BrickType, ILevelData } from '../data/schemas';
import { BRICK_H, BRICK_W, GRID_COLS, GRID_ORIGIN_X, GRID_ORIGIN_Y, GRID_ROWS } from '../core/constants';

export const BRICK_RGBA: Record<BrickType, [number, number, number]> = {
  EMPTY: [0, 0, 0],
  WHITE: [255, 255, 255],
  ORANGE: [255, 165, 0],
  LIGHT_BLUE: [173, 216, 230],
  GREEN: [0, 192, 0],
  RED: [255, 0, 0],
  BLUE: [0, 0, 255],
  PINK: [255, 128, 192],
  YELLOW: [255, 255, 0],
  SILVER: [192, 192, 192],
  GOLD: [255, 215, 0],
};

export interface PixelImage {
  width: number;
  height: number;
  /** RGBA8, row-major, length = width*height*4. */
  data: Uint8Array;
}

/** Render a level's brick field to an RGBA image sized to the grid pixel bounds. */
export function renderLevelPixels(level: ILevelData): PixelImage {
  const width = GRID_COLS * BRICK_W;
  const height = GRID_ROWS * BRICK_H;
  const data = new Uint8Array(width * height * 4);
  // Background black.
  const cellAt = new Map<string, BrickType>();
  for (const c of level.cells) cellAt.set(`${c.col},${c.row}`, c.type);

  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const type = cellAt.get(`${col},${row}`) ?? 'EMPTY';
      const [r, g, b] = BRICK_RGBA[type];
      for (let py = 0; py < BRICK_H; py++) {
        for (let px = 0; px < BRICK_W; px++) {
          const x = col * BRICK_W + px;
          const y = row * BRICK_H + py;
          const i = (y * width + x) * 4;
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
          data[i + 3] = 255;
        }
      }
    }
  }
  void GRID_ORIGIN_X;
  void GRID_ORIGIN_Y;
  return { width, height, data };
}

/** Encode a PixelImage as binary PPM (P6) — dependency-free preview format. */
export function toPPM(img: PixelImage): Uint8Array {
  const header = `P6\n${img.width} ${img.height}\n255\n`;
  const headerBytes = new TextEncoder().encode(header);
  // PPM is RGB (drop alpha).
  const rgb = new Uint8Array(img.width * img.height * 3);
  for (let i = 0, j = 0; i < img.data.length; i += 4, j += 3) {
    rgb[j] = img.data[i];
    rgb[j + 1] = img.data[i + 1];
    rgb[j + 2] = img.data[i + 2];
  }
  const out = new Uint8Array(headerBytes.length + rgb.length);
  out.set(headerBytes, 0);
  out.set(rgb, headerBytes.length);
  return out;
}

export interface DiffResult {
  differingCells: number;
  totalCells: number;
  cells: { col: number; row: number; expected: BrickType; actual: BrickType }[];
}

/** Compare two levels at cell granularity (§14.6 parity check). */
export function compareLevelCells(expected: ILevelData, actual: ILevelData): DiffResult {
  const exp = new Map<string, BrickType>();
  const act = new Map<string, BrickType>();
  for (const c of expected.cells) exp.set(`${c.col},${c.row}`, c.type);
  for (const c of actual.cells) act.set(`${c.col},${c.row}`, c.type);
  const cells: DiffResult['cells'] = [];
  let differing = 0;
  let total = 0;
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      total++;
      const e = exp.get(`${col},${row}`) ?? 'EMPTY';
      const a = act.get(`${col},${row}`) ?? 'EMPTY';
      if (e !== a) {
        differing++;
        cells.push({ col, row, expected: e, actual: a });
      }
    }
  }
  return { differingCells: differing, totalCells: total, cells };
}
