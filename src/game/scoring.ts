/**
 * Scoring + extra-life awards — PRD §16, §10.5, §16.3, §32.
 *
 * Score persists across rounds and life losses (§16.2). Extra-life thresholds:
 * first at 20,000, then every 60,000 thereafter (§10.5). A single scoring event
 * crossing multiple thresholds awards multiple lives (§16.3). Per §32, score/extra
 * awards (step 2) resolve BEFORE the ball-out/life-loss check (step 4), so an
 * extra life earned on the fatal tick prevents game over.
 */
import { EventBus, GameEvents } from '../core/eventBus';
import { EXTRA_LIFE_FIRST, EXTRA_LIFE_STEP } from '../core/constants';

/** threshold(i) = 20000 + i*60000 for i >= 0 (§10.5). */
function threshold(i: number): number {
  return EXTRA_LIFE_FIRST + i * EXTRA_LIFE_STEP;
}

/** Count extra-life thresholds lying in the half-open interval (prev, next]. */
export function countCrossedThresholds(prev: number, next: number): number {
  if (next <= prev) return 0;
  // smallest i with threshold(i) > prev
  let i = Math.max(0, Math.floor((prev - EXTRA_LIFE_FIRST) / EXTRA_LIFE_STEP) + 1);
  if (threshold(i) <= prev) i++; // safety
  let count = 0;
  while (threshold(i) <= next) {
    count++;
    i++;
  }
  return count;
}

export class ScoreTracker {
  score = 0;

  constructor(private bus: EventBus, private onExtraLife: (count: number) => void) {}

  /** Add points; awards any crossed extra-life thresholds; emits SCORE_CHANGED. */
  add(delta: number, reason: string): void {
    const prev = this.score;
    const next = prev + delta;
    this.score = next;
    this.bus.emit(GameEvents.SCORE_CHANGED, { newScore: next, delta, reason });

    const crossed = countCrossedThresholds(prev, next);
    if (crossed > 0) {
      this.onExtraLife(crossed);
      for (let k = 0; k < crossed; k++) {
        this.bus.emit(GameEvents.EXTRA_LIFE_AWARDED, { lives: 0 }); // lives filled by caller
      }
    }
  }
}
