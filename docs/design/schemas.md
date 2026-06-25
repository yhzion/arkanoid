# Data Schemas

*Reference: `prd.md` Sections 14.4 (Level Schema), 14.5 (Brick Type Codes), 8.8 (Leaderboard / Settings), and 25 (GameConfig)*

## 1. Level JSON Schema (TypeScript Interface)
```typescript
// Exact codes per PRD §14.5.
export type BrickType =
    | 'EMPTY'
    | 'WHITE'
    | 'ORANGE'
    | 'LIGHT_BLUE'
    | 'GREEN'
    | 'RED'
    | 'BLUE'
    | 'PINK'
    | 'YELLOW'
    | 'SILVER'
    | 'GOLD';
export type CapsuleType = 'S' | 'C' | 'L' | 'D' | 'P' | 'E' | 'B' | null;

export interface ILevelData {
    id: string;
    region: 'US' | 'JP';
    roundNumber: number;
    type: 'brick' | 'boss';
    grid: {
        columns: number; // usually 11
        rows: number;    // usually 28
        brickWidth: number;  // 16
        brickHeight: number; // 8
    };
    clearRequiredCount: number; // derived: MUST equal count of cells with clearRequired === true (§14.4)
    cells: IBrickCell[];
    enemyProfile: string;
    ballProfile: string;
    paletteProfile: string;
}

export interface IBrickCell {
    col: number;
    row: number;
    type: BrickType;
    hitsRemaining: number;
    capsule: CapsuleType;
    isCapsuleCarrier: boolean;
    clearRequired: boolean;
}
```

## 2. Leaderboard & Settings Schema
```typescript
export interface ILeaderboardEntry {
    score: number;
    initials: string; // max 3 chars (§8.8); validate/clamp to 3 on load
    round: number;
    region: string;
    mode: string;
    date: string; // ISO string
}

export interface ILeaderboardStorage {
    schemaVersion: number;
    entries: ILeaderboardEntry[];
}

// Settings key mirrors the leaderboard versioned-schema pair (§8.8).
export interface ISettingsStorage {
    schemaVersion: number;
    config: GameConfig; // full GameConfig per §25 (region, mode, deflectionModel,
                        // jitterEnabled, numericModel, inputMode, volumes, etc.)
    remaps: {
        // Control bindings (§9.5) serialized as KeyboardEvent.code strings.
        keyboard: Record<string, string>;
        // Gamepad standard-mapping button index (§8.8).
        gamepad: Record<string, number>;
    };
}
```
