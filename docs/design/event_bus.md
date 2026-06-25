# Event Bus API

*Reference: `prd.md` Section 26 (Minimum Event List)*

## 1. Implementation Concept
The engine uses a global `EventBus` to decouple components. 
- Rendering components listen to state change events.
- Audio systems listen to SFX events (e.g., `BALL_BOUNCE`, `BRICK_BREAK`).
- UI/HUD updates on `SCORE_CHANGED` or `LIFE_LOST`.

## 2. Event Types & Payloads
```typescript
export enum GameEvents {
    // Gameplay
    BALL_LAUNCHED = 'BALL_LAUNCHED',
    BALL_LOST = 'BALL_LOST',
    BRICK_DESTROYED = 'BRICK_DESTROYED',
    POWERUP_COLLECTED = 'POWERUP_COLLECTED',
    
    // State
    SCORE_CHANGED = 'SCORE_CHANGED',
    ROUND_CLEARED = 'ROUND_CLEARED',
    GAME_OVER = 'GAME_OVER',

    // Input
    INPUT_ACTION = 'INPUT_ACTION'
}

export interface ScoreChangedPayload {
    newScore: number;
    delta: number;
    reason: string;
}
```
*Note: Do not define game rules here. Refer to PRD for scoring logic.*
