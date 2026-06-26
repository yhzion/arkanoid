const TICK_RATE = 60;
const TICK_MS = 1000 / TICK_RATE;
const MAX_TICKS_PER_FRAME = 5;

export type TickCallback = (tick: number) => void;
export type RenderCallback = (alpha: number) => void;

export class FixedStepLoop {
  private accumulator = 0;
  private lastTime = 0;
  private tickCount = 0;
  private running = false;
  private rafId = 0;

  constructor(
    private onTick: TickCallback,
    private onRender: RenderCallback,
  ) {}

  get tick(): number { return this.tickCount; }
  get isRunning(): boolean { return this.running; }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.loop(this.lastTime);
  }

  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  reset() {
    this.tickCount = 0;
    this.accumulator = 0;
  }

  private loop = (now: number) => {
    if (!this.running) return;
    const delta = now - this.lastTime;
    this.lastTime = now;
    this.accumulator += delta;

    let ticks = 0;
    while (this.accumulator >= TICK_MS && ticks < MAX_TICKS_PER_FRAME) {
      this.onTick(this.tickCount);
      this.tickCount++;
      this.accumulator -= TICK_MS;
      ticks++;
    }
    if (this.accumulator > TICK_MS * MAX_TICKS_PER_FRAME) {
      this.accumulator = 0;
    }

    const alpha = this.accumulator / TICK_MS;
    this.onRender(alpha);
    this.rafId = requestAnimationFrame(this.loop);
  };
}
