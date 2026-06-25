# Game State Machine

*Reference: `prd.md` Section 31 (State Transition Table)*

This document visualizes the implementation of state transitions defined in the PRD.

## 1. Global Application State
```mermaid
stateDiagram-v2
    [*] --> BOOT
    BOOT --> TITLE
    TITLE --> DEMO : Idle Timeout
    DEMO --> TITLE : Any Input
    TITLE --> GAME_INIT : Start Input
    GAME_INIT --> ROUND_START
    ROUND_START --> PLAYING
    PLAYING --> PAUSED : Start Input
    PAUSED --> PLAYING : Start Input
    PLAYING --> LIFE_LOST : All Balls Lost
    LIFE_LOST --> ROUND_START : Lives > 0
    LIFE_LOST --> GAME_OVER : Lives == 0
    PLAYING --> STAGE_CLEAR : Bricks == 0
    STAGE_CLEAR --> ROUND_START : Next Round
    GAME_OVER --> TITLE
```
*Note: Refer to PRD Section 31 for specific tick delays and transition triggers.*
