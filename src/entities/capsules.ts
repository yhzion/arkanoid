import type { CapsuleType } from '../data/levelSchema';

export const CAPSULE_W = 16;
export const CAPSULE_H = 7;
export const CAPSULE_FALL_SPEED = 1.0;
export const CATCH_AUTO_RELEASE = 360;
export const CAPSULE_WEIGHTS: Record<string, number> = {
  S: 2, C: 2, L: 2, D: 2, E: 2, P: 1, B: 1,
};

const NON_NULL_TYPES = ['S','C','L','D','E','P','B'] as const;

export interface CapsuleState {
  x: number;
  y: number;
  w: number;
  h: number;
  type: CapsuleType;
  active: boolean;
  fallSpeed: number;
}

export function createCapsule(x: number, y: number, type: CapsuleType): CapsuleState {
  return {
    x, y,
    w: CAPSULE_W, h: CAPSULE_H,
    type,
    active: true,
    fallSpeed: CAPSULE_FALL_SPEED,
  };
}

export function selectCapsuleType(rng: () => number, previousCapsule: string | null): CapsuleType {
  const weights = NON_NULL_TYPES.map(t => CAPSULE_WEIGHTS[t] ?? 1);
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = rng() * total;
  let chosen: CapsuleType = 'D';
  for (let i = 0; i < NON_NULL_TYPES.length; i++) {
    roll -= weights[i];
    if (roll <= 0) { chosen = NON_NULL_TYPES[i]; break; }
  }
  if (chosen !== null && chosen === previousCapsule) chosen = 'D';
  return chosen;
}
