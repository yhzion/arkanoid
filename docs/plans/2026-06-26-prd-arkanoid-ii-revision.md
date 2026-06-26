# PRD Revision to Arkanoid II — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Realign `prd.md` and directly-conflicting `docs/` files from the original NES Arkanoid (US 35+1 linear) to the implemented Arkanoid II: Revenge of DOH structure (34 slots, L/R branching, bosses at R17 & R34, 9 capsules), and record code-violates-spec items as a backlog rather than blessing them.

**Architecture:** Surgical, section-by-section documentation edits. Content (rounds, capsules, boss count) aligns to the implementation; physics/determinism/defects stay authoritative in the PRD and move to a new backlog file. No code changes this pass.

**Tech Stack:** Markdown docs; Node (`tools/validateLevels.ts`) and ad-hoc `node -e` checks for data/spec consistency; git for frequent commits.

**Reference:** Design doc `docs/plans/2026-06-26-prd-arkanoid-ii-revision-design.md`.

**Working branch:** `docs/revise-prd-arkanoid-ii` (already created; design doc already committed as `cbb34f0`).

---

## Conventions for every task

- Before editing a PRD section, **Read the exact current lines** (line numbers in this plan are from the 2026-06-26 snapshot and may drift as edits shift the file). Match `old_string` precisely.
- After each task, run the verification command and confirm expected output **before** committing.
- One commit per task. Commit message prefix `docs:`.
- Keep PRD section numbering and anchors intact (surgical patch).

---

## Task 1: Create the implementation backlog (Group B)

**Files:**
- Create: `docs/implementation-backlog.md`

**Step 1: Write the backlog file**

Content = the "code violates spec" items from the design doc §3 Group B, each as a checkbox with file:line evidence and the PRD section it violates. Sections: Physics, Capsules, Screen Flow, Determinism/Replay, Audio, Render, Data, Dead Code. Header must state: "These are code defects measured against the PRD (the engineering source of truth). The PRD is intentionally NOT changed to match these."

**Step 2: Verify structure**

Run: `grep -c '^- \[ \]' docs/implementation-backlog.md`
Expected: ≥ 13 (one per backlog item).

**Step 3: Commit**

```bash
git add docs/implementation-backlog.md
git commit -m "docs: add implementation backlog for code-vs-spec gaps"
```

---

## Task 2: Revise §2 Reference Version Decision (A1)

**Files:**
- Modify: `prd.md` §2.1–2.3 (snapshot lines ~29-53)

**Step 1: Read current §2** (`prd.md:27-56`) to capture exact text.

**Step 2: Replace content**

- §2.1 Primary Region → state the target is **Arkanoid II: Revenge of DOH**. Region (US/JP) is **not** a round-count difference; both regions ship the **same 34-slot branching structure** with **independent brick layouts** (`public/data/levels/us/` and `.../jp/`, all files differ by content).
- §2.2 table → replace the "35 vs 32 brick rounds" rows with: both regions = 34 round slots, bosses at R17 and R34, US = Required, JP = Optional/independent dataset.
- §2.3 Source Notes → adjust the "U.S. vs Japanese round-count difference" note to "regional layout differences"; keep other source bullets.

**Step 3: Verify no dangling "Round 35/36" or "35 brick rounds" remain in §2**

Run: `awk 'NR>=27 && NR<=58' prd.md | grep -nE 'Round 3[56]|35 brick|32 brick|Round 33'`
Expected: no matches (empty output).

**Step 4: Commit**

```bash
git add prd.md
git commit -m "docs: reframe PRD reference version as Arkanoid II (§2)"
```

---

## Task 3: Revise §14 Stage Progression (A2, A3)

**Files:**
- Modify: `prd.md` §14.1, §14.2, §14.3, §14.6, §14.7 (snapshot lines ~744-856)

**Step 1: Read current §14** to capture exact text.

**Step 2: Replace stage structure**

- §14.1 (rename to neutral "Stage List / Structure"): replace the US `Rounds 1-35 / Round 36` block with the actual structure:
  ```text
  Round 1:        single stage
  Rounds 2-16:    L/R branching stages (round-NNL.json / round-NNR.json)
  Round 17:       boss stage (mid-game DOH)
  Round 18:       single stage
  Rounds 19-33:   L/R branching stages
  Round 34:       final boss stage (DOH)
  ```
- §14.2 (JP): state JP uses the **same slot structure** with an independent layout dataset under `/data/levels/jp/`; not a separate round count.
- §14.3 Stage Data Source Format: fix the example paths to real ones (`round-01.json`, `round-02L.json`, `round-02R.json`, …, `round-17.json`, …, `round-34.json`). Remove `round-36-boss.json`.
- §14.6 #6: "Boss round appears after Round 35 in U.S. mode" → "Boss stages appear at Round 17 (mid) and Round 34 (final) in both regions."
- §14.7: change continue exception "Round 36 (DOH boss fight)" → "Round 34 (final DOH boss fight)"; review the A+Start level-skip cap (16) note for consistency with the new structure (keep cap 16 unless code says otherwise — leave a `[VERIFY]` marker if unsure).

