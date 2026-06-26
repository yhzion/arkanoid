# Implementation Backlog — Code vs. Spec Gaps

These are **code defects measured against the PRD** (`prd.md`), which is the
engineering source of truth for physics, determinism, and behavior. The PRD is
intentionally **NOT** changed to match these — fixing them means changing
`src/`, not the spec.

Scope note: the project content (rounds, capsule roster, boss count) was aligned
to the implemented Arkanoid II structure in the 2026-06-26 PRD revision. The
items below are the remaining *behavioral* gaps where the code, not the doc, is
wrong. Evidence cites `file:line` from that revision's snapshot; line numbers may
drift.

## Physics

- [ ] Ball speed scaling absent (PRD §10.2): no first-ceiling-hit `+0.25`, no
  `+0.05` per 10 accumulated brick hits, no `5.0` cap. `setSpeed` exists but
  nothing drives it (`src/entities/ball.ts`).
- [ ] Launch-direction boundary bug (PRD §10.3): `ball.ts:97` uses
  `vausCenter >= playfieldCenter → launch LEFT`; spec is center-inclusive →
  launch **right**. The equality case is inverted.
- [ ] Global 75°-from-vertical velocity clamp applied on **every** velocity
  update — walls, jitter, splits — not just paddle deflection
  (`ball.ts:46-55`). Spec's 75° is a paddle-deflection maximum only (§10.4.1).

## Capsules

- [ ] **M/R capsules unreachable**: `applyPowerUp` has `M`/`R` handlers
  (`src/core/roundState.ts:299-306`) but they are absent from the drop weight
  table (`src/entities/capsules.ts:51-59`), so they can never spawn via the
  randomizer. Either wire them into drops or load them via level data.
- [ ] `R` (Reduce) couples "shrink Vaus" with "double brick score":
  `vaus.reduceActive` is passed as the `doubleScore` argument
  (`roundState.ts:466,515`). Confirm whether this coupling is intended or a
  naming/wiring smell.
- [ ] "Only one falling capsule active at a time" (PRD §12.1) not enforced —
  `CapsuleManager.spawn()` unconditionally pushes (`capsules.ts:40-46`).
- [ ] Power-up effects not reset on ball/life loss (PRD §12.1):
  `laser/catch/enlarge` persist after death; `applyPowerUp` only runs on a new
  collection, no reset on `BALL_LOST`.

## Screen Flow

- [ ] STAGE CLEAR (`ROUND_CLEAR`) transition is effectively dead (PRD §8.9):
  normal full-clear routes through the break-warp path
  (`roundState.ts:228-233`), so `ROUND_CLEAR` is never reached and no
  stage-clear banner renders.
- [ ] `GAMEPLAY_DEMO` renders a black screen (PRD §8.2): the state is missing
  from both the gameplay render list and the overlay switch
  (`src/render/renderer.ts:68-71, 463-483`); the demo logic runs but draws
  nothing.
- [ ] 2-player score routing unimplemented (PRD §16.2): `player1Score` /
  `is2PlayerMode` fields exist but `addScore` only mutates `this.score`
  (`src/core/gameState.ts:13-16`).

## Determinism / Replay

- [ ] Replay layer has no validation (PRD §19.4.1): imported replays are trusted
  without `configHash`/`formatVersion` checks (`src/core/replay.ts:69`);
  `computeConfigHash` exists but is never compared.
- [ ] Replay playback is sparse-tolerant: on tick mismatch it silently
  substitutes neutral input instead of enforcing `tick === array index`
  (`replay.ts:80-93`), masking desyncs.
- [ ] Replay schema drift: code stores `pointerXDelta`/`pointerXAbsolute` where
  the doc specifies a single quantized `paddleX`; per-tick input adds `select`
  not in the canonical `IFrameInput` (`replay.ts:11-12`,
  `docs/qa/replay_format.md`).

## Audio

- [ ] SFX coverage ~11/28 events (PRD §17.3): many defined `GameEvents`
  (capsule spawn, enemy spawn/destroyed, powerup activated, boss projectile
  fired/defeated, break-warp opened) are never subscribed
  (`src/audio/audio.ts:305-329`).
- [ ] Wall-hit and catch SFX masquerade as `BRICK_HIT` with synthetic
  `'WALL'`/`'CATCH'` types and play the generic 150Hz thud
  (`roundState.ts:325,338,368`, `audio.ts:157-164`) — no distinct cues.

## Render

- [ ] Integer scaling unimplemented (PRD §6.1): `renderScaleMode:'integer'` is
  stored in config (`src/data/levelSchema.ts:66`) but never read; CSS scales the
  canvas fluidly to a non-integer factor with no integer snap or letterbox
  (`style.css:117-119`).

## Dead Code

- [ ] The entire `game-engine/` tree is not in the build — `index.html` loads
  `/src/main.ts`. Stale duplicate modules (+ compiled `.js`/`.d.ts`/`.map`)
  should be removed to avoid confusion.
