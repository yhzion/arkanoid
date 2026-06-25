# Data Schemas

*Reference: `prd.md` Sections 14.4 (Level Schema) and 8.8 (Leaderboard)*

## 1. Level JSON Schema (TypeScript Interface)
```typescript
export type BrickType = 'EMPTY' | 'COLOR' | 'SILVER' | 'GOLD';
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
    clearRequiredCount: number;
    cells: IBrickCell[];
}

export interface IBrickCell {
    col: number;
    row: number;
    type: BrickType;
    hitsRemaining: number;
    capsule: CapsuleType;
    isCapsuleCarrier: boolean;
}
```

## 2. Leaderboard Schema
```typescript
export interface ILeaderboardEntry {
    score: number;
    initials: string;
    round: number;
    region: string;
    mode: string;
    date: string; // ISO string
}

export interface ILeaderboardStorage {
    schemaVersion: number;
    entries: ILeaderboardEntry[];
}
```
