export class FixedStepLoop {
    private lastTime: number = 0;
    private accumulator: number = 0;
    private isRunning: boolean = false;
    private frameId: number | null = null;
    private updateSim: () => void;
    private renderSim: () => void;
    
    // 60 simulation ticks per second -> 16.666 ms per tick
    private readonly tickDuration: number = 1000 / 60;

    constructor(updateSim: () => void, renderSim: () => void) {
        this.updateSim = updateSim;
        this.renderSim = renderSim;
    }

    public start(): void {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = performance.now();
        this.accumulator = 0;
        this.frameId = requestAnimationFrame(this.loop);
    }

    public stop(): void {
        this.isRunning = false;
        if (this.frameId !== null) {
            cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }
    }

    private loop = (now: number): void => {
        if (!this.isRunning) return;

        let deltaTime = now - this.lastTime;
        this.lastTime = now;

        // Cap deltaTime to avoid massive catch-ups (e.g. background tab suspend)
        if (deltaTime > 100) {
            deltaTime = 100;
        }

        this.accumulator += deltaTime;

        let tickCount = 0;
        while (this.accumulator >= this.tickDuration) {
            this.updateSim();
            this.accumulator -= this.tickDuration;
            tickCount++;

            // Catch-up cap: at most 5 ticks processed per frame
            if (tickCount >= 5) {
                // Excess accumulated time beyond the cap is discarded
                this.accumulator = 0;
                break;
            }
        }

        // Render step
        this.renderSim();

        this.frameId = requestAnimationFrame(this.loop);
    };
}
export default FixedStepLoop;
