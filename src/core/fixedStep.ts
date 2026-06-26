/**
 * Fixed-step accumulator loop — PRD §7.2, §30.6 (D11, D12).
 *
 * Simulation runs at 60 ticks/s via a wall-clock accumulator. At most
 * MAX_TICKS_PER_FRAME ticks are processed per rendered frame (catch-up cap);
 * excess accumulated time beyond the cap is discarded. The absolute tick index
 * is unaffected by the cap (§30.6).
 */
import { MAX_TICKS_PER_FRAME, TICK_MS } from './constants';

export interface FixedStepperHooks {
  /** Called exactly once per simulated tick. */
  onTick: (tickIndex: number) => void;
  /** Optional: called once per rendered frame with the interpolation alpha [0,1). */
  onFrame?: (alpha: number, tickIndex: number) => void;
}

export class FixedStepper {
  private accumulator = 0;
  private tickIndex = 0;
  /** Total wall-clock ms discarded by the catch-up cap (telemetry only). */
  discardedMs = 0;

  constructor(private hooks: FixedStepperHooks) {}

  /**
   * Advance the simulation by `deltaMs` of wall-clock time.
   * Returns the number of ticks processed this call.
   */
  advance(deltaMs: number): number {
    this.accumulator += deltaMs;
    let processed = 0;
    // Epsilon absorbs float drift in the 1000/60 step so exact multiples tick
    // the expected count. Replay determinism is unaffected: replays feed per-tick
    // inputs directly rather than via wall-clock accumulation.
    const EPS = 1e-9;
    while (this.accumulator >= TICK_MS - EPS && processed < MAX_TICKS_PER_FRAME) {
      this.hooks.onTick(this.tickIndex);
      this.tickIndex++;
      this.accumulator -= TICK_MS;
      processed++;
    }
    // Discard excess beyond the per-frame cap (§30.6).
    if (this.accumulator >= TICK_MS * MAX_TICKS_PER_FRAME) {
      const excess = this.accumulator - TICK_MS * (MAX_TICKS_PER_FRAME - 1);
      this.discardedMs += excess;
      this.accumulator = TICK_MS * (MAX_TICKS_PER_FRAME - 1);
    }
    const alpha = this.accumulator / TICK_MS; // [0,1)
    this.hooks.onFrame?.(alpha, this.tickIndex);
    return processed;
  }

  getTickIndex(): number {
    return this.tickIndex;
  }

  reset(): void {
    this.accumulator = 0;
    this.tickIndex = 0;
    this.discardedMs = 0;
  }
}
