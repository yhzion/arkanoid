/**
 * Capsule entity + spawner — PRD §12, §33.3, §30.5.
 *
 * Weighted type selection (standard {S,C,L,D,E}=2, special {P,B}=1) drawn from the
 * seeded mulberry32 stream, with duplicate-prevention: a repeat of the previous
 * capsule is replaced by D (the only type allowed back-to-back). Draws occur ONLY
 * when a carrier brick is destroyed AND exactly one ball is active (§30.5); during
 * multi-ball the stream is NOT advanced.
 */
import { Fx, fromInt } from '../core/fixedpoint';
import { CAPSULE_FALL_SPEED } from '../core/constants';
import { CAPSULE_H, CAPSULE_W } from '../core/constants';
import { CAPSULE_TYPES, CAPSULE_WEIGHTS, CapsuleType } from '../data/schemas';
import { Mulberry32 } from '../core/rng';

export class Capsule {
  x: Fx;
  y: Fx;
  readonly w = CAPSULE_W;
  readonly h = CAPSULE_H;
  readonly type: CapsuleType;
  alive = true;

  constructor(x: Fx, y: Fx, type: CapsuleType) {
    this.x = x;
    this.y = y;
    this.type = type;
  }

  /** Fall 1 px/tick (§33.3). */
  fall(): void {
    this.y += CAPSULE_FALL_SPEED;
  }
}

/** Select the next capsule type from the seeded stream (§12.3). */
export function selectCapsuleType(rng: Mulberry32, previous: CapsuleType | null): CapsuleType {
  const weights = CAPSULE_TYPES.map((t) => CAPSULE_WEIGHTS[t]);
  const idx = rng.weightedIndex(weights);
  let type = CAPSULE_TYPES[idx];
  // Duplicate prevention: a repeat of the previous capsule → D (§12.3).
  if (previous !== null && type === previous) type = 'D';
  return type;
}

/** Build a capsule at a destroyed-brick center (§33.3 spawn position). */
export function spawnCapsule(centerX: Fx, topY: Fx, type: CapsuleType): Capsule {
  return new Capsule(centerX - fromInt(CAPSULE_W >> 1), topY, type);
}
