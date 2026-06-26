/**
 * Mulberry32 PRNG (32-bit state)
 * PRD Section 30.4
 * The capsule randomizer uses mulberry32 (32-bit state), seeded once at game start.
 */
export class RNG {
    state;
    constructor(seed) {
        this.state = seed;
    }
    // Returns a random float between 0 and 1
    next() {
        let t = (this.state += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    // Returns a random integer between min and max (inclusive)
    nextInt(min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }
    // PRD 30.4 state getter for replay headers
    getState() {
        return this.state;
    }
    setState(state) {
        this.state = state;
    }
}
//# sourceMappingURL=rng.js.map