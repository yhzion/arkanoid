# Game State Machine

*Reference: `prd.md` Section 31 (State Transition Table), Section 19.3 (`GameState` enum)*

This document visualizes the implementation of state transitions defined in the PRD.

## 1. Global Application State
```mermaid
stateDiagram-v2
    [*] --> BOOT
    BOOT --> LOADING
    LOADING --> TITLE : success
    LOADING --> ERROR : failure

    TITLE --> OPENING_STORY : idle 600 t (storyExit=idle)
    TITLE --> OPENING_STORY : Start (storyExit=newGame)
    TITLE --> ROUND_INTRO : continue-code

    OPENING_STORY --> GAMEPLAY_DEMO : storyExit=idle, 600 t
    OPENING_STORY --> ROUND_INTRO : storyExit=newGame, scroll end
    GAMEPLAY_DEMO --> TITLE : 600 t or any input

    ROUND_INTRO --> BALL_READY : jingle complete
    BALL_READY --> PLAYING : Fire
    BALL_READY --> ROUND_INTRO : A+Start skip secret (round+1, cap 16)

    PLAYING --> LIFE_LOST : all balls lost
    PLAYING --> ROUND_CLEAR : clear-required == 0
    PLAYING --> BREAK_WARP : Vaus enters break exit
    PLAYING --> PAUSED : Start
    BOSS_PLAYING --> PAUSED : Start
    PAUSED --> PLAYING : Start (returns to pausedFrom)
    PAUSED --> TITLE : quit-to-title

    LIFE_LOST --> BALL_READY : lives > 0
    LIFE_LOST --> GAME_OVER : lives == 0

    ROUND_CLEAR --> BOSS_INTRO : roundNumber == bossRound(region)
    ROUND_CLEAR --> ROUND_INTRO : else (round+1)
    BREAK_WARP --> ROUND_INTRO : entry anim end (round+1)

    BOSS_INTRO --> BOSS_PLAYING : intro end
    BOSS_PLAYING --> BOSS_DEFEATED : damage == 16
    BOSS_PLAYING --> BOSS_PLAYING : projectile hit, lives>0 (re-launch)
    BOSS_PLAYING --> GAME_OVER : projectile hit, lives==0 (skip NAME_ENTRY)
    BOSS_DEFEATED --> ENDING : defeat end

    GAME_OVER --> NAME_ENTRY : qualifies for leaderboard
    GAME_OVER --> TITLE : else
    NAME_ENTRY --> TITLE : 3rd initial or timeout
    ENDING --> TITLE : crawl + credits end
```

*Note: Refer to PRD Section 31 for specific tick delays and transition durations.*

## 2. Notes
- **Pausable states**: `PLAYING`, `BALL_READY`, `BOSS_PLAYING` only. All simulation timers freeze while paused.
- **PAUSED** records `pausedFrom` on entry and returns to it on resume.
- **GAMEPLAY_DEMO** replays a seeded input log on a fixed round, abortable by any input.
- **TURN_HANDOFF** (2-player) is `[DEFERRED → M3]` per §10.6 and is not part of the M1 single-player flow.
