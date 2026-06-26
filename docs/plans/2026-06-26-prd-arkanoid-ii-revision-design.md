# Design: PRD Revision — Align to Arkanoid II: Revenge of DOH

- **Date:** 2026-06-26
- **Branch:** `docs/revise-prd-arkanoid-ii`
- **Author:** Youngho Jeon (with Claude)
- **Status:** Approved, pending implementation plan

## 1. Problem

A spec-vs-code gap analysis across 7 domains (physics, capsules, enemies/boss,
bricks/scoring, screen flow, determinism/persistence/input, audio/render/levels)
revealed that **`prd.md` describes the original NES/Famicom Arkanoid**
(US 35 brick rounds + DOH on Round 36; JP 32 + boss on 33; linear stages),
while **the implementation (`src/` + `public/data/levels/`) is Arkanoid II:
Revenge of DOH** (34 round slots, L/R branching stages, two boss encounters at
R17 and R34, plus `M`/`R` capsule handlers). Commit `610c372
"Implement Arkanoid II Revenge of DOH"` confirms the deliberate shift.

More than half of all reported gaps are downstream of this single mismatch.
Reconciling individual gaps without first realigning the reference document is
wasted work.

## 2. Decision: Revise the PRD to Arkanoid II (not revert the code)

Four governing principles, confirmed with the project owner:

1. **Ground truth = HYBRID.**
   - *Content structure* (round count, L/R branching, capsule roster, boss
     count) → the **implementation / level data** is authoritative; the PRD is
     edited to match.
   - *Physics, determinism, and defects* (ball speed scaling, launch direction,
     replay validation, global angle clamp) → the **PRD / engineering spec
     remains authoritative**; these are recorded as code backlog, the document
     is NOT changed to bless a bug.
2. **Surgical patch, not full rewrite.** Edit only the sections with confirmed
   gaps; preserve PRD skeleton, numbering, and metadata to keep the diff
   reviewable.
3. **Document scope = `prd.md` + directly-conflicting `docs/` files.**
4. **Capsule roster = 9 types.** S/C/L/D/P/E/B plus **M/R formally adopted**
   into the PRD (per owner decision), even though M/R are not yet wired into the
   drop table (that wiring becomes a backlog item).

### Confirmed facts from code/data (the new content ground truth)

- Stage layout: `R1` single → `R2–16` L/R branch → **`R17` boss** → `R18`
  single → `R19–33` L/R branch → **`R34` final DOH boss**
  (`public/data/levels/{us,jp}/`).
- `us/` and `jp/` are **independent datasets** (all 64 files differ by content;
  the earlier "byte-identical copy" claim was wrong — corrected by `diff -rq`).
- R17 and R34 are both `type:boss`, `clearRequiredCount:0`, and share one boss
  mechanism in code (`boot.ts:294`): 16 ball hits, DOH projectile hazards.
- Break gate is `currentRoundNum < 33` (`roundState.ts:282`): final brick round
  = **R33**; Break does not open on R33 or boss R34.
- `M` (Mega) = destroys all bricks including GOLD (`megaActive` → gold
  `forceDestroy`); `R` (Reduce) = shrinks Vaus to 16px **and** doubles brick
  score (`reduceActive` is passed as the `doubleScore` arg at
  `roundState.ts:466,515`). Both have `applyPowerUp` handlers
  (`roundState.ts:299-306`) but are **absent from the drop weight table**
  (`capsules.ts:51-59`) — currently unreachable in play.

## 3. Work Items

### Group A — documents edited this pass (content → implementation alignment)

| ID | Target | Change |
|----|--------|--------|
| A1 | `prd.md` §2.1–2.3 | Reframe reference version as Arkanoid II: Revenge of DOH. US/JP = two independent layout datasets sharing the same slot structure (same round count), not a 35-vs-32 round-count difference. |
| A2 | `prd.md` §14.1–14.3 | Replace linear "1–35 brick / 36 boss" with the actual structure (R1 single, R2–16 L/R, R17 boss, R18 single, R19–33 L/R, R34 final DOH). Fix file-path examples to `round-NN[L\|R].json`, `round-17.json`, `round-34.json`. |
| A3 | `prd.md` §14.6 #6, §14.7 | Boss rounds = R17 & R34; continue disabled on R34 (was Round 36); level-skip cap reviewed. |
| A4 | `prd.md` §15.1 | DOH appears as **two boss encounters** (mid-game R17, final R34), each requiring 16 ball hits via the same mechanism. |
| A5 | `prd.md` §12.7, §12.1.1 | Final brick round = R33; Break exit does not open on R33 or R34. |
| A6 | `prd.md` §12.2, §12.3, §12.1.1 | Add **M** and **R** capsules to the type table, the drop randomizer (define weights), and the replacement matrix. Document M/R semantics as observed in code. |
| A7 | `docs/design/state_machine.md` | `ROUND_CLEAR → BOSS_INTRO` condition = `roundNumber ∈ {17, 34}` (was single `bossRound(region)`); add an L/R branch-selection note. |
| A8 | `prd.md` §17.2 | Replace music inventory table with the Arkanoid II track list (table-only surgical update). |

### Group B — documents UNCHANGED; recorded as code backlog

New file `docs/implementation-backlog.md` collects the "code violates the spec"
items so the PRD stays the engineering target:

- Ball speed scaling absent (§10.2: ceiling +0.25, +0.05/10 bricks, cap 5.0, slow 1.5).
- Launch-direction boundary bug (`ball.ts:97` uses `>=` → launches left at center).
- Replay layer: no JSON validation, no `configHash`/`formatVersion` check, sparse-tolerant playback, schema drift (`pointerX*` vs `paddleX`).
- Global 75° velocity clamp applied beyond paddle deflection (`ball.ts:46-55`).
- Capsule "one active at a time" not enforced; power-ups not reset on ball/life loss.
- STAGE CLEAR (`ROUND_CLEAR`) transition is dead; normal clear routes through break-warp.
- `GAMEPLAY_DEMO` renders a black screen (missing from render list + overlay switch).
- Integer scaling (`renderScaleMode:'integer'`) config never consumed.
- SFX coverage ~11/28; several events unsubscribed; wall/catch SFX masquerade as `BRICK_HIT`.
- **M/R capsules unreachable** — handlers exist but not in drop weight table.
- `doubleScore` arg fed by `vaus.reduceActive` — confirm intended vs naming smell.
- 2-player score routing unimplemented (`gameState.ts` single live score).
- Dead code: entire `game-engine/` tree is not in the build (index.html loads `/src/main.ts`).

## 4. Open Flags (resolve during implementation)

- **R capsule semantics**: code couples "shrink Vaus" with "double brick score".
  Spec it as observed, but flag in §12.2 that the double-score coupling is an
  implementation observation requiring design confirmation.
- **`jp/` region field**: verify whether jp level files carry `region:"JP"`
  (us files hardcode `"US"`); if not, note as a data-correctness backlog item.

## 5. Out of Scope

- No code changes in this pass (Group B is documentation of the backlog only).
- No full PRD rewrite; no audio/sprite asset production; no `game-engine/`
  removal (logged as backlog).

## 6. Deliverables

1. Revised `prd.md` (§2, §12, §14, §15, §17).
2. Revised `docs/design/state_machine.md`.
3. New `docs/implementation-backlog.md`.
4. This design doc.