**Step 3: Verify structure matches data**

Run:
```bash
node -e "const fs=require('fs');const d='public/data/levels/us';const f=fs.readdirSync(d).filter(x=>x.endsWith('.json'));const boss=f.filter(x=>JSON.parse(fs.readFileSync(d+'/'+x)).type==='boss').map(x=>JSON.parse(fs.readFileSync(d+'/'+x)).roundNumber).sort((a,b)=>a-b);const max=Math.max(...f.map(x=>JSON.parse(fs.readFileSync(d+'/'+x)).roundNumber));console.log('boss rounds:',boss,'| max round:',max)"
```
Expected: `boss rounds: [ 17, 34 ] | max round: 34`. Confirm the PRD text now states exactly these.

Run: `awk 'NR>=744 && NR<=860' prd.md | grep -nE 'Round 3[56]|round-36'`
Expected: no matches.

**Step 4: Commit**

```bash
git add prd.md
git commit -m "docs: rewrite stage progression for Arkanoid II structure (§14)"
```

---

## Task 4: Revise §15 Boss DOH (A4)

**Files:**
- Modify: `prd.md` §15.1 (snapshot lines ~862-869), §15.2/§15.3 wording as needed

**Step 1: Read current §15.**

**Step 2: Edit**

- §15.1: DOH appears as **two boss encounters** — a mid-game boss at **Round 17** and the **final boss at Round 34** — each requiring **16 ball hits** via the same mechanism (`boot.ts:294` treats R17 and R34 identically; both data files are `type:boss`, `clearRequiredCount:0`). Keep "When damage reaches 16, boss defeat sequence begins."
- §15.3 Boss Failure Rule: clarify "no continue after final boss (R34) failure"; the mid-boss (R17) failure follows normal life-loss/continue rules.

**Step 3: Verify**

Run: `awk 'NR>=860 && NR<=898' prd.md | grep -nE 'Round 17|Round 34|two boss|16'`
Expected: matches showing both R17 and R34 and the 16-hit rule are present.

**Step 4: Commit**

```bash
git add prd.md
git commit -m "docs: document two DOH boss encounters at R17 and R34 (§15)"
```

---

## Task 5: Revise §12 Capsules — add M/R, fix Break round (A5, A6)

**Files:**
- Modify: `prd.md` §12.2 (type table), §12.3 (randomizer), §12.1.1 (replacement matrix), §12.7 (break round)

**Step 1: Read current §12.1.1, §12.2, §12.3, §12.7.**

**Step 2: Edit §12.2 type table** — append two rows (semantics as observed in `roundState.ts:299-306`, `bricks.ts`, `vaus.ts`):

| Letter | Color | Name | Required behavior |
|---|---|---|---|
| M | (clean-room TBD) | Mega | Energy ball destroys **all** brick types it contacts, **including GOLD** (which is otherwise indestructible). |
| R | (clean-room TBD) | Reduce | Shrinks Vaus to the narrow (16px) width. **[VERIFY]** Implementation also doubles brick score while active (`reduceActive` is passed as the `doubleScore` arg, `roundState.ts:466,515`) — confirm whether this coupling is intended. |

**Step 3: Edit §12.3 randomizer** — note that the roster is now 9 capsules. Either (a) extend the weight table to include M/R with an explicit weight, or (b) explicitly state M/R are **placed via level data, not the random drop table**. Pick (b) unless owner says otherwise, and add a forward-reference: "M/R drop-table wiring is tracked in `docs/implementation-backlog.md` (handlers exist but are unreachable via the current randomizer, `capsules.ts:51-59`)."

**Step 4: Edit §12.1.1 replacement matrix** — add rows for `Mega` and `Reduce` collected-while-active and as new-collected (default: old cancelled, new applied; `restoreNormal()` + flag resets at `roundState.ts:256-261`).

**Step 5: Edit §12.7 Break Rules** — change "the final brick round (U.S. Round 35)" to "the final brick round (**Round 33**)"; state the Break exit does not open on R33 or boss R34, matching `currentRoundNum < 33` (`roundState.ts:282`).

**Step 6: Verify**

Run: `awk 'NR>=600 && NR<=712' prd.md | grep -nE '\| M \||\| R \||Mega|Reduce|Round 33'`
Expected: matches for M, R, Mega, Reduce, and Round 33.

Run: `awk 'NR>=600 && NR<=712' prd.md | grep -nE 'Round 35'`
Expected: no matches.

