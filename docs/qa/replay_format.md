# Replay and Determinism Format

*Reference: `prd.md` Section 19.4.1 (canonical replay schema), 30.6 (per-tick input sampling), 30.7 (header & configHash)*

## 1. Serialization Format
To ensure replayability, inputs are recorded per tick using a minimal JSON or Binary structure.

## 2. Schema
The header carries every determinism-affecting field (§19.4.1, §30.7). `inputTicks` is a **dense** log: exactly one record per tick, `tick === array index` (§30.6).

```typescript
export interface IReplayLog {
    formatVersion: number;        // bump on any determinism-breaking change (§30.7)
    gameVersion: string;          // semver
    region: "US" | "JP";
    mode: "licensed-fidelity" | "clean-room"; // §25
    seed: string;                 // deterministicSeed (§30.4)
    startRound: number;
    configHash: string;           // SHA-256 of canonical gameplay config + sim-asset manifest (§30.7)
    deflectionModel: "continuous" | "discrete8";
    jitterEnabled: boolean;
    numericModel: string;         // e.g. "q16.16-v1"
    prngState: string[];          // mulberry32 state per active stream; one per player in 2P (§30.4)
    inputTicks: IFrameInput[];
}

export interface IFrameInput {
    tick: number;   // equals array index; every tick present (§30.6)
    input: {
        left: boolean;
        right: boolean;
        fire: boolean;
        start?: boolean;
        paddleX?: number; // pointer/analog mode: integer logical pixels, quantized before sim (§30.6)
    };
}
```

## 3. Validation
- On `configHash` **or** `formatVersion` mismatch a replay is **rejected** (not played) (§30.7).
- Imported replay JSON is untrusted external input and MUST be validated/sanitized before use (§19.4.1).
- Headless re-simulation must reproduce a **byte-identical final state** AND a matching `configHash` across the §5.1 browser matrix (§34.1, §20.6): assert final score, lives, and a hash of entity positions.
