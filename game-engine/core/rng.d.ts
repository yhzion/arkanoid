/**
 * Mulberry32 PRNG (32-bit state)
 * PRD Section 30.4
 * The capsule randomizer uses mulberry32 (32-bit state), seeded once at game start.
 */
export declare class RNG {
    private state;
    constructor(seed: number);
    next(): number;
    nextInt(min: number, max: number): number;
    getState(): number;
    setState(state: number): void;
}
//# sourceMappingURL=rng.d.ts.map