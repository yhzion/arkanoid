/**
 * Build-time angle lookup tables — PRD §30.3 (D2).
 *
 * The finite angle set (launch, 8-zone deflection, Disruption split, vertical-loop
 * clamp) is precomputed ONCE at module load into Q16.16 unit vectors. The per-tick
 * simulation never calls runtime trigonometry; it only indexes these tables.
 *
 * Convention: an angle is measured **from the vertical (up) axis**, positive to the
 * right. For unit vector u: u.vx = sin(θ), u.vy = -cos(θ) (screen-y grows downward,
 * so upward motion is negative vy).
 */
import { Fx, ONE, fromFloatBuildOnly } from './fixedpoint';

export interface UnitVec {
  readonly vx: Fx;
  readonly vy: Fx;
}

const DEG = Math.PI / 180;

/** Build-time unit-vector construction from an angle-from-vertical in degrees. */
function uvFromVertical(deg: number): UnitVec {
  const rad = deg * DEG;
  return { vx: fromFloatBuildOnly(Math.sin(rad)), vy: fromFloatBuildOnly(-Math.cos(rad)) };
}

// --- Launch vectors (§10.3): 60°/120° from horizontal == ±30° from vertical ---
export const LAUNCH_RIGHT: UnitVec = uvFromVertical(30); // ball launches up-right
export const LAUNCH_LEFT: UnitVec = uvFromVertical(-30); // ball launches up-left

// --- Discrete 8-zone deflection (§10.4 / §30.3): ±15, ±35, ±55, ±75 ----------
export const DISCRETE8: readonly UnitVec[] = [
  uvFromVertical(-75), // zone 1
  uvFromVertical(-55), // zone 2
  uvFromVertical(-35), // zone 3
  uvFromVertical(-15), // zone 4
  uvFromVertical(15), // zone 5
  uvFromVertical(35), // zone 6
  uvFromVertical(55), // zone 7
  uvFromVertical(75), // zone 8
];

// --- Disruption split (§12.4): ±15° relative to the original velocity --------
export const SPLIT_PLUS15: UnitVec = uvFromVertical(15);
export const SPLIT_MINUS15: UnitVec = uvFromVertical(-15);
// Precomputed rotation cos/sin of 15° for splitting an arbitrary vector (§30.3).
export const ROT15_COS: Fx = fromFloatBuildOnly(Math.cos(15 * DEG));
export const ROT15_SIN: Fx = fromFloatBuildOnly(Math.sin(15 * DEG));

// --- Vertical-loop clamp (§10.4): |θ| ≥ 10° from vertical --------------------
export const SIN_10: Fx = fromFloatBuildOnly(Math.sin(10 * DEG));
export const COS_10: Fx = fromFloatBuildOnly(Math.cos(10 * DEG));

// --- Continuous-model LUT (§30.3): 256 entries over scalingFactor ∈ [-1,1] ---
// scalingFactor maps linearly to θ = scalingFactor * 75° (§33.1). The ±10° clamp
// is applied at lookup time (needs the incoming horizontal sign, §10.4), so the
// table stores the raw unclamped unit vector per grid slot.
const CONTINUOUS_LUT: readonly UnitVec[] = (() => {
  const table: UnitVec[] = new Array(256);
  for (let i = 0; i < 256; i++) {
    const s = (i / 255) * 2 - 1; // [-1, 1]
    const thetaDeg = s * 75;
    table[i] = uvFromVertical(thetaDeg);
  }
  return table;
})();

/** Quantize a raw scalingFactor (Q16.16, expected in [-ONE, ONE]) to the 1/256 grid index. */
export function continuousIndex(scalingFactor: Fx): number {
  const idx = Math.trunc(((scalingFactor + ONE) * 255) / (2 * ONE));
  return idx < 0 ? 0 : idx > 255 ? 255 : idx;
}

/** Continuous-model unclamped unit vector for a raw scalingFactor. */
export function continuousUnit(scalingFactor: Fx): UnitVec {
  return CONTINUOUS_LUT[continuousIndex(scalingFactor)];
}

/**
 * Apply the ±10° vertical-loop clamp (continuous model only) to a unit vector,
 * preserving the incoming horizontal sign (§10.4). Pure comparison + assignment;
 * no runtime trig.
 */
export function applyVerticalLoopClamp(u: UnitVec, hSign: Fx): UnitVec {
  const ax = u.vx < 0 ? -u.vx : u.vx;
  if (ax >= SIN_10) return u;
  // |θ| < 10° → force to ±10° from vertical, up direction preserved (vy < 0).
  const sign = hSign < 0 ? -1 : 1; // hSign==0 defaults to + (launch-right convention)
  return { vx: sign * SIN_10, vy: -COS_10 };
}
