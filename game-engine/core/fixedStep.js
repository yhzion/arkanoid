// PRD 30.6 Fixed-step & input (D11, D12)
// Simulation runs at 60 ticks/s via a frame-time accumulator; at most 5 ticks are processed per rendered frame.
export class FixedStepEngine {
    tickRate = 60;
    tickDuration = 1000 / this.tickRate;
    accumulator = 0;
    lastTime = 0;
    maxCatchUpTicks = 5;
    tickCallback;
    renderCallback;
    animationFrameId = null;
    constructor(tickCallback, renderCallback) {
        this.tickCallback = tickCallback;
        this.renderCallback = renderCallback;
    }
    start() {
        this.lastTime = performance.now();
        this.animationFrameId = requestAnimationFrame((t) => this.loop(t));
    }
    stop() {
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
        }
    }
    loop(currentTime) {
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
//# sourceMappingURL=fixedStep.js.map