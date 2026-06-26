/**
 * Level data validator — PRD §19.6, §14.4.
 *
 * Imported level JSON is untrusted external input (§19.4.1) and MUST be validated
 * before use. This validator returns a list of human-readable errors; an empty list
 * means the level is structurally valid.
 */
import {
  BrickType,
  CAPSULE_TYPES,
  CapsuleType,
  COLORED_BRICKS,
  ILevelData,
} from './schemas';
import { GRID_COLS, GRID_ROWS } from '../core/constants';

const VALID_BRICK_TYPES: ReadonlySet<string> = new Set<string>([
  'EMPTY',
  ...COLORED_BRICKS,
  'SILVER',
  'GOLD',
]);
const VALID_CAPSULE_TYPES: ReadonlySet<string> = new Set<string>(CAPSULE_TYPES);

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export function validateLevel(level: unknown): ValidationResult {
  const errors: string[] = [];
  if (typeof level !== 'object' || level === null) {
    return { ok: false, errors: ['level is not an object'] };
  }
  const l = level as Record<string, unknown>;

  const grid = l.grid as { columns?: number; rows?: number; brickWidth?: number; brickHeight?: number } | undefined;
  if (!grid) {
    errors.push('missing grid');
  } else {
    if (grid.columns !== GRID_COLS) errors.push(`grid.columns must be ${GRID_COLS}`);
    if (grid.rows !== GRID_ROWS) errors.push(`grid.rows must be ${GRID_ROWS}`);
  }

  const type = l.type as string | undefined;
  if (type !== 'brick' && type !== 'boss') {
    errors.push(`type must be 'brick' or 'boss' (got ${String(type)})`);
  }

  // Boss rounds: no brick-grid requirement (background only). Skip cell checks.
  const isBoss = type === 'boss';
  if (!isBoss) {
    const cells = Array.isArray(l.cells) ? (l.cells as unknown[]) : null;
    if (!cells) {
      errors.push('brick round missing cells array');
    } else {
      let clearRequiredSeen = 0;
      const seen = new Set<string>();
      for (let i = 0; i < cells.length; i++) {
        const c = cells[i] as Record<string, unknown>;
        const col = c.col as number;
        const row = c.row as number;
        const bt = c.type as string;
        if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) {
          errors.push(`cell ${i} out of bounds (col=${col}, row=${row})`);
        }
        const key = `${col},${row}`;
        if (seen.has(key)) errors.push(`duplicate cell at ${key}`);
        seen.add(key);
        if (!VALID_BRICK_TYPES.has(bt)) errors.push(`cell ${i} invalid brick type ${String(bt)}`);
        const cap = c.capsule as string | null;
        if (cap !== null && !VALID_CAPSULE_TYPES.has(cap)) {
          errors.push(`cell ${i} invalid capsule type ${String(cap)}`);
        }
        const cr = !!c.clearRequired;
        if (cr) clearRequiredSeen++;
        // Gold is never clear-required (§19.6).
        if (bt === 'GOLD' && cr) {
          errors.push(`cell ${i} GOLD marked clear-required`);
        }
        // Silver/gold never carry capsules (§12.3).
        if ((bt === 'SILVER' || bt === 'GOLD') && c.isCapsuleCarrier) {
          errors.push(`cell ${i} ${bt} marked capsule carrier (not allowed, §12.3)`);
        }
      }
      const declared = l.clearRequiredCount as number;
      if (declared !== clearRequiredSeen) {
        errors.push(
          `clearRequiredCount (${declared}) != actual clearRequired cells (${clearRequiredSeen})`,
        );
      }
    }
  }

  const region = l.region as string | undefined;
  if (region !== 'US' && region !== 'JP') {
    errors.push(`region must be US|JP (got ${String(region)})`);
  }

  return { ok: errors.length === 0, errors };
}

/** Type guard / sanitizer: returns the level typed iff it validates. */
export function sanitizeLevel(level: unknown): ILevelData {
  const r = validateLevel(level);
  if (!r.ok) {
    throw new Error(`Invalid level data: ${r.errors.join('; ')}`);
  }
  return level as ILevelData;
}

/** Re-export codes for tool consumers. */
export type { BrickType, CapsuleType };
