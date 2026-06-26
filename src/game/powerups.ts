/**
 * Power-up effect application — PRD §12.1, §12.1.1 (replacement matrix), §12.2.
 *
 * Holds the active timed effect and translates a collected capsule into a set of
 * side effects the simulation executes (speed change, enlarge, catch, laser, split,
 * extra life, break exit). P is the sole exception: it grants an extra life and
 * preserves the current effect (§12.1.1).
 */
import { CapsuleType } from '../data/schemas';
import { SPEED_SLOW } from '../core/config';
import { Fx } from '../core/fixedpoint';

export type TimedEffect = 'none' | 'slow' | 'catch' | 'laser' | 'enlarge';

export interface PowerUpSideEffects {
  setSpeedSlow: boolean; // S
  enlarge: boolean; // E (true → grow, false on cancel handled separately)
  shrink: boolean; // undo enlarge
  catch: boolean; // C
  laser: boolean; // L
  split: boolean; // D
  extraLife: boolean; // P
  breakOpen: boolean; // B
  /** Whether the previously-active timed effect was cancelled. */
  cancelledPrevious: TimedEffect;
}

export const NO_EFFECTS: PowerUpSideEffects = {
  setSpeedSlow: false,
  enlarge: false,
  shrink: false,
  catch: false,
  laser: false,
  split: false,
  extraLife: false,
  breakOpen: false,
  cancelledPrevious: 'none',
};

export class PowerUpManager {
  active: TimedEffect = 'none';

  /** Apply a collected capsule per the §12.1.1 replacement matrix. */
  apply(type: CapsuleType): PowerUpSideEffects {
    // P: immediate, preserves current effect (§12.1.1).
    if (type === 'P') {
      return { ...NO_EFFECTS, extraLife: true, cancelledPrevious: 'none' };
    }

    const prev = this.active;
    const cancelled = prev;
    // Cancel the previous timed effect (enlarge shrinks; others just clear).
    this.active = 'none';

    const fx: PowerUpSideEffects = { ...NO_EFFECTS, cancelledPrevious: cancelled };
    if (prev === 'enlarge') fx.shrink = true;

    switch (type) {
      case 'S':
        this.active = 'slow';
        fx.setSpeedSlow = true;
        break;
      case 'C':
        this.active = 'catch';
        fx.catch = true;
        break;
      case 'L':
        this.active = 'laser';
        fx.laser = true;
        break;
      case 'E':
        this.active = 'enlarge';
        fx.enlarge = true;
        break;
      case 'D':
        // Disruption: split (caller creates extra balls). Catch stays active on the
        // split balls per §12.1.1 — keep current catch if it was catch.
        if (prev === 'catch') this.active = 'catch';
        fx.split = true;
        break;
      case 'B':
        fx.breakOpen = true;
        break;
    }
    return fx;
  }

  /** Clear all timed effects (life loss / round clear, §8.6/§8.9). */
  reset(): void {
    this.active = 'none';
  }

  /** Current slow speed target (§33.1 D15). */
  static slowSpeed(): Fx {
    return SPEED_SLOW;
  }
}