**Step 7: Commit**

```bash
git add prd.md
git commit -m "docs: add Mega/Reduce capsules and fix Break round number (§12)"
```

---

## Task 6: Revise §17.2 Music Inventory (A8)

**Files:**
- Modify: `prd.md` §17.2 (snapshot lines ~944-957)

**Step 1: Read current §17.2.**

**Step 2: Edit** — reframe as Arkanoid II: Revenge of DOH audio. Unlike the original Arkanoid, II has in-game background music. Do **not** invent specific track names. State: title/attract music, in-game stage BGM, boss BGM, ending, game over, name entry, and short jingles (round start, extend); mark the **exact track list and per-track timing as `[DEFERRED → reference capture]`** since II-edition track naming is not yet verified. Keep §17.3 SFX inventory as-is (it already matches the engine's event set and overlaps the backlog).

**Step 3: Verify**

Run: `awk 'NR>=944 && NR<=958' prd.md | grep -niE 'Arkanoid II|Revenge of DOH|DEFERRED'`
Expected: matches present.

**Step 4: Commit**

```bash
git add prd.md
git commit -m "docs: reframe music inventory for Arkanoid II (§17.2)"
```

---

## Task 7: Revise state machine doc (A7)

**Files:**
- Modify: `docs/design/state_machine.md` (boss condition line ~38, notes ~56-61)

**Step 1: Read current file** (already known: line 38 `ROUND_CLEAR --> BOSS_INTRO : roundNumber == bossRound(region)`).

**Step 2: Edit**

- Line 38: change condition to `roundNumber ∈ {17, 34}` (two boss encounters), e.g. `ROUND_CLEAR --> BOSS_INTRO : roundNumber in {17, 34}`.
- Add a `## 2. Notes` bullet: **L/R branching** — after rounds 2–16 and 19–33, the next round has L/R layout variants (`round-NNL.json` / `round-NNR.json`); document where/how the branch is selected (verify in code: search `branch`/`currentRoundBranch` in `boot.ts`/`gameState.ts`) and add a `[VERIFY]` marker if the selection mechanism is unclear.

**Step 3: Verify**

Run: `grep -nE '17, 34|L/R|branch' docs/design/state_machine.md`
Expected: matches for the boss condition and the L/R note.

**Step 4: Commit**

```bash
git add docs/design/state_machine.md
git commit -m "docs: reflect two boss rounds and L/R branching in state machine"
```

---

## Task 8: Resolve open flags + final consistency sweep

**Files:**
- Read-only checks; possibly Modify `docs/implementation-backlog.md` if new items found.

**Step 1: Verify `jp/` region field**

Run:
```bash
node -e "const fs=require('fs');const d='public/data/levels/jp';const r=new Set(fs.readdirSync(d).filter(x=>x.endsWith('.json')).map(x=>JSON.parse(fs.readFileSync(d+'/'+x)).region));console.log('jp region values:',[...r])"
```
If output is not `[ 'JP' ]` (e.g. shows `US`), add a backlog item "jp level data carries wrong `region` field".

**Step 2: Run the level validator** to confirm no docs edit implied a data change that breaks validation.

Run: `npx tsx tools/validateLevels.ts 2>&1 | tail -5` (or the project's documented validate command; check `package.json`/`tools/` first).
Expected: validation passes (no schema errors).

**Step 3: Global stale-reference sweep across the PRD**

Run: `grep -nE 'Round 3[56]|35 brick rounds|round-36|36 rounds' prd.md`
Expected: no matches (all converted). Investigate and fix any straggler in its proper section.

**Step 4: Cross-reference integrity**

Run: `grep -oE '§3[0-9](\.[0-9])?' prd.md | sort -u` and spot-check that referenced sub-sections (e.g. §33.x physics tables) still exist and weren't renumbered.
Expected: no broken internal references introduced by the edits.

**Step 5: Commit any backlog additions**

```bash
git add docs/implementation-backlog.md
git commit -m "docs: record jp region-field flag in backlog"
```
(Skip if no changes.)

---

## Task 9: Final review and branch wrap-up

**Step 1:** `git log --oneline cbb34f0..HEAD` — confirm one clean commit per task.

**Step 2:** Re-read the full diff of `prd.md`: `git diff main -- prd.md` and sanity-check that only the intended sections changed and the document still reads coherently.

**Step 3:** Use superpowers:finishing-a-development-branch to decide merge/PR/cleanup with the owner.

---

## Out of scope (do NOT do in this plan)

- Any `src/` code change (Group B is documentation-only).
- Removing the dead `game-engine/` tree (logged in backlog).
- Producing audio/sprite assets or exact II-edition track names.
- Full PRD rewrite or renumbering.
