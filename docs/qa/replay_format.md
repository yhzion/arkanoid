# Replay and Determinism Format

*Reference: `prd.md` Section 30.6 (Input Logs & Replays)*

## 1. Serialization Format
To ensure replayability, inputs are recorded per tick using a minimal JSON or Binary structure.

## 2. Schema
```typescript
export interface IReplayLog {
    version: number;
    gameConfig: {
        mode: string;
        seed: number;
        region: string;
    };
    frames: IFrameInput[];
}

export interface IFrameInput {
    t: number;      // Tick number (only recorded if input state changes)
    b: number;      // Bitmask for buttons (e.g., 0x01: Left, 0x02: Right, 0x04: Fire)
    a: number;      // Analog value (for pointer/paddle mode)
}
```

## 3. Validation
Replays are validated by running the engine headlessly for `N` ticks and asserting that the final score, lives, and hash of entity positions match the expected end state.
