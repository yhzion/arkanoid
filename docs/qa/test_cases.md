# QA Test Cases

*Reference: `prd.md` Section 20 (QA and Acceptance Criteria) & 34 (Acceptance Tolerances). All eight acceptance categories (§20.1–§20.8) are represented as structure below.*

This document defines the test case structure (skeletons/interfaces) for automated (Playwright/Jest) and manual testing. Cases are written in Given/When/Then (BDD) phrasing per §20. Exact numeric values are deferred to `prd.md`.

## 1. Core Simulation Tests (Unit Tests)

```text
Scenario: Ball deflection matches the golden output
  Given a recorded launch offset and deflection model
  When the deterministic sim computes the outgoing ball angle
  Then the output is byte-identical to the golden replay (no degree tolerance; §34.1, §34.2)

Scenario: Multiple life thresholds crossed in one tick
  Given a score increment that crosses N extra-life thresholds in a single tick
  When the tick is processed
  Then exactly N lives are awarded
```

## 2. State Transition Tests (Integration)

```text
Scenario: Round clear on last clearable brick
  Given a round with one clearable brick remaining
  When that brick is destroyed
  Then the game transitions to ROUND_CLEAR

Scenario: Break warp advances the round
  Given a brick round whose break exit has opened
  When the Vaus enters the break exit
  Then the next round begins and 10,000 points are awarded (§20.1.8)

Scenario: No break exit on the final brick round
  Given Round 33 (the final brick round)
  Then the break exit does not open; the round must be cleared normally to reach the boss (§8.10 / §12.7)
```

## 3. UI/Visual Tests (E2E)

```text
Scenario: Integer scaling and aspect ratio
  Given varying viewport sizes
  When the canvas renders
  Then integer scaling and the canvas aspect ratio are preserved

Scenario: HUD sync
  Given a SCORE_CHANGED event
  When the HUD updates
  Then it reflects the new value synchronously
```

## 4. Determinism / Golden-Replay Tests (§20.6 / §34.1)

```text
Scenario: Golden-replay corpus reproduces byte-identical state
  Given a golden-replay corpus of N seeds x representative rounds
  When each replay runs on every browser in the §5.1 matrix
  Then the final state is byte-identical AND configHash matches on every browser
       (per §34.1: "exactly reproduces", not merely "stable")
```

## 5. Mechanism Acceptance Tests (§20.7 / §34.2)

Exact-output (byte-identical) assertions — no tolerances:

```text
Scenario: Ball-speed curve
  Given a sequence of N hits
  When the speed curve is evaluated
  Then the speed matches the exact expected value after N hits

Scenario: Launch vectors
  Given a launch event
  When the ball launches
  Then the launch vector exactly matches the expected vector

Scenario: Deflection per offset (both models)
  Given a paddle-hit offset for each deflection model
  When the outgoing angle is computed
  Then it exactly matches the expected deflection, including the 10 degree clamp

Scenario: Capsule distribution
  Given a seeded run
  When capsules are spawned
  Then the distribution exactly matches the expected seeded sequence

Scenario: Boss encounter
  Given a boss round
  When the boss is hit
  Then it registers once per valid hit, applies the exact scoring, and offers no continue

Scenario: Name entry
  Given a high-score name-entry flow
  When localStorage is available, and separately when it is blocked
  Then entry succeeds, with the documented fallback when localStorage is blocked

Scenario: Cheat sequences
  Given each of the two cheat input sequences
  When the sequence is entered
  Then the corresponding cheat activates
```

> 2P state isolation/handoff is `[DEFERRED → M3]` per §34.2.

## 6. Browser-Matrix E2E (§20.5)

```text
Scenario Outline: Baseline acceptance across required browsers
  Given <browser> from the §5.1 required matrix
  When the game loads and is played
  Then game starts, input works (keyboard / gamepad incl. remap / touch / pointer),
       audio unlock works, frame pacing is stable, fullscreen works where allowed,
       local high score persists, and unsupported features degrade gracefully (no-op)

Examples:
  | browser        |
  | Chrome desktop |
  | Safari desktop |
  | Firefox desktop|
  | Edge desktop   |
  | iOS Safari     |
  | Android Chrome |
```

## 7. Audio Parity (§20.3)

Applies when the licensed asset package is in place: correct cue per flow, SFX within the 50 ms latency budget, voice-priority channel allocation, mute, and graceful browser audio unlock.

## 8. Accessibility Acceptance (§20.8 / §34.3)

Release-blocking, measurable: 44 px touch-target check; keyboard-only title→ending completion; WCAG 2.3.1 flash-rate limit (≤ 3 flashes/s); color-blind glyph-presence check.

*Note: For exact criteria and expected values, rely solely on `prd.md`.*
