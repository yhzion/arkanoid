# Event Bus API

*Reference: `prd.md` Section 26 (Minimum Event List), Section 17.3 (SFX), Section 16.1 (Score events)*

## 1. Implementation Concept
The engine uses a global `EventBus` to decouple components.
- Rendering components listen to state change events.
- Audio systems listen to SFX events (mapped to PRD Section 17.3).
- UI/HUD updates on score events (mapped to PRD Section 16.1) and `LIFE_LOST`.

## 2. Event Types & Payloads
The enum below mirrors the Section 26 minimum event list verbatim. `SCORE_CHANGED` and `INPUT_ACTION` are engine-internal additions, not part of the Section 26 minimum list.

```typescript
export enum GameEvents {
    // --- Section 26 minimum event list ---
    APP_BOOTED = 'APP_BOOTED',
    TITLE_SHOWN = 'TITLE_SHOWN',
    PLAYER_COUNT_CHANGED = 'PLAYER_COUNT_CHANGED',
    GAME_STARTED = 'GAME_STARTED',
    ROUND_STARTED = 'ROUND_STARTED',
    BALL_LAUNCHED = 'BALL_LAUNCHED',
    BRICK_HIT = 'BRICK_HIT',
    BRICK_DESTROYED = 'BRICK_DESTROYED',
    CAPSULE_SPAWNED = 'CAPSULE_SPAWNED',
    CAPSULE_COLLECTED = 'CAPSULE_COLLECTED',
    POWERUP_ACTIVATED = 'POWERUP_ACTIVATED',
    LASER_FIRED = 'LASER_FIRED',
    ENEMY_SPAWNED = 'ENEMY_SPAWNED',
    ENEMY_DESTROYED = 'ENEMY_DESTROYED',
    BALL_LOST = 'BALL_LOST',
    LIFE_LOST = 'LIFE_LOST',
    EXTRA_LIFE_AWARDED = 'EXTRA_LIFE_AWARDED',
    ROUND_CLEARED = 'ROUND_CLEARED',
    BREAK_WARP_OPENED = 'BREAK_WARP_OPENED',
    BREAK_WARP_ENTERED = 'BREAK_WARP_ENTERED',
    BOSS_STARTED = 'BOSS_STARTED',
    BOSS_HIT = 'BOSS_HIT',
    BOSS_PROJECTILE_FIRED = 'BOSS_PROJECTILE_FIRED',
    BOSS_DEFEATED = 'BOSS_DEFEATED',
    GAME_OVER = 'GAME_OVER',
    NAME_ENTRY_STARTED = 'NAME_ENTRY_STARTED',
    ENDING_STARTED = 'ENDING_STARTED',
    RETURNED_TO_TITLE = 'RETURNED_TO_TITLE',

    // --- Engine-internal additions (not in Section 26 minimum list) ---
    SCORE_CHANGED = 'SCORE_CHANGED',
    INPUT_ACTION = 'INPUT_ACTION'
}
```

### Payloads
The bus is a typed-payload API. Representative payload interfaces below demonstrate the shape; remaining events follow the same `{ typed-payload }` pattern.

```typescript
export interface ScoreChangedPayload {
    newScore: number;
    delta: number;
    reason: string;
}

export interface BrickDestroyedPayload {
    row: number;
    col: number;
    type: BrickType;
    scoreDelta: number;
}

export interface CapsuleCollectedPayload {
    type: CapsuleType;
}

export interface RoundClearedPayload {
    round: number;
}

export interface BallLostPayload {
    ballsRemaining: number;
}

export interface BossHitPayload {
    damage: number;
}
```

*Note: SFX events map to PRD Section 17.3; score events map to PRD Section 16.1.*

*Note: Do not define game rules here. Refer to PRD for scoring logic.*
