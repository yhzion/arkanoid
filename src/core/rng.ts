export class SeededRNG {
    private state: number;

    constructor(seed: number) {
        this.state = seed >>> 0;
    }

    /**
     * Advances the PRNG state by one step and returns a float in [0, 1).
     */
    public next(): number {
        let z = (this.state = (this.state + 0x6d2b79f5) | 0);
        z = Math.imul(z ^ (z >>> 15), z | 1);
        z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
        return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
    }

    /**
     * Get the current 32-bit state.
     */
    public getState(): number {
        return this.state;
    }

    /**
     * Restore the 32-bit state.
     */
    public setState(state: number): void {
        this.state = state >>> 0;
    }
}

/**
     * Generates a 32-bit integer seed from a string seed.
     */
export function hashSeed(seedStr: string): number {
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
        const char = seedStr.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0; // Convert to 32bit integer
    }
    return hash >>> 0;
}
