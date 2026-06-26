# Implementation Backlog — Code vs. Spec Gaps

These were code defects measured against the PRD (`prd.md`), the engineering
source of truth. Items are now resolved, reclassified as false positives, or
deferred. Evidence cites `file:line` from the 2026-06-26 snapshot.

Unit tests live in `tests/unit/` (vitest, `npm test`); e2e in `tests/*.spec.ts`
(Playwright).

## Resolved

- [x] **Launch direction** (§10.3): center-inclusive Vaus now launches right
  (`ball.ts` `>` instead of `>=`). Test: `tests/unit/ball.launch.test.ts`.
- [x] **Ball speed scaling shared across balls + reset on death** (§10.2):
  extracted `computeScaledSpeed()`; `RoundStateTracker.applyScaledSpeed()`
  applies one shared speed to every ball; `restartAfterDeath()` resets the
  ceiling/brick counters. Tests: `ball.speed.test.ts`, `roundState.speed.test.ts`.
- [x] **Single falling capsule + no RNG advance when skipped** (§12.1, §30.5):
  `CapsuleManager.spawn()` early-returns before drawing RNG when one capsule is
  active. Test: `capsules.test.ts`.
- [x] **Replay validation, dense log, paddleX schema** (§19.4.1, §30.6):
  `loadReplay()` rejects formatVersion/configHash mismatch and non-dense logs;
  `playTick()` indexes by tick and surfaces desync; schema uses `paddleX`.
  Test: `replay.test.ts`.
- [x] **GAMEPLAY_DEMO renders the playfield** (§8.2): extracted
  `isGameplayRenderState()` including `GAMEPLAY_DEMO`. Test: `renderer.state.test.ts`.
- [x] **Integer canvas scaling** (§6.1): `computeIntegerScale()` +
  `applyRenderScaleMode()` in `main.ts` consume `renderScaleMode`.
  Test: `scaling.test.ts`.
- [x] **SFX coverage** (§17.3): subscribed enemy-destroyed, capsule-spawned,
  powerup-activated, boss-projectile, boss-defeated, break-warp-opened; distinct
  wall/catch/paddle cues. Tests: `audio.subscriptions.test.ts`, `audio.paddle.test.ts`.

## False positives (no code change needed)

- [x] **Power-ups reset on death** (§12.1): `restartAfterDeath()` already calls
  `vaus.reset()` (clears laser/catch/enlarge/reduce) and `megaActive=false`. The
  gap report missed `restartAfterDeath`. Locked with a characterization test.
- [x] **`jp/` region field**: all 64 jp level files carry `region:"JP"`; jp is an
  independent dataset (all files differ from us). The "byte-identical copy" claim
  was wrong (verified with `diff -rq`).
- [x] **STAGE CLEAR transition "dead"** (§8.9): not a bug — clearing all bricks
  opens the break exit and the player leaves through the L/R exit, which is the
  intended Arkanoid II branch-selection mechanism. `ROUND_CLEAR` enum is unused
  by design; `BREAK_WARP` is the single advance path. Documented in
  `docs/design/state_machine.md`.
- [x] **`game-engine/` dead tree**: already `.gitignore`d (not committed); does
  not pollute the repo. No action needed.

## Deferred (out of current milestone)

- [ ] **2-player score routing** (§16.2, §10.6): two-player mode is
  `[DEFERRED → M3]` in the PRD; `addScore` tracks a single live score. Implement
  with the rest of 2P (TURN_HANDOFF) in M3.

## Open / intentionally retained

- [ ] **Global 75° velocity clamp** (`ball.ts:46-55`): applied on every velocity
  update, not just paddle deflection. Retained as an anti-stuck safeguard that
  coexists with the spec's jitter-based anti-loop (§10.4.3). Revisit only if a
  §20.4 physics-parity oracle flags it; removing it risks horizontal-stall
  regressions.
- [ ] **`R` (Reduce) score coupling**: `vaus.reduceActive` is passed as the
  `doubleScore` argument (`roundState.ts`), coupling "shrink Vaus" with "double
  brick score". Confirm intended vs. naming smell before relying on it.
- [ ] **`M`/`R` capsules not in the drop table** (§12.2/§12.3): handlers exist
  but the randomizer never selects them. Wire into drops or level-data placement
  once M/R semantics are confirmed.
