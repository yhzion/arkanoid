const TICK_DURATION = 1000 / 60;
const MAX_TICKS_PER_FRAME = 5;

export class FixedStep {
  private accumulator = 0;
  private tickCount = 0;
  private lastTime = 0;
  private running = false;

  constructor(
    private onTick: (tick: number) => void,
    private onFrame: (interpolation: number) => void,
  ) {}

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
  }

  private frame = (now: number): void => {
    if (!this.running) return;
    let elapsed = now - this.lastTime;
    this.lastTime = now;

    if (elapsed > TICK_DURATION * MAX_TICKS_PER_FRAME) {
      elapsed = TICK_DURATION * MAX_TICKS_PER_FRAME;
    }

    this.accumulator += elapsed;
    let ticks = 0;
    while (this.accumulator >= TICK_DURATION && ticks < MAX_TICKS_PER_FRAME) {
      this.accumulator -= TICK_DURATION;
      this.tickCount++;
      ticks++;
      this.onTick(this.tickCount);
    }

    this.onFrame(this.accumulator / TICK_DURATION);
    requestAnimationFrame(this.frame);
  };
}
