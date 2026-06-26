export declare class FixedStepEngine {
    private tickRate;
    private tickDuration;
    private accumulator;
    private lastTime;
    private maxCatchUpTicks;
    private tickCallback;
    private renderCallback;
    private animationFrameId;
    constructor(tickCallback: () => void, renderCallback: () => void);
    start(): void;
    stop(): void;
    private loop;
}
//# sourceMappingURL=fixedStep.d.ts.map