// PRD 30.6 Fixed-step & input (D11, D12)
// Simulation runs at 60 ticks/s via a frame-time accumulator; at most 5 ticks are processed per rendered frame.

export class FixedStepEngine {
  private tickRate = 60;
  private tickDuration = 1000 / this.tickRate;
  private accumulator = 0;
  private lastTime = 0;
  private maxCatchUpTicks = 5;

  private tickCallback: () => void;
  private renderCallback: () => void;

  private animationFrameId: number | null = null;

  constructor(tickCallback: () => void, renderCallback: () => void) {
    this.tickCallback = tickCallback;
    this.renderCallback = renderCallback;
  }

  public start() {
    this.lastTime = performance.now();
    this.animationFrameId = requestAnimationFrame((t) => this.loop(t));
  }

  public stop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private loop(currentTime: number) {
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    this.accumulator += deltaTime;

    let ticksProcessed = 0;

    while (this.accumulator >= this.tickDuration && ticksProcessed < this.maxCatchUpTicks) {
      this.tickCallback();
      this.accumulator -= this.tickDuration;
      ticksProcessed++;
    }

    // Discard excess accumulated time beyond the cap
    if (this.accumulator >= this.tickDuration) {
      this.accumulator = 0;
    }

    this.renderCallback();

    this.animationFrameId = requestAnimationFrame((t) => this.loop(t));
  }
}
