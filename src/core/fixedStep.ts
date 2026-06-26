const TICK_MS = 1000 / 60;
const MAX_TICKS_PER_FRAME = 5;

export interface FixedStepCallbacks {
  tick: (deltaMs: number) => void;
  render: (interpolation: number) => void;
}

export class FixedStepLoop {
  private accumulator = 0;
  private lastTime = 0;
  private running = false;
  private frameId = 0;
  private tickIndex = 0;
  private callbacks: FixedStepCallbacks;

  constructor(callbacks: FixedStepCallbacks) {
    this.callbacks = callbacks;
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.frameId = requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.frameId);
  }

  getTickIndex(): number {
    return this.tickIndex;
  }

  private frame = (now: number): void => {
    if (!this.running) return;
    const delta = Math.min(now - this.lastTime, 100);
    this.lastTime = now;
    this.accumulator += delta;

    let ticks = 0;
    while (this.accumulator >= TICK_MS && ticks < MAX_TICKS_PER_FRAME) {
      this.callbacks.tick(TICK_MS);
      this.accumulator -= TICK_MS;
      this.tickIndex++;
      ticks++;
    }

    if (ticks === MAX_TICKS_PER_FRAME) {
      this.accumulator = 0;
    }

    const interpolation = this.accumulator / TICK_MS;
    this.callbacks.render(interpolation);
    this.frameId = requestAnimationFrame(this.frame);
  };
}
