import { CapsuleType } from '../data/levelSchema';

export interface CapsuleState {
  x: number; y: number;
  type: CapsuleType;
  active: boolean;
  fallSpeed: number;
}

export const CAPSULE_FALL_SPEED = 1.0;
export const CAPSULE_WIDTH = 16;
export const CAPSULE_HEIGHT = 7;

const STANDARD_WEIGHT = 2;
const SPECIAL_WEIGHT = 1;
const WEIGHTED_TYPES: { type: CapsuleType; weight: number }[] = [
  { type: 'S', weight: STANDARD_WEIGHT },
  { type: 'C', weight: STANDARD_WEIGHT },
  { type: 'L', weight: STANDARD_WEIGHT },
  { type: 'D', weight: STANDARD_WEIGHT },
  { type: 'E', weight: STANDARD_WEIGHT },
  { type: 'P', weight: SPECIAL_WEIGHT },
  { type: 'B', weight: SPECIAL_WEIGHT },
];
const TOTAL_WEIGHT = WEIGHTED_TYPES.reduce((s, w) => s + w.weight, 0);

export function randomCapsuleType(rng: () => number, previousCapsule: CapsuleType | null): CapsuleType {
  let r = rng() * TOTAL_WEIGHT;
  let chosen: CapsuleType = 'D';
  for (const w of WEIGHTED_TYPES) {
    r -= w.weight;
    if (r <= 0) { chosen = w.type; break; }
  }
  if (chosen === previousCapsule) chosen = 'D';
  return chosen;
}
