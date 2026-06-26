/**
 * Q16.16 signed fixed-point arithmetic — PRD §30.2 (D1).
 *
 * Raw values are plain integers stored in JS `number`. The representable range
 * we use (coordinates ≤ ~256px, velocities ≤ ~5px/tick) keeps every intermediate
 * well below 2^53, so integer arithmetic is exact. No IEEE-754 float ever enters
 * the simulation path; conversion helpers that touch floats are build-time only.
 */

/** The raw integer representation of 1.0 in Q16.16. */
export const ONE: Fx = 1 << 16;
/** Raw representation of -1.0. */
export const NEG_ONE: Fx = -ONE;
/** 0.5 raw. */
export const HALF: Fx = ONE >> 1;

/** Fixed-point value alias (documented intent; structurally a number). */
export type Fx = number;

/** Multiply two fixed-point values: 64-bit-style intermediate then >>16 (§30.2). */
export function fxMul(a: Fx, b: Fx): Fx {
  return Math.trunc((a * b) / ONE);
}

/** Divide: (a << 16) / b (§30.2). b must be non-zero. */
export function fxDiv(a: Fx, b: Fx): Fx {
  return Math.trunc((a * ONE) / b);
}

/** Clamp a fixed-point value to [lo, hi]. */
export function fxClamp(v: Fx, lo: Fx, hi: Fx): Fx {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Absolute value. */
export function fxAbs(v: Fx): Fx {
  return v < 0 ? -v : v;
}

/** Sign: -1, 0, or 1 as raw fixed-point (±ONE / 0). */
export function fxSign(v: Fx): Fx {
  return v < 0 ? NEG_ONE : v > 0 ? ONE : 0;
}

// --- Conversions (build-time / non-sim use only) ---------------------------

/** Wrap an integer logical-pixel value into fixed-point. */
export function fromInt(n: number): Fx {
  return Math.trunc(n) * ONE;
}

/** Truncate a fixed-point value to an integer logical pixel. Division-based (safe past 2^31). */
export function toInt(v: Fx): number {
  return Math.trunc(v / ONE);
}

/** Round a fixed-point value to the nearest integer pixel. */
export function toIntRound(v: Fx): number {
  return Math.trunc((v + HALF) / ONE);
}

/**
 * Build-time only: construct a fixed-point value from a JS float. Used purely
 * for LUT construction (§30.3); never call from the per-tick simulation path.
 */
export function fromFloatBuildOnly(f: number): Fx {
  return Math.round(f * ONE);
}
