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
    PLAYING --> PLAYING : all bricks cleared (break exit opens)
    PLAYING --> BREAK_WARP : Vaus enters break exit
    PLAYING --> PAUSED : Start
    BOSS_PLAYING --> PAUSED : Start
    PAUSED --> PLAYING : Start (returns to pausedFrom)
    PAUSED --> TITLE : quit-to-title

    LIFE_LOST --> BALL_READY : lives > 0
    LIFE_LOST --> GAME_OVER : lives == 0

    BREAK_WARP --> BOSS_INTRO : next round is boss (17 or 34)
    BREAK_WARP --> ROUND_INTRO : else (next round, L/R by exit side)

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
- **Boss rounds**: DOH appears as two encounters — a mid-game boss at Round 17 and the final boss at Round 34 (`boot.ts:294` treats both identically). `BOSS_INTRO` is entered when `roundNumber ∈ {17, 34}`; the Round 17 boss returns to normal play (Round 18), the Round 34 boss leads to `ENDING`.
- **L/R branching**: rounds 2–16 and 19–33 have L/R layout variants (`round-NNL.json` / `round-NNR.json`). The branch is selected on stage exit — entering the break-warp on the left vs. right side emits branch `L` vs. `R` (`roundState.ts:122-126`), which sets `currentRoundBranch` for the next round load (`boot.ts:340`, `assetLoader.ts:8`).
- **Stage clear uses the break-exit mechanism**: clearing all required bricks opens the break exit (`isBreakWarpOpen=true`, `BREAK_WARP_OPENED`, `roundState.ts:242-248`) rather than firing a distinct `ROUND_CLEAR` transition. The player then leaves through the left/right exit, which both advances the round and picks the L/R branch. The `ROUND_CLEAR` enum value exists but is never entered (`changeState('ROUND_CLEAR')` is absent); `BREAK_WARP` is the single advance path.
