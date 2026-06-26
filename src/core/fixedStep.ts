// PRD §7.2: Fixed simulation timestep - 60 ticks per second
export const TICK_RATE = 60;
export const TICK_MS = 1000 / TICK_RATE;

export type TickFn = (tick: number) => void;

export class FixedStep {
  private tick = 0;
  private accumulator = 0;
  private lastTime = 0;
  private running = false;
  private rafId = 0;
  private updateFn: TickFn;
  private renderFn: (alpha: number) => void;

  constructor(update: TickFn, render: (alpha: number) => void) {
    this.updateFn = update;
    this.renderFn = render;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.loop(this.lastTime);
  }

  stop(): void {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  reset(): void {
    this.tick = 0;
    this.accumulator = 0;
  }

  getTick(): number {
    return this.tick;
  }

  private loop = (now: number): void => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.loop);

    const delta = now - this.lastTime;
    this.lastTime = now;
    this.accumulator += delta;

    // Prevent spiral of death
    if (this.accumulator > TICK_MS * 5) {
      this.accumulator = TICK_MS * 5;
    }

    while (this.accumulator >= TICK_MS) {
      this.updateFn(this.tick);
      this.tick++;
      this.accumulator -= TICK_MS;
    }

    this.renderFn(this.accumulator / TICK_MS);
  };
}