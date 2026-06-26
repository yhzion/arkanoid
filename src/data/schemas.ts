/**
 * Shared data schemas — schemas.md (Level JSON, Leaderboard, Settings) and
 * PRD §14.4/§14.5 (brick & capsule codes), §8.8 (versioned storage), §25 (GameConfig).
 */

/** PRD §14.5 brick type codes. */
export type BrickType =
  | 'EMPTY'
  | 'WHITE'
  | 'ORANGE'
  | 'LIGHT_BLUE'
  | 'GREEN'
  | 'RED'
  | 'BLUE'
  | 'PINK'
  | 'YELLOW'
  | 'SILVER'
  | 'GOLD';

/** PRD §12.2 capsule letters; null = no capsule. */
export type CapsuleType = 'S' | 'C' | 'L' | 'D' | 'P' | 'E' | 'B';

export const CAPSULE_TYPES: readonly CapsuleType[] = ['S', 'C', 'L', 'D', 'P', 'E', 'B'];
/** Capsule spawn weights (§12.3 / §33.3): standard {S,C,L,D,E}=2, special {P,B}=1. */
export const CAPSULE_WEIGHTS: Record<CapsuleType, number> = {
  S: 2,
  C: 2,
  L: 2,
  D: 2,
  E: 2,
  P: 1,
  B: 1,
};

/** Colored-brick score table (§11.3). */
export const BRICK_SCORE: Record<BrickType, number> = {
  EMPTY: 0,
  WHITE: 50,
  ORANGE: 60,
  LIGHT_BLUE: 70,
  GREEN: 80,
  RED: 90,
  BLUE: 100,
  PINK: 110,
  YELLOW: 120,
  SILVER: 0, // silver scored as 50 × roundNumber at runtime (§11.4)
  GOLD: 0,
};

/** Colored brick types that count toward clear (§11.2). */
export const COLORED_BRICKS: readonly BrickType[] = [
  'WHITE',
  'ORANGE',
  'LIGHT_BLUE',
  'GREEN',
  'RED',
  'BLUE',
  'PINK',
  'YELLOW',
];

export interface IBrickCell {
  col: number; // 0..10
  row: number; // 0..27
  type: BrickType;
  hitsRemaining: number; // authoritative for silver (§11.4)
  capsule: CapsuleType | null;
  isCapsuleCarrier: boolean; // §12.3
  clearRequired: boolean;
}

export interface ILevelGrid {
  columns: number; // 11
  rows: number; // 28
  brickWidth: number; // 16
  brickHeight: number; // 8
}

export interface ILevelData {
  id: string;
  region: 'US' | 'JP';
  roundNumber: number;
  type: 'brick' | 'boss';
  grid: ILevelGrid;
  clearRequiredCount: number; // MUST equal count of clearRequired cells (§14.4)
  cells: IBrickCell[];
  enemyProfile: string;
  ballProfile: string;
  paletteProfile: string;
}

// --- Leaderboard & Settings (schemas.md §2, PRD §8.8) -----------------------

export interface ILeaderboardEntry {
  score: number;
  initials: string; // max 3 chars (§8.8)
  round: number;
  region: string;
  mode: string;
  date: string; // ISO string
}

export interface ILeaderboardStorage {
  schemaVersion: number;
  entries: ILeaderboardEntry[];
}

export interface ISettingsStorage {
  schemaVersion: number;
  config: unknown; // GameConfig (§25); typed loosely here to avoid a cycle
  remaps: {
    keyboard: Record<string, string>; // action → KeyboardEvent.code
    gamepad: Record<string, number>; // action → standard-mapping button index
  };
}

export const LEADERBOARD_SCHEMA_VERSION = 1;
export const SETTINGS_SCHEMA_VERSION = 1;
export const LEADERBOARD_CAPACITY = 5;
