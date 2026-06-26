/**
 * mulberry32 PRNG — PRD §30.4 (D3, D5).
 *
 * 32-bit state, consumed solely by the capsule-type randomizer (one draw per
 * capsule decision, §12.3). The full 32-bit state is captured in replay headers
 * and save states (§30.7). In 2-player mode each player owns an independent
 * stream seeded `seedHash XOR playerIndex`.
 */

/** Deterministic string→uint32 hash for seeding from the replay-header `deterministicSeed`. */
export function seedFromString(s: string): number {
  // FNV-1a 32-bit, folded to uint32.
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // Avalanche finish.
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

export class Mulberry32 {
  private a: number; // uint32 state

  constructor(seed: number) {
    this.a = seed >>> 0;
  }

  /** Advance one draw; returns a uint32 in [0, 2^32). */
  next(): number {
    this.a = (this.a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(this.a ^ (this.a >>> 15), 1 | this.a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0);
  }

  /** Weighted index pick over `weights` (deterministic integer arithmetic). */
  weightedIndex(weights: readonly number[]): number {
    let total = 0;
    for (const w of weights) total += w;
    if (total <= 0) return 0;
    let r = this.next() % total;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r < 0) return i;
    }
    return weights.length - 1;
  }

  /** Capture the current 32-bit state (for replay/save). */
  getState(): number {
    return this.a >>> 0;
  }

  /** Restore a previously captured state. */
  setState(state: number): void {
    this.a = state >>> 0;
  }

  /** Build a per-player stream seed (§30.4): baseHash XOR playerIndex. */
  static playerSeed(baseHash: number, playerIndex: number): number {
    return (baseHash ^ playerIndex) >>> 0;
  }
}
