# PRD: Arkanoid II — Revenge of DOH, Reference-Accurate Web Version

**Document version:** 1.0  
**Date:** 2026-06-25  
**Language:** English  
**Primary reference target:** *Arkanoid* for Nintendo Entertainment System, U.S. release by Taito America, 1987.  
**Product type:** Playable browser game, built as a faithful reference implementation of the NES version where rights allow.

---

## 1. Executive Summary

Build a playable web version of *Arkanoid II: Revenge of DOH* that recreates its NES-era game flow, control model, brick behavior, score rules, capsule power-ups, life system, enemy behavior, branching stage progression, boss battles, title flow, and ending flow as closely as possible.

The product has two operating modes:

1. **Licensed Fidelity Mode**  
   Uses authorized original or faithfully reproduced assets: title screen, ending screen, stage brick layouts, BGM, SFX, sprites, names, story text, and any other protected expression.

2. **Clean-Room Homage Mode**  
   Used when rights are not secured. Keeps the same type of mechanics and UX structure but replaces protected assets, exact level layouts, title/ending text, music, sounds, sprites, and branding with original work.

This PRD assumes the desired target is **Licensed Fidelity Mode**, because the requested scope includes exact stage layouts, original-style title/ending screens, BGM/SFX parity, and original game elements. Public release should not proceed with original copyrighted content unless the required rights are secured.

---

## 2. Reference Version Decision

### 2.1 Primary Reference

The product targets **Arkanoid II: Revenge of DOH** as the canonical game
structure for gameplay implementation. This is the structure realized in the
engine and the level data under `public/data/levels/`.

Region (US/JP) is **not** a round-count difference. Both regions ship the
**same 34-slot branching structure** with **independent brick layouts** — the
two datasets (`public/data/levels/us/` and `.../jp/`) differ by per-round layout
content, not by how many rounds or where the bosses are.

Stage structure (both regions):

- Round 1: single stage.
- Rounds 2–16: L/R branching stages (`round-NNL.json` / `round-NNR.json`).
- **Round 17: boss stage (mid-game DOH).**
- Round 18: single stage.
- Rounds 19–33: L/R branching stages.
- **Round 34: final boss stage (DOH).**

See [Section 14](#14-stage-progression) for the full stage list and data format.

### 2.2 Supported Region Modes

| Mode | Round slots | Boss rounds | Priority |
|---|---:|---|---|
| U.S. | 34 | 17, 34 | Required |
| Japanese | 34 | 17, 34 | Optional (independent layout dataset) |

Both modes use the identical slot/branch/boss structure; only the per-round
brick layouts differ.

### 2.3 Source Notes

- Arkanoid II: Revenge of DOH manual/reference: rules, scoring, controls, capsule descriptions, enemies, and story framing.
- Regional reference data: per-region stage layout differences (same structure, different layouts).
- Reference maps: visual stage layout references.
- StrategyWiki: gameplay and boss behavior reference.
- VGMPF/VGMRips/Zophar/Sounds Resource: audio track/SFX inventory references.
- Data Crystal ROM map: structure-level validation that the NES ROM stores per-level brick/capsule/hit metadata.

See [Section 21](#21-references) for full references.

---

## 3. Product Goals

### 3.1 Primary Goals

1. Deliver a browser-playable version of NES *Arkanoid* that feels like the NES release.
2. Preserve the original-style game loop: title flow, player select, round start, gameplay, death, game over, stage clear, warp, boss, ending, and restart.
3. Implement the same power-up/capsule set and broad behavior.
4. Implement the same brick scoring and brick types.
5. Implement round progression: 34 round slots with DOH bosses at Round 17 and Round 34 (§14).
6. Support keyboard, gamepad, mouse/pointer, and optional paddle-like analog controls.
7. Use deterministic fixed-step gameplay so parity testing and replay validation are possible.
8. Provide an asset/data pipeline that can load licensed original-equivalent stage maps, sprites, title/ending screens, BGM, and SFX.
9. (Conditional / clean-room) Implement 2-player mode **only if** the NES U.S. release supports it; otherwise treat 2-player as an original clean-room addition rather than a fidelity requirement (see §8.3 and §10.6).

### 3.2 Non-Goals

1. Do not ship ROM files, extracted assets, ripped music, or ripped SFX unless legally licensed.
2. Do not provide emulator functionality.
3. Do not support unrelated Arkanoid versions as the primary target, such as arcade, Commodore 64, MSX, mobile, or later sequels.
4. Do not intentionally modernize the mechanics in the default fidelity mode.
5. Do not add new power-ups, stages, enemies, or story content to the fidelity mode.

---

## 4. Legal and Rights Requirements

### 4.1 Rights-Cleared Assets

The following require rights clearance or original clean-room substitutes:

- Game title and branding.
- Story text and ending text.
- Exact title screen layout and art.
- Exact ending screen layout and art.
- Original sprites and tile art.
- Original stage layouts if copied exactly.
- Original BGM and SFX.
- Character/enemy names and distinctive presentation.
- Any official manual art or screenshots.

### 4.2 Implementation Rule

The game engine must support licensed assets, but the repository should separate protected source data from the engine:

```text
/game-engine
/game-data-licensed        # excluded from public repo unless rights are secured
/game-data-clean-room      # safe fallback assets and levels
/tools
/docs
```

### 4.3 Public Release Gate

Before public release, confirm one of the following:

- Written license/permission exists for original-equivalent assets and data.
- The shipped build uses only clean-room assets, clean-room level layouts, and non-infringing names/text/audio.
- A CI gate MUST fail any public/clean-room build that references anything under `/game-data-licensed`, via a per-asset licensed/clean-room manifest tied to `GameConfig.mode` (gate implementation `[DEFERRED → M6]`).

---

## 5. Target Platforms

### 5.1 Required Browsers

- Latest Chrome desktop.
- Latest Edge desktop.
- Latest Safari desktop.
- Latest Firefox desktop.
- Latest Chrome Android.
- Latest Safari iOS.

### 5.2 Input Devices

Required:

- Keyboard.
- Gamepad via the browser Gamepad API.
- Mouse/pointer drag.
- Touch drag for mobile.

Optional:

- USB spinner/paddle controller mapped as a gamepad axis.
- WebHID/WebUSB experimental controller support, behind a feature flag.

---

## 6. Display and Rendering Requirements

### 6.1 Logical Resolution

Use a fixed logical NES-style canvas. Recommended logical resolution:

```text
256 x 240 logical pixels
```

Rendering must support integer scaling where possible:

```text
1x = 256 x 240
2x = 512 x 480
3x = 768 x 720
4x = 1024 x 960
```

On non-integer browser sizes, preserve aspect ratio and use letterboxing/pillarboxing.

### 6.2 Playfield Geometry

The NESMaps-derived level reference describes each mapped level area as:

- Level area: **192 px wide x 232 px high**.
- Wall/edge thickness: **8 px**.
- Brick tile: **16 px wide x 8 px high**.
- Brick grid capacity: **11 columns x 28 rows**.

Implementation should use these values as the base grid model for brick placement. The 11-column grid derives from the 176 px usable width (192 − 2×8 wall inset); the 28 rows are 8 px each within the 224 px below an 8 px top inset (224 + 8 = 232). The grid origin (cell 0,0 top-left) is at logical pixel (left wall + 8, top inset + 8). The 192 px-wide playfield leaves a 64 px-wide region (256 − 192) of the logical canvas reserved for the HUD (score, lives, round indicators); its concrete pixel-art layout is `[DEFERRED → M5]`.

### 6.3 Pixel Fidelity

Fidelity mode must provide:

- Pixelated scaling with no smoothing.
- Sprite-aligned drawing on integer coordinates whenever possible.
- Reference palette support.
- Concrete palette hex/PPU values `[DEFERRED → M5]`.
- Optional CRT filter only as a user setting; disabled by default.
- UI Requirement: Settings like CRT filters, volume controls, and accessibility toggles should reside in a modern web wrapper panel outside the strict 256x240 retro canvas.

---

## 7. Core Game Loop

### 7.1 Standard Loop

1. App loads.
2. Title screen appears.
3. Player selects 1-player or 2-player mode.
4. Game starts with opening/round-start flow.
5. Current round loads.
6. Ball is launched.
7. Player clears all required destructible bricks or uses Break warp.
8. Stage clear transition plays.
9. Next round loads.
10. Player loses a Vaus when all active balls are lost or the Vaus is destroyed by boss projectile.
11. Game over occurs when the active player has no remaining lives.
12. Final boss appears after the last brick round.
13. Defeating DOH triggers the ending sequence.
14. Game returns to title/start flow after ending or game over.

### 7.2 Frame Step

Use a fixed simulation timestep:

```text
60 simulation ticks per second
```

Rendering may interpolate visually, but game simulation, collision, RNG, scoring, and replay logs must use deterministic ticks.

---

## 8. Screen Flow Requirements

### 8.1 Title Screen

To satisfy modern browser auto-play policies, the application must display a "Click to Start" or "Insert Coin" overlay before initializing the audio engine and showing the title screen.

Fidelity mode should match the NES title screen structure as closely as licensing allows:

- Arkanoid title/logo area.
- Taito copyright/publisher presentation.
- 1-player / 2-player selection.
- Start input.
- Select input changes player count.
- Idle/demo/story flow is defined in §8.2 and the §31 transition table (entered via a `storyExit` branch).

Clean-room mode must use original title art and branding.

### 8.2 Opening / Story Presentation

The opening/story sequence displays scrolling text detailing the Vaus's origin if the game is left idle on the title screen or when starting a new game:

- **Licensed Fidelity Mode Text:**
  > "After the mothership 'Arkanoid' was destroyed, a spacecraft 'Vaus' scrambled away from it. But only to be trapped in space, warped by someone..."
- **Clean-Room Homage Mode Text:**
  > "After the mother flagship was destroyed in a cosmic ambush, the escape pod 'Vaus' launched into the void. However, it was instantly ensnared in a localized space-time anomaly, warped by an unknown entity..."
- **Idle Screen Flow:**
  * If left idle on the Title Screen for **600 simulation ticks** (10 seconds at 60 FPS), the screen transitions to the Opening Story.
  * If idle on the Opening Story for another 10 seconds, it transitions to a Gameplay Demo showing the ball and Vaus playing automatically for 10 seconds, before looping back to the Title Screen.
  * The Opening Story is entered from two contexts — idle and new-game — distinguished by a `storyExit` flag selecting the exit path (idle → Gameplay Demo; new-game → Round Intro), per §31.

Localization/i18n and telemetry/analytics are **out of scope** (English-only; Japanese mode keeps English text).


### 8.3 Player Select

Controls:

- `Select` cycles between 1-player and 2-player modes.
- `Start` begins the selected mode.

### 8.4 Round Start Screen

Each round should show a round-introduction state before gameplay begins.

Required behavior:

- Reset Vaus position.
- Reset ball state.
- Reset transient power-up effects.
- Initialize enemy spawner for the round.
- Load per-round brick/capsule data.
- Play round-start jingle if audio is enabled.

### 8.5 Pause

Required behavior:

- `Start` pauses and unpauses during gameplay.
- Simulation stops while paused.
- Audio ducks while paused `[PROVISIONAL]`. Resume returns to `pausedFrom` (§31).

### 8.6 Death / Life-Lost Flow

When the active ball state reaches failure:

1. Vaus death/explosion sequence plays.
2. Life count decreases.
3. If lives remain, the same round restarts from its **beginning state** (single-player). In 2-player mode the incoming player's saved board snapshot is restored instead (§10.6, `[DEFERRED → M3]`).
4. If no lives remain, the game over flow starts.

### 8.7 Game Over Screen

Required behavior:

- Show game over presentation.
- Play game-over jingle/SFX.
- Stop normal gameplay.
- Return to TITLE, or to NAME_ENTRY if the final score qualifies for the leaderboard (§31).

### 8.8 High Score / Name Entry

The game features a local High Score leaderboard holding the top 5 scores.

- **Leaderboard Entrance:** If a player's final score at Game Over is higher than the 5th place score, they enter the Name Entry screen.
- **Initials Input:** Players can enter up to **3 characters** for their initials.
- **Controls:** While maintaining the retro visual aesthetic, intercept actual keyboard keystrokes (`A-Z`) so desktop players can type their initials instantly. For mobile users, tapping the input area should invoke the native mobile keyboard.
- **Persistence:** Leaderboard data is saved to and loaded from browser local storage (`localStorage`). If `localStorage` is unavailable (e.g., incognito mode or blocked third-party data), the game must use a graceful fallback that retains the leaderboard in memory for the current session without throwing an error. A developer/debug button must be provided in the settings panel to reset leaderboard data. Storage uses a **versioned schema**: a leaderboard key `{schemaVersion, entries:[{score,initials,round,region,mode,date}]}` and a settings key holding GameConfig + control remaps (serialized as `KeyboardEvent.code` plus gamepad standard-mapping index). Stored data is validated/clamped on load; on `schemaVersion` mismatch the store is migrated or rejected.


### 8.9 Stage Clear Transition

After all clearable bricks are destroyed:

- Play stage-clear transition/jingle according to the reference.
- Advance to the next round.
- Preserve score and remaining lives.
- Reset active power-up effects on round clear `[PROVISIONAL]`.

### 8.10 Break Warp Transition

When the Break capsule is active:

- A warp/exit opens on the right/lower-right side of the playfield.
- If the Vaus enters the exit, award **10,000 points**.
- Advance to the next round.
- Reset active power-up effects on the next round.
- Exception: on the final brick round (Round 33) the break exit does **not** open; the round must be cleared normally to reach the boss (§12.7, canonical).

### 8.11 Final Boss Screen

After the final brick round in the selected region mode:

- Load the DOH fortress/boss round.
- No brick-clear objective is used.
- Player must hit DOH with the energy ball 16 times.
- DOH fires projectiles.
- Projectile collision with Vaus destroys Vaus.
- No continue should be available after losing all lives on the final boss, according to reference sources.

### 8.12 Ending Screen

Defeating DOH triggers the victory scroll:

- **Licensed Fidelity Mode Text:**
  > "Fort Doh has been demolished and time is flowing reversly. Vaus has escaped from the distorted space but the real voyage of 'Arkanoid' in the galaxy has only started......"
- **Clean-Room Homage Mode Text:**
  > "The dimensional fortress has collapsed and space-time has stabilized. The Vaus escapes the warp, but its cosmic odyssey in the galaxy has only begun..."
- After text scrolling finishes, show credit sequence and a "THE END" screen, then return to the Title screen.


---

## 9. Controls

### 9.1 NES Reference Controls

The NES manual describes two controller options:

1. **Arkanoid dedicated controller** connected to controller port 2.
2. **Standard NES controller**.

Reference controls:

| NES control | Behavior |
|---|---|
| Select | Choose 1-player or 2-player mode on title/player-select screen. |
| Start | Start game; pause/unpause during gameplay. |
| Dedicated controller knob | Move Vaus left/right. |
| Dedicated controller fire button | Fire laser; release caught ball. |
| Standard D-pad left/right | Move Vaus left/right. |
| Standard A button | Fire laser; release caught ball. |

### 9.2 Web Keyboard Mapping

Required default mapping:

| Action | Primary key | Alternate key |
|---|---|---|
| Move left | ArrowLeft | A |
| Move right | ArrowRight | D |
| Fire / release catch | Space | Z / J |
| Start / pause | Enter | P |
| Select player count | Shift | Tab |
| Mute | M | - |
| Fullscreen | F | - |

### 9.3 Mouse / Pointer Mapping

Mouse/pointer mode should emulate the analog feel of the Vaus controller:

- Horizontal pointer movement maps to Vaus position.
- Clamp Vaus inside playable bounds.
- Pointer click performs Fire / Release.
- Pointer movement should not teleport Vaus in fidelity mode unless analog mode is explicitly set to absolute pointer control.
- **Mobile Touch Controls:** For touch devices, implement an optional On-Screen Controller (OSC) overlay. Provide a dedicated semi-transparent "Fire" button zone on the lower right, and a "Drag to Move" zone on the lower left. Use the `navigator.vibrate` API to provide haptic feedback for firing and collisions to improve tactile feel.

Recommended pointer control modes:

| Mode | Behavior |
|---|---|
| Relative paddle mode | Pointer delta moves Vaus, closer to knob/spinner behavior. Default for fidelity. |
| Absolute drag mode | Vaus follows pointer X. Useful for mobile/accessibility. |

### 9.4 Gamepad Mapping

Required:

| Gamepad input | Behavior |
|---|---|
| Left stick X / D-pad | Move Vaus. |
| South face button | Fire / release catch. |
| Start/Menu | Start / pause. |
| Select/View | Select player count. |

Optional:

- Right stick X or analog trigger axis can be mapped to paddle movement.
- Sensitivity calibration for spinner-like devices.

### 9.5 Remapping

Users must be able to remap:

- Move left/right.
- Fire/release.
- Start/pause.
- Select.
- Mute.

---

## 10. Gameplay Rules

### 10.1 Player Object: Vaus

The player controls the Vaus spacecraft at the bottom of the playfield.

Required behavior:

- Vaus moves horizontally only.
- Vaus cannot pass through side boundaries.
- Vaus launches/deflects the energy ball.
- Vaus can collect falling capsules.
- Vaus can fire lasers when Laser is active.
- Vaus can catch and release the ball when Catch is active.
- Vaus can enter the Break warp exit when Break is active.
- Enlarged Vaus uses a wider collision surface.

### 10.2 Energy Ball

Required behavior:

- Ball bounces off Vaus, side walls, top wall, bricks, enemies, and boss.
- Ball is lost when it exits the bottom of the playfield and no other active ball remains.
- Ball collision with Vaus uses the deflection model described in Section 10.4.
- Multi-ball state is supported by Disruption.
- **Ball Speed Scaling:** The ball starts at a base speed of **2.0 pixels per tick**. The speed increases by a step of **0.25 pixels per tick** upon the first ceiling hit of the round, and by **0.05 pixels per tick** for every 10 accumulated hits on bricks (both destructible and indestructible gold bricks count). The speed is capped at a maximum of **5.0 pixels per tick**. Speed resets to the base speed of 2.0 when a life is lost. The "S" (Slow) power-up instead sets speed to 1.5 px/tick (§33.1). Counter reset, multi-ball sharing, and cap ordering follow §30 (D13/D14).

### 10.3 Ball Launch

At round start and after life loss:

- Ball begins in a held/ready state sitting on top of the Vaus (moving horizontally along with the Vaus).
- Pressing the Fire/release input launches the ball.
- **Launch Direction & Speed:** The ball is launched at a speed of **2.0 pixels per tick** at an angle of $60^\circ$ relative to the horizontal (i.e., $30^\circ$ left or right from the vertical axis). The direction (left or right) is determined by the horizontal position of the Vaus: if the Vaus is in the left half of the screen, the ball launches to the right ($60^\circ$ angle); if it is in the right half of the screen, the ball launches to the left ($120^\circ$ angle). The dividing X is the playfield center, center-inclusive → launch right (§33.1); launch angles are table-driven (§30.3).


### 10.4 Paddle Deflection Model

Implement a configurable deflection model to allow tuning between a continuous mathematical model and the NES-accurate discrete 8-zone model:

1. **Continuous Deflection Model (Default):**
   * Calculate the normalized offset of the ball's hit point relative to the paddle center:
     $$\text{scalingFactor} = \frac{\text{Ball}_x - \text{Vaus}_{\text{center}_x}}{\frac{\text{Vaus}_{\text{width}}}{2}}$$
     This yields a value in the range $[-1.0, 1.0]$. Clamp scalingFactor to $[-1.0, 1.0]$ before multiplying by maxDeflectionAngle (§33.1).
   * Calculate the reflection angle:
     $$\theta = \text{scalingFactor} \times \text{maxDeflectionAngle}$$
     where $\text{maxDeflectionAngle} = 75^\circ$ to prevent the ball from bouncing too close to horizontal.
   * Compute the new velocity components:
     $$v_x = \sin\theta \times \text{speed}$$
     $$v_y = -\cos\theta \times \text{speed}$$

2. **NES Discrete 8-Zone Model (Fidelity Option):**
   * Divide the Vaus into 8 equal horizontal bands.
   * Map each band to a discrete deflection angle class:
     * Zones 1 & 8 (outer edges): $\pm 75^\circ$
     * Zones 2 & 7 (outer mid): $\pm 55^\circ$
     * Zones 3 & 6 (inner mid): $\pm 35^\circ$
     * Zones 4 & 5 (center): $\pm 15^\circ$
   * Re-normalize velocity to preserve the current speed.

3. **Vertical Loop Prevention & Angle Jitter:**
   * **Minimum Deflection Angle:** Under the Continuous Deflection Model, to prevent the ball from bouncing straight up and down in a repetitive vertical loop, enforce a minimum reflection angle of $\pm 10^\circ$ relative to the vertical axis. If $|\theta| < 10^\circ$, clamp it to $\pm 10^\circ$ (preserving the sign of the horizontal direction).
   * **Angle Jitter (Alternative Loop Breaking):** For wall and brick bounces, apply a micro-jitter of $\pm 1^\circ$ to the reflection vector when `jitterEnabled` is set (a GameConfig/replay-header field, §30.7) and a loop is detected (ball bounce count on vertical walls exceeds 3 without paddle interaction). The jitter sign is drawn from the seeded PRNG (§30.4); the per-ball loop counter resets on paddle contact. The deflection model (`deflectionModel`: continuous|discrete8) is likewise a GameConfig/replay-header field (§30.7), and all outgoing angles are table-driven (§30.3).


### 10.5 Lives

Required behavior:

- **Starting Lives:** Player starts with **3 lives** by default.
- Losing all active balls costs one Vaus.
- Boss projectile collision costs one Vaus.
- The gray `P` capsule awards one extra Vaus.
- **Score-Based Extra Lives:** 
  * The first extra life is awarded at **20,000 points**.
  * Subsequent extra lives are awarded every **60,000 points** thereafter (e.g., 80,000, 140,000, 200,000, etc.) indefinitely. Awards trigger on **crossing** (newScore ≥ threshold ∧ prevScore < threshold); a single scoring event crossing multiple thresholds awards multiple lives (intra-tick order: §32).
- Lives are displayed in the HUD using miniature Vaus sprites.


### 10.6 Two-Player Mode

Required behavior:

- Support 2-player mode selected from the title screen.
- **Turn Alternation:** Players alternate turns. Player 1 plays until they lose a Vaus. The screen then transitions to a "PLAYER 2" round start screen, restoring Player 2's board state (their current round, remaining bricks, score, and lives). Player 2 plays until they lose a Vaus, switching back to Player 1 if Player 1 still has lives.
- **Independent State:** Each player has an independent score, round number, brick layout configuration, and remaining lives.
- **Game Over & Continues:** If Player 1 runs out of lives, their game ends ("GAME OVER" displays for them), and Player 2 continues playing their turn sequentially without further alternation until they also run out of lives. If either player inputs the title screen continue cheat (A+B and Select 5 times), they can resume their respective progress.

Full two-player state machine (TURN_HANDOFF, per-player context) `[DEFERRED → M3]`; this section's detailed 2P rules are `[PROVISIONAL]` pending §3.1.9 confirmation.


---

## 11. Bricks / Walls

### 11.1 Brick Grid

Use an 11 x 28 grid for brick placement.

```ts
type BrickCell = {
  col: number;       // 0-10
  row: number;       // 0-27
  type: BrickType;
  hitsRemaining: number;
  capsule?: CapsuleType;
  clearRequired: boolean;
};
```

### 11.2 Brick Types

| Brick type | Behavior |
|---|---|
| Empty | No collision. |
| Colored brick | Destroyed by ball or laser. Counts toward clear condition. |
| Silver brick | Multi-hit hard brick. Counts toward clear condition. |
| Gold brick | Indestructible. Does not count toward clear condition. |

### 11.3 Colored Brick Scores

The NES manual provides the following score values:

| Color | Points |
|---|---:|
| White | 50 |
| Orange | 60 |
| Light blue | 70 |
| Green | 80 |
| Red | 90 |
| Blue | 100 |
| Pink | 110 |
| Yellow | 120 |

### 11.4 Silver Brick Scoring

Silver brick score:

```text
50 x current round number
```

Silver bricks require multiple hits. The manual says silver bricks start at 2 hits and require an additional hit every 8 rounds.

Implementation formula:

```ts
silverHits(round: number): number {
  return 2 + Math.floor((round - 1) / 8);
}
```

However, licensed stage data may override this per cell if ROM/reference capture shows exceptions. The schema's per-cell `hitsRemaining` is authoritative; the `silverHits` formula is a data **generator**, not a runtime rule (§14.4).

### 11.5 Gold Brick Behavior

Gold bricks:

- Cannot be destroyed by the ball.
- Cannot be destroyed by laser (laser disintegrates on gold) `[PROVISIONAL]`.
- Bounce the ball normally.
- Do not count toward stage clear.

---

## 12. Capsule / Power-Up System

### 12.1 General Rules

Required behavior:

- Capsules may appear after destroying certain bricks.
- Capsules fall downward.
- Vaus collects capsules by contact.
- Each collected capsule gives **100 points**.
- Only one falling capsule should be active at a time `[PROVISIONAL]`.
- Active power-up effects normally last until a different power-up is collected or a ball/life is lost.
- Collecting a new power-up replaces the previous active effect where applicable.
- **P Capsule Exception:** The `P` (Player/Extra Life) capsule effect is processed immediately (increments the life counter, plays the extra-life SFX) and **does not** cancel or replace the currently active Vaus power-up.
- Capsule fall kinematics (fall speed, spawn position, bottom despawn) are defined in §33.3.

#### 12.1.1 Capsule Replacement / Priority Matrix (provisional)

Until reference capture confirms exact stacking/replacement behavior, use the following
provisional rules and revisit against §22:

| Current effect | New capsule collected | Provisional result |
|---|---|---|
| Slow | any of {C,L,D,E,B} | Old cancelled, new applied. |
| Catch | Disruption (D) | **New ball(s) launch immediately; Catch stays active on the split balls.** (Open verification.) |
| Catch | any of {S,L,E,B} | Catch cancelled, new applied. |
| Laser | any of {S,C,D,E,B} | Laser cancelled, new applied. |
| Enlarge | any of {S,C,L,D,B} | Enlarge cancelled, new applied. |
| Player (P) | any | P effect is immediate (extra life); existing effect is preserved. |
| Break (B) | any | Break exit logic is one-shot; new capsule applies normally. |
| Mega (M) | any of {S,C,L,D,E,B,R} | Mega cancelled, new applied. |
| Reduce (R) | any of {S,C,L,D,E,B,M} | Reduce cancelled, new applied. |


### 12.2 Capsule Types

| Letter | Manual color description | Name | Required behavior |
|---|---|---|---|
| S | Orange | Slow | Slows the energy ball. |
| C | Yellow | Catch | Ball sticks to Vaus; Fire releases it. Auto-release after 360 ticks (§33.3). |
| L | Red | Laser | Vaus can fire twin lasers. Lasers destroy standard bricks and affect enemies. |
| D | Light blue | Disruption | Splits the energy ball into three balls. Losing one or two balls does not cost a life while another ball remains. |
| P | Gray | Player | Awards one extra Vaus. |
| E | Blue | Enlarge | Extends the width of Vaus. |
| B | Pink | Break | Opens a warp/exit on the right/lower-right; entering awards 10,000 points and advances to the next round. |
| M | (clean-room TBD) | Mega | The energy ball destroys **all** brick types it contacts, **including GOLD** (otherwise indestructible). Implementation-specific extension. |
| R | (clean-room TBD) | Reduce | Shrinks Vaus to the narrow (16px) width. **[VERIFY]** The implementation also doubles brick score while active (`reduceActive` is passed as the `doubleScore` argument); confirm whether this score coupling is intended. |

Notes:
- `M` and `R` are implementation-specific extensions not present in the original Arkanoid II capsule set; their clean-room colors/names are TBD.
- `M`/`R` are currently placed via level data, **not** the random drop table (§12.3). Wiring them into the randomizer is tracked in `docs/implementation-backlog.md` (handlers exist but are unreachable via the current randomizer).

### 12.3 Capsule Drop Trigger & Selection

The capsule dropping system operates as follows:

1. **Drop Trigger (Brick Data):**
   * Level grid definitions encode whether a brick is a capsule carrier.
   * Level data marks carrier bricks via an explicit `isCapsuleCarrier` field (§14.4).
   * When this specific brick is destroyed, a capsule is guaranteed to drop.
   * Silver and Gold bricks never drop capsules.

2. **Capsule Type Randomizer:**
   * When a drop is triggered, the game selects the capsule type from the seeded mulberry32 stream (§30.4).
   * **Probabilities:** Standard power-ups (`S`, `C`, `L`, `D`, `E`) are twice as likely to spawn as high-value power-ups (`P`, `B`).
     * Standard probability weight: `2` each.
     * Special probability weight: `1` each.
   * **Duplicate Prevention:** If the chosen capsule type is identical to the *previous* capsule that dropped on the current level, it is replaced with a `D` (Disruption) capsule. This ensures `D` is the only capsule type that can spawn back-to-back.
   * **Roster note:** The randomizer covers the 7 droppable capsules (`S`, `C`, `L`, `D`, `E`, `P`, `B`). The `M`/`R` extensions are level-data placed and not part of this random selection (§12.2).


### 12.4 Multi-Ball Rules

Required behavior:

- `D` (Disruption) splits the current active ball into three balls.
- **Split Trajectories:** The middle ball inherits the original ball's velocity vector. The other two split off at $+15^\circ$ and $-15^\circ$ angles relative to the original vector, preserving the current speed.
- Losing one or two balls does not cost a life if at least one ball remains.
- A life is lost only when all active balls are gone.
- **Capsule Restriction:** Power-up capsules **do not spawn** from destroyed bricks while multiple balls are active. Only one ball must remain on the screen for capsules to spawn. During multi-ball, the capsule PRNG is **not advanced** (§30.5).

### 12.5 Catch Rules

Required behavior:

- While Catch is active, a ball contacting Vaus sticks to it.
- Fire/release input launches the caught ball.
- **Multi-Ball Interaction:** If multiple balls are active, Catch only catches the first ball that touches Vaus, while normal deflection rules apply to the other balls.
- **Auto-Release Timeout:** Caught balls auto-release after **360 simulation ticks** (6 seconds at 60 FPS) if the player does not manually press fire.
- The caught ball sticks at a fixed offset relative to Vaus center; if Enlarge cancels Catch the ball re-attaches at the new center and stays caught; stick X is clamped within the walls (§33.2).


### 12.6 Laser Rules

Required behavior:

- Laser activates Vaus shooting.
- Pressing the Fire input emits twin parallel laser shots travelling upward simultaneously (one from the left edge of the Vaus, one from the right edge).
- Laser shots destroy colored bricks, destroy enemies, and decrement hits on silver bricks according to hit-count rules.
- Laser shots bounce off or disintegrate on gold bricks without destroying them.
- **Limits & Cooldown:** 
  * Maximum of **2 active laser pairs (4 beams total)** can be present on screen at any time.
  * A firing cooldown of **15 simulation ticks** (0.25 seconds at 60 FPS) must be enforced between shots.
- Per-beam silver-brick decrement, beam consumption on hit, and pair-beam independence are defined in §33.4.


### 12.7 Break Rules

Required behavior:

- Break opens a warp exit on the right/lower-right side of the playfield.
- Vaus can enter the warp exit.
- Entering the warp awards **10,000 points**.
- Player advances to the next round.
- **Multi-Ball Interaction:** If multiple balls are active when the Vaus enters the warp exit, all remaining balls immediately despawn without triggering a life loss.
- On the final brick round (**Round 33**) and the boss rounds, the Break exit **does not open**; the round must be cleared normally to reach the boss. This matches the implementation gate (`currentRoundNum < 33`, `src/core/roundState.ts`) and avoids skipping the final DOH boss.

---

## 13. Enemies / Obstacles

### 13.1 Enemy Types

The manual identifies four obstacle/enemy types:

| Name | Required role |
|---|---|
| Konerd | Floating obstacle that interferes with ball path. |
| Pyradok | Floating obstacle that interferes with ball path. |
| Tri-sphere | Floating obstacle that interferes with ball path. |
| Opopo | Floating obstacle that interferes with ball path. |

### 13.2 Enemy Behavior

Required baseline behavior:

- **Spawn Locations:** Enemies spawn from the golden hatches located at the top-left and top-right of the playfield walls. The hatches play a brief opening animation.
- **Spawn Interval:** A new enemy spawns every **480 simulation ticks** (8 seconds at 60 FPS), or immediately if the active enemy count drops to 0.
- **Capacity:** A maximum of 3 enemies can be active on screen at once.
- Enemies drift/fall through the playfield using the normative per-type path table in §33.5 (no "e.g."); enemies pass through bricks and walls, and a bottom exit despawns them with no penalty.
- Ball–enemy collision: the enemy is an AABB; the ball reflects via the nearest-face normal and the enemy is destroyed the same tick, ball speed unchanged (§19.5).
- Enemies can be eliminated by the ball, by Vaus contact, or by lasers.
- **Vaus Collision:** Collision between Vaus and an enemy is **harmless** to the Vaus; the enemy is destroyed (awarding points) and the Vaus is unaffected.
- **Enemy Point Values:** Destroying any of the standard enemy types awards **100 points**.


---

## 14. Stage Progression

### 14.1 Stage List / Structure

Both regions use the same 34-slot branching structure:

```text
Round 1:        single stage
Rounds 2-16:    L/R branching stages   (round-NNL.json / round-NNR.json)
Round 17:       boss stage (mid-game DOH)
Round 18:       single stage
Rounds 19-33:   L/R branching stages   (round-NNL.json / round-NNR.json)
Round 34:       final boss stage (DOH)
```

After clearing each branching round, the player follows one of the two L/R
layout variants for the next round; both variants advance the same round number.

### 14.2 Regional Layout Datasets

US is the required dataset; JP is an optional independent dataset. Both follow
the identical structure in §14.1 — only the per-round brick layouts differ. The
JP layouts live under `/data/levels/jp/` and are not a separate round count.

### 14.3 Stage Data Source Format

Do not hardcode level layouts into engine code. Use external data:

```text
/data/levels/us/round-01.json
/data/levels/us/round-02L.json
/data/levels/us/round-02R.json
...
/data/levels/us/round-16L.json
/data/levels/us/round-16R.json
/data/levels/us/round-17.json      # mid-game boss
/data/levels/us/round-18.json
/data/levels/us/round-19L.json
...
/data/levels/us/round-33L.json
/data/levels/us/round-33R.json
/data/levels/us/round-34.json      # final DOH boss
/data/levels/jp/round-01.json      # optional, same structure
...
```

### 14.4 Level JSON Schema

```json
{
  "id": "us-round-01",
  "region": "US",
  "roundNumber": 1,
  "type": "brick",
  "grid": {
    "columns": 11,
    "rows": 28,
    "brickWidth": 16,
    "brickHeight": 8
  },
  "clearRequiredCount": 0,
  "cells": [
    {
      "col": 0,
      "row": 0,
      "type": "EMPTY",
      "hitsRemaining": 0,
      "capsule": null,
      "isCapsuleCarrier": false,
      "clearRequired": false
    }
  ],
  "enemyProfile": "default-round-01",
  "ballProfile": "default-round-01",
  "paletteProfile": "us-round-01"
}
```

Notes: `clearRequiredCount` MUST equal the number of cells with `clearRequired: true`. `isCapsuleCarrier` replaces the legacy nybble-9 flag (§12.3); `hitsRemaining` is authoritative for silver-brick hits, with §11.4's formula used only as a data generator.

### 14.5 Brick Type Codes

```ts
type BrickType =
  | 'EMPTY'
  | 'WHITE'
  | 'ORANGE'
  | 'LIGHT_BLUE'
  | 'GREEN'
  | 'RED'
  | 'BLUE'
  | 'PINK'
  | 'YELLOW'
  | 'SILVER'
  | 'GOLD';
```

### 14.6 Stage Layout Parity Requirement

Fidelity mode must pass visual and data parity checks:

1. Every brick cell in each round matches the approved reference layout.
2. Brick colors match approved reference screenshots/maps.
3. Silver/gold placement matches reference.
4. Capsule-**carrier positions** match reference data; the capsule *type* is chosen at runtime by the seeded RNG (§12.3, §30.4), so only carrier placement is parity-checked.
5. Clear-required count matches reference behavior.
6. Boss stages appear at Round 17 (mid-game) and Round 34 (final), in both regions.

### 14.7 Level Skip & Continue Secrets

The NES version supports two hidden cheats:

1. **A + Start Level Skip:**
   * At the beginning of each level before launching the ball, pressing `A + Start` advances the game by one round per press, up to Level 16 (just before the mid-game boss at Round 17; the implementation caps the skip at `Math.min(16, …)`, `boot.ts:221`), re-running ROUND_INTRO and resetting the ball (§31).
   * Add this as an optional fidelity setting named `enableManualLevelSkipSecret`.
   * Default: enabled in fidelity mode, disabled in clean-room casual mode.

2. **Game Over Continue Code:**
   * After receiving a "Game Over" screen, return to the **Title Screen**.
   * Hold the keys mapped to **A + B** (default `Z + X` or `Space + J`).
   * Press the key mapped to **Select** (default `Tab` or `Shift`) **5 times**.
   * Release the buttons, and press **Start** to resume the game from the start of the level where the last life was lost.
   * **Score Reset:** Using a continue resets the player's score to 0 to preserve the integrity of the High Score leaderboard.
   * *Exception:* Continues are disabled for the final DOH boss fight (Round 34).


---

## 15. Boss: DOH / Dimensional Fortress

### 15.1 Boss Objective

Required behavior:

- DOH appears as **two boss encounters**: a mid-game boss at **Round 17** and the **final boss at Round 34**. Both use the same boss mechanism.
- The player must hit DOH **16 times** with the energy ball in each encounter.
- Each valid ball collision increments boss damage.
- When damage reaches 16, the boss defeat sequence begins. Defeating the Round 17 boss advances to Round 18; defeating the Round 34 boss begins the ending sequence.

### 15.2 Boss Hazards

Required behavior:

- DOH fires projectiles from its mouth/face area.
- Projectile collision with Vaus destroys Vaus.
- Ball–DOH reflection uses AABB nearest-face (same rule as bricks). A ball cannot re-register a hit until it has separated from the boss AABB for ≥1 tick; simultaneous multi-ball hits each count once. Projectile speed, fire interval, count, and trajectory are defined in §33.6.
- No standard brick-clear objective exists in this round.

### 15.3 Boss Failure Rule

Required behavior:

- If the player loses all lives during a boss encounter, the game ends.
- At the **mid-game boss (Round 17)**, normal life-loss and continue rules apply.
- After **final boss (Round 34)** failure, no continue is available unless reference capture proves a region-specific exception.

### 15.4 Boss Presentation

Fidelity mode:

- Use licensed boss art, music, SFX, and transition timing.

Clean-room mode:

- Use original boss art, names, and story text.

---

## 16. Scoring

### 16.1 Score Events

| Event | Points |
|---|---:|
| White brick | 50 |
| Orange brick | 60 |
| Light blue brick | 70 |
| Green brick | 80 |
| Red brick | 90 |
| Blue brick | 100 |
| Pink brick | 110 |
| Yellow brick | 120 |
| Silver brick | 50 x round number |
| Capsule collected | 100 |
| Break warp exit entered | 10,000 |
| Enemy destroyed | 100 |
| Boss hit / boss defeat | 1,000 / 50,000 |

### 16.2 Score Persistence

Required behavior:

- Score persists across rounds and life losses.
- In 2-player mode, each player has a separate score.
- High score persists locally.

### 16.3 Extra Lives

Required behavior:

- `P` capsule grants one extra Vaus.
- Extra lives are awarded at **20,000 points** for the first, and then **every 60,000 points** thereafter.
- Intra-tick ordering of score and extra-life awards versus the life-loss check is defined in §32.


---

## 17. Audio Requirements

### 17.1 Audio Rights

Original BGM and SFX may only be used with rights clearance. The web engine must support loading licensed audio packs but should also support clean-room replacement audio.

### 17.2 Reference Music Inventory

Unlike the original Arkanoid, **Arkanoid II: Revenge of DOH** has in-game
background music. The reference audio set includes (by role, not by verified
track name):

- Title / attract music.
- In-game stage background music.
- Boss background music (Round 17 and Round 34 DOH encounters).
- Ending.
- Game Over.
- Name Entry.
- Short jingles: round start, extend / extra-life cue.

The exact Arkanoid II-edition track list, per-track length, loop in/out points,
and one-shot-vs-loop behavior are `[DEFERRED → reference capture]` — track
naming is not yet verified, so specific titles are intentionally omitted.

### 17.3 SFX Inventory

Implement SFX events for at least:

- Ball launch.
- Paddle/Vaus hit.
- Wall hit.
- Colored brick hit/destroy.
- Silver brick hit.
- Gold brick hit.
- Capsule spawn.
- Capsule fall/collect.
- Laser shot.
- Laser hit.
- Enemy spawn.
- Enemy destroyed.
- Catch activated.
- Ball caught.
- Ball released.
- Disruption split.
- Enlarge activated.
- Slow activated.
- Break warp opened.
- Warp entered.
- Extra life awarded.
- Vaus destroyed.
- Round clear.
- Boss hit.
- Boss projectile fired.
- Boss defeated.
- Pause/menu select.
- Game over.

Complete event→SFX cue-sheet `[DEFERRED → M4]`.

### 17.4 Audio Engine

Required implementation:

- Web Audio API.
- Master volume.
- Music volume.
- SFX volume.
- Mute toggle.
- Resume audio after browser interaction restrictions.
- Audio sprite or decoded buffer cache.
- No audible delay for SFX. Concrete target: SFX buffers must be pre-decoded at round
  load time and begin playback within **50 ms** of the triggering game event under
  normal conditions; measure this as part of §20.5 acceptance.

### 17.5 NES-Style Audio Fallback

If original audio is not licensed:

- Compose original NES-inspired chiptune cues.
- Use pulse/triangle/noise-like synthesis or sampled clean-room instruments.
- Preserve event timing and functional role, not melody or exact waveform.
- **Voice Stealing & Channel Limitations (Fidelity Synthesis):** Emulate the NES APU channel limits (Pulse 1, Pulse 2, Triangle, and Noise). Sound effects (e.g., laser firing, brick hits) take priority and will temporarily hijack (voice steal) their assigned channels from the background music tracks, restoring the music channels once the sound effect finishes playing. This creates a high-fidelity retro audio behavior.

---

## 18. Visual Asset Requirements

### 18.1 Sprite Inventory

Required gameplay sprites:

- Vaus normal.
- Vaus enlarged.
- Energy ball.
- Laser shots.
- Warp/Break exit.
- Colored bricks.
- Silver brick states.
- Gold brick.
- Capsule letters S, C, L, D, P, E, B.
- Enemy/obstacle sprites: Konerd, Pyradok, Tri-sphere, Opopo.
- DOH boss sprite/animation.
- Projectile sprites.
- Explosion/death effects.
- UI digits/score/lives/round indicators.
- Title screen assets.
- Ending screen assets.

Per-asset animation frame counts/durations and full sprite dimensions `[DEFERRED → M5]`; collision hitbox sizes are in §33.

### 18.2 Reference Sprite Dimensions

NESMaps sprite references list several useful dimensions:

| Asset | Reference dimension |
|---|---:|
| Wall tile | 16 x 8 px |
| Capsule | 16 x 7 px |
| Energy ball | 5 x 4 px |
| Vaus | 32 x 8 px |
| Vaus large | 32 x 8 px reference sprite asset, with gameplay collision width to be verified |
| Warp/escape element | 8 x 24 px |

### 18.3 Licensed Fidelity Requirement

In fidelity mode:

- Pixel art must match the approved licensed reference package.
- No anti-aliasing.
- No modified colors unless matching NES palette output target.
- Title and ending screens must be recreated only with rights clearance.

### 18.4 Clean-Room Requirement

In clean-room mode:

- Replace all protected art with original assets.
- Replace names/logos/story where needed.
- Do not copy exact stage layouts.
- Keep general gameplay readability: brick colors, capsule letters, paddle, ball, and boss-like final challenge can remain functionally analogous but visually distinct.

---

## 19. Technical Architecture

### 19.1 Recommended Stack

- TypeScript.
- HTML Canvas 2D for fidelity rendering.
- Optional WebGL renderer if shader effects or performance needs justify it.
- Vite or equivalent modern web build tool.
- Vitest/Jest for unit tests.
- Playwright for browser tests.

### 19.2 Core Modules

```text
/src
  /app
    boot.ts
    main.ts
  /engine
    fixedStep.ts
    stateMachine.ts
    input.ts
    audio.ts
    renderer.ts
    assetLoader.ts
    rng.ts
    replay.ts
  /game
    gameState.ts
    roundState.ts
    vaus.ts
    ball.ts
    bricks.ts
    capsules.ts
    enemies.ts
    boss.ts
    scoring.ts
    collision.ts
    transitions.ts
  /data
    levelSchema.ts
    assetManifest.ts
  /ui
    titleScreen.ts
    hud.ts
    pause.ts
    gameOver.ts
    ending.ts
/tools
  validateLevels.ts
  renderLevelPreview.ts
  compareReferenceImage.ts
/docs
  prd.md
```

### 19.3 State Machine

Required game states:

```ts
type GameState =
  | 'BOOT'
  | 'LOADING'
  | 'ERROR'
  | 'TITLE'
  | 'OPENING_STORY'
  | 'GAMEPLAY_DEMO'
  | 'ROUND_INTRO'
  | 'BALL_READY'
  | 'PLAYING'
  | 'PAUSED'
  | 'LIFE_LOST'
  | 'ROUND_CLEAR'
  | 'BREAK_WARP'
  | 'TURN_HANDOFF'   // [DEFERRED → M3] 2-player only; stub
  | 'GAME_OVER'
  | 'NAME_ENTRY'
  | 'BOSS_INTRO'
  | 'BOSS_PLAYING'
  | 'BOSS_DEFEATED'
  | 'ENDING';
```

Transitions are defined in §31. `PLAYER_SELECT` is folded into `TITLE` (player count is chosen in place). `DEMO_OR_STORY` is split into `OPENING_STORY` and `GAMEPLAY_DEMO`.

### 19.4 Determinism

The engine must support deterministic runs:

- Fixed timestep.
- Seeded RNG.
- Replay log of inputs by frame.
- Same input log should reproduce the same score, brick destruction order, capsule drops, and final state.

#### 19.4.1 Replay Log Format

Replays are first-class deterministic artifacts. Provisional schema:

```json
{
  "formatVersion": 1,
  "gameVersion": "<semver>",
  "region": "US",
  "mode": "licensed-fidelity",
  "seed": "<deterministicSeed>",
  "startRound": 1,
  "configHash": "<sha256 of canonical gameplay config + sim-asset manifest, §30.7>",
  "deflectionModel": "continuous",
  "jitterEnabled": false,
  "numericModel": "q16.16-v1",
  "prngState": ["<player1 mulberry32 state>"],
  "inputTicks": [
    { "tick": 0, "input": { "left": false, "right": true, "fire": false } }
  ]
}
```

A replay plus the matching `configHash`/asset manifest must reproduce identical score,
brick destruction order, capsule drops, and final state. The configHash canonicalization, gameplay-field allowlist, PRNG-state capture, and reject-on-mismatch behavior are defined in §30.7; per-tick input sampling is defined in §30.6. Imported replay JSON is untrusted external input and MUST be validated/sanitized before use.

### 19.5 Collision System

Collision must support:

- Ball vs wall.
- Ball vs Vaus.
- Ball vs brick.
- Ball vs enemy.
- Ball vs boss.
- Ball-vs-enemy and ball-vs-boss use AABB nearest-face reflection (same rule as bricks); see §13.2 and §15.2.
- Laser vs brick.
- Laser vs enemy.
- Capsule vs Vaus.
- Projectile vs Vaus.
- Vaus vs warp exit.
- Vaus vs enemy (harmless, destroys enemy).

Recommended implementation:

- Use swept collision or sub-stepping for fast ball movement.
- Resolve one collision at a time in deterministic order.
- **Hitboxes vs. Render Bounds:** Do not strictly use visual sprite bounds for collision. Game entities must support separate logical collision bounding boxes (AABB) that may be smaller or differently aligned than their visual sprites, pending verification against NES physics.
- **Brick Overlap Resolution Priority:** If the ball intersects multiple bricks on one tick, resolve a single deterministic contact: pick the brick whose face the swept ball center crosses first (velocity-direction primary); break ties by smaller penetration depth, then by lowest cell index. Destroy exactly **one** brick per resolved contact and reflect along that face's normal; for a corner, the normal is the axis of smaller penetration. (Replaces the prior "destroy all if equidistant" rule to keep brick-destruction order deterministic, §19.4.)


### 19.6 Data Validation

Level validator must check:

- Grid is exactly 11 x 28.
- All cells are within bounds.
- Brick types are valid.
- Clear-required count is correct (`clearRequiredCount` MUST equal the number of cells with `clearRequired: true`, §14.4).
- Gold bricks are not marked clear-required.
- Capsule types are valid.
- Boss round has no brick grid requirement unless needed for background.

---

## 20. QA and Acceptance Criteria

### 20.1 Gameplay Acceptance

A build is acceptable when:

1. Player can start a 1-player game from title screen.
2. Player can start a 2-player game from title screen.
3. Vaus movement works with keyboard, gamepad, mouse, and touch.
4. Ball launches, bounces, destroys bricks, and can be lost.
5. All seven capsule types work.
6. Silver/gold brick behavior works.
7. Round clear advances to the next round.
8. Break warp advances to the next round and awards 10,000 points.
9. Lives decrease on ball loss.
10. `P` capsule awards an extra life.
11. Game over triggers when lives are exhausted.
12. The game progresses through 34 round slots with DOH bosses at Round 17 and Round 34.
13. DOH requires 16 hits and fires lethal projectiles.
14. Defeating DOH triggers ending.

### 20.2 Visual Parity Acceptance

For Licensed Fidelity Mode:

1. Each stage layout matches the approved reference at cell level.
2. Stage previews rendered by the engine have zero unintended cell differences from approved reference data.
3. Sprites align to the expected pixel grid.
4. Title screen matches approved reference package.
5. Ending screen matches approved reference package.
6. UI score/life/round display matches approved reference package.

### 20.3 Audio Parity Acceptance

For Licensed Fidelity Mode:

1. Correct cue plays on title/start/round/game-over/ending flows.
2. SFX fire within the 50 ms latency budget (§34, §17.4).
3. SFX channel allocation follows the voice-priority table (§17.5, §34); SFX do not overlap incorrectly.
4. Audio can be muted.
5. Browser audio unlock is handled gracefully.

### 20.4 Physics Parity Acceptance

Physics parity is validated against the deterministic engine's own golden output (the parity oracle, §34.1); reference capture is a separate fidelity gate:

1. Same Vaus hit position produces same outgoing ball angle class.
2. Same brick collision case resolves to same bounce direction.
3. Same power-up collection changes state at the same frame offset.
4. Same boss hit collision registers once per valid hit.
5. Same input replay produces an exactly reproducible deterministic output (§34.1).

### 20.5 Browser Acceptance

> Note: §20.2 and §20.3 are scoped to Licensed Fidelity Mode. For a clean-room-first
> release (per §1 and §4.3), treat §20.1 / §20.4 / §20.5 as the baseline acceptance
> set, and add §20.2 / §20.3 fidelity checks only when the licensed asset package is
> in place.

Required tests:

- Chrome desktop.
- Safari desktop.
- Firefox desktop.
- Edge desktop.
- iOS Safari.
- Android Chrome.

Acceptance:

- Game starts.
- Input works.
- Audio unlock works.
- Frame pacing is stable.
- Fullscreen works where browser allows.
- Local high score persists.
- Pin minimum browser versions and OS floors, with an N-1 support policy (no bare "Latest").
- Where a required feature is unsupported (e.g., `navigator.vibrate` on iOS Safari), the app degrades gracefully (no-op), not error.
- "Input works" is decomposed into per-device sub-tests: keyboard, gamepad (incl. remap), touch on-screen control, and pointer (relative/absolute).

### 20.6 Determinism Acceptance

See §34.1: golden-replay corpus, byte-identical final state + matching configHash across the §5.1
browser matrix; replace "stable" with "exactly reproduces".

### 20.7 Mechanism Acceptance

See §34.2: exact-output tests for ball speed/launch/deflection, capsule distribution, 2P
isolation/handoff, boss no-continue/scoring, name-entry (incl. blocked-localStorage), and both cheats.

### 20.8 Accessibility Acceptance

See §34.3: 44 px touch targets, keyboard-only completion, WCAG 2.3.1 flash-rate limit, color-blind
glyph presence.

---

## 21. References

### Official / Manual Sources

1. [NES Instruction Manual transcription: Arkanoid](https://www.world-of-nintendo.com/manuals/nes/arkanoid.shtml)  
   Used for story, controls, wall types, brick scoring, capsule effects, enemy names, and manual level-skip note.

2. [Arkanoid NES Manual PDF](https://www.thegameisafootarcade.com/wp-content/uploads/2017/02/Arkanoid-Game-Manual.pdf)  
   Used as manual image reference for controls, scoring, capsules, enemy descriptions, and story pages.

### Version / Round Count Sources

3. [GameFAQs: Arkanoid NES Trivia](https://gamefaqs.gamespot.com/nes/563383-arkanoid/trivia)  
   Used for U.S. vs Japanese regional layout differences: both regions share the same 34-slot branching structure (bosses at Round 17 and Round 34) with different per-round brick layouts.

4. [GameFAQs: Arkanoid NES FAQs and Maps](https://gamefaqs.gamespot.com/nes/563383-arkanoid/faqs)  
   Used to identify available block-layout map references for Rounds 1-10, 11-20, 21-30, and 31-boss.

### Stage Layout / Sprite / Data Sources

5. [NESMaps: Arkanoid maps](https://www.nesmaps.com/maps/Arkanoid/Arkanoid.html)  
   Used as a visual map reference for NES round layouts.

6. [NESMaps: Arkanoid full labeled map image](https://www.nesmaps.com/maps/Arkanoid/Arkanoid.png)  
   Used as a visual reference for the complete labeled level-map sheet.

7. [NESMaps: Arkanoid sprites](https://www.nesmaps.com/maps/Arkanoid/sprites/ArkanoidSprites.html)  
   Used for sprite dimension references such as wall, capsule, ball, Vaus, and warp elements.

8. [Nick Aschenbach: Arkanoid game levels](https://nick-aschenbach.github.io/blog/2015/04/27/arkanoid-game-levels/)  
   Used for level geometry interpretation: 192 x 232 mapped area, 8 px edges, 16 x 8 bricks, 11 x 28 grid.

9. [Data Crystal: Arkanoid (NES) ROM map](https://datacrystal.tcrf.net/wiki/Arkanoid_(NES)/ROM_map)  
   Used to validate that NES level data contains brick/capsule/hit/clear-count related data fields.

### Gameplay Sources

10. [StrategyWiki: Arkanoid Gameplay](https://strategywiki.org/wiki/Arkanoid/Gameplay)  
    Used for Vaus behavior, brick categories, scoring summary, capsule behavior, power-up replacement behavior, and paddle hit-zone behavior.

11. [StrategyWiki: Arkanoid Walkthrough](https://strategywiki.org/wiki/Arkanoid/Walkthrough)  
    Used for DOH boss behavior: final round, 16 hits, projectiles, and no continue after final defeat condition.

12. [RetroGames.cz: Arkanoid NES description](https://www.retrogames.cz/play_039-NES.php)  
    Used for high-level NES version description, final-stage numbering note, no-continue final condition, and ending summary.

13. [World of Nintendo: Arkanoid ending](https://www.world-of-nintendo.com/game_endings/nes/arkanoid.shtml)  
    Used as a textual ending-flow reference.

14. [VGMuseum: Arkanoid NES ending images](https://www.vgmuseum.com/end/nes/b/ark.htm)  
    Used as a visual ending reference. Use only with appropriate rights clearance.

### Audio Sources

15. [Video Game Music Preservation Foundation: Arkanoid (NES)](https://vgmpf.com/Wiki/index.php?title=Arkanoid_(NES))  
    Used for composer/arranger notes and track inventory including short jingles and name-entry/ending cues.

16. [VGMRips: Arkanoid NES pack](https://vgmrips.net/packs/pack/arkanoid-nes)  
    Used for NES APU/chip metadata and track names/order/durations.

17. [Zophar's Domain: Arkanoid NSF](https://www.zophar.net/music/nintendo-nes-nsf/arkanoid)  
    Used for additional track/SFX inventory reference.

18. [Sounds Resource: Arkanoid NES sound effects](https://sounds.spriters-resource.com/nes/arkanoid/asset/397226/)  
    Used only to confirm that public SFX inventories exist. Do not bundle or copy ripped audio without rights clearance.

---

## 22. Open Verification Checklist

The following details are split into **[REF-SOURCED]** (grounded in the manual/reference §21) and **[PROVISIONAL-tuning]** (clean-room designer defaults pending reference capture). Provisional values are consolidated in §33 and validated by §34:

1. **[REF-SOURCED]** Exact starting life count and life display semantics (3 lives, Vaus sprites in HUD).
2. **[PROVISIONAL-tuning]** Exact score-based extra-life thresholds (20k, then every 60k).
3. **[PROVISIONAL-tuning]** Exact enemy point values (100 points for all standard enemies).
4. **[PROVISIONAL-tuning]** Exact enemy spawn timing, spawn locations, and movement patterns (spawns from top hatches, every 8 seconds, max 3 on screen).
5. **[PROVISIONAL-tuning]** Exact ball initial velocity per round (base speed 2.0, launched at $60^\circ$ or $120^\circ$ relative to horizontal).
6. **[PROVISIONAL-tuning]** Exact ball speed increase rules (ceiling hit speed-up by 0.25, and every 10 brick hits by 0.05, capped at 5.0).
7. **[PROVISIONAL-tuning]** Exact Vaus hit-zone angle table (continuous scalingFactor mapped to max 75 degrees, or discrete 8-zone mapping).
8. **[PROVISIONAL-tuning]** Exact collision priority when the ball overlaps multiple bricks (single deterministic contact: velocity-aligned first-crossed face, one brick destroyed per contact; see §19.5).
9. **[PROVISIONAL-tuning]** Exact laser fire rate and max simultaneous shots (twin beams, max 2 pairs on screen, 15 tick cooldown).
10. **[PROVISIONAL-tuning]** Exact Catch auto-release timeout (360 ticks / 6 seconds).
11. **[PROVISIONAL-tuning]** Exact Disruption split angles and velocities (0, +15, -15 degrees).
12. **[REF-SOURCED]** Whether `P` capsule cancels or preserves an active power-up (preserves active power-up).
13. **[REF-SOURCED]** Whether capsules can spawn while multiple balls are active (no capsule spawn during multi-ball).
14. **[PROVISIONAL-tuning]** Exact capsule drop trigger and type randomizer (carrier via `isCapsuleCarrier`; type from the seeded mulberry32 PRNG §30.4, weighted 2:1; duplicate replaced by `D`).
15. **[REF-SOURCED]** Exact two-player turn/progression behavior (alternate turns on life loss, independent board states, single-player continuous play upon game over).
16. **[PROVISIONAL-tuning]** Exact high-score/name-entry flow (leaderboard top 5, 3 initials, local storage persistence).
17. **[PROVISIONAL-tuning]** Exact title-screen idle/demo/story timing (cycles Title -> Story -> Gameplay Demo every 10 seconds).
18. **[REF-SOURCED]** Exact ending text, timing, and screen sequence (victory scroll with chiptune ending cue, credit sequence, "THE END" screen).
19. **[REF-SOURCED]** Exact U.S. vs Japanese Level layouts (identical designs; U.S. version has 3 additional stages, shifting boss level from 33 to 36).
20. **[REF-SOURCED]** Exact continue/level-select cheat code inputs (A+B and Select 5 times on title screen).




---

## 23. Milestones

### M0: Legal and Reference Package

Deliverables:

- Decide Licensed Fidelity Mode vs Clean-Room Homage Mode for public release.
- Identify target region: U.S. NES required, Japanese optional.
- Acquire or approve reference capture package.
- Acquire rights-cleared asset package if using original-equivalent art/audio/data.

Exit criteria:

- Project can legally proceed with chosen asset strategy.

### M1: Core Engine Prototype

Deliverables:

- Canvas renderer.
- Fixed-step loop.
- Input manager.
- Vaus movement.
- Ball movement/collision.
- Basic brick destruction.
- Score display.

Exit criteria:

- One test round is playable from start to clear.

### M2: Level Data and Stage Flow

Deliverables:

- Level JSON schema.
- Level validator.
- Round intro/clear/death/game-over states.
- U.S. round progression scaffold.
- Stage preview renderer.

Exit criteria:

- Engine can load and play multiple rounds from data.

### M3: Capsules, Enemies, and Lives

Deliverables:

- All seven capsule effects.
- Life system.
- Enemy spawner and four enemy types.
- Break warp.
- Two-player mode baseline.

Exit criteria:

- Core game loop works across several stages with all major mechanics.

### M4: Boss, Ending, Title, and Audio

Deliverables:

- DOH boss round.
- Boss projectiles and 16-hit defeat rule.
- Title flow.
- Ending flow.
- Audio manager.
- BGM/SFX event wiring.

Exit criteria:

- Full game can be completed from title to ending.

### M5: Fidelity and QA

Deliverables:

- Stage parity checks.
- Sprite/UI alignment checks.
- Physics tuning pass.
- Audio trigger/timing pass.
- Browser compatibility pass.

Exit criteria:

- Reference-accurate acceptance tests pass within approved tolerances.

### M6: Release Build

Deliverables:

- Production build.
- Legal asset audit.
- Credits/licenses page.
- Controls/help page.
- Save/high-score persistence.
- Deployment pipeline.

Exit criteria:

- Public or private release build is approved.

---

## 24. Success Metrics

### 24.1 Fidelity Metrics

- 100% required capsule behavior implemented.
- 100% required brick scoring implemented.
- 100% required U.S. round progression implemented.
- 100% stage layout parity in Licensed Fidelity Mode.
- 0 known legal-asset violations in release build.

### 24.2 Product Metrics

- Game loads in under 3 seconds on broadband after cache warmup.
- Input latency feels immediate on desktop.
- 60 FPS simulation stability on supported desktop browsers.
- Mobile touch mode playable without external controller.
- Local high score persists across sessions.

PWA/offline strategy and memory/bundle-size budgets `[DEFERRED → M6]`.

---

## 25. Appendix: Recommended Config Flags

```ts
type GameConfig = {
  region: 'US' | 'JP';
  mode: 'licensed-fidelity' | 'clean-room';
  enableManualLevelSkipSecret: boolean;
  enableHighScoreNameEntry: boolean;
  enableTwoPlayerMode: boolean;
  inputMode: 'keyboard' | 'gamepad' | 'relative-pointer' | 'absolute-pointer' | 'touch';
  renderScaleMode: 'integer' | 'fit';
  audioEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
  deflectionModel: 'continuous' | 'discrete8';
  jitterEnabled: boolean;
  numericModel: string;
  deterministicSeed: string;
};
```

---

## 26. Appendix: Minimum Event List for Implementation

```ts
type GameEvent =
  | 'APP_BOOTED'
  | 'TITLE_SHOWN'
  | 'PLAYER_COUNT_CHANGED'
  | 'GAME_STARTED'
  | 'ROUND_STARTED'
  | 'BALL_LAUNCHED'
  | 'BRICK_HIT'
  | 'BRICK_DESTROYED'
  | 'CAPSULE_SPAWNED'
  | 'CAPSULE_COLLECTED'
  | 'POWERUP_ACTIVATED'
  | 'LASER_FIRED'
  | 'ENEMY_SPAWNED'
  | 'ENEMY_DESTROYED'
  | 'BALL_LOST'
  | 'LIFE_LOST'
  | 'EXTRA_LIFE_AWARDED'
  | 'ROUND_CLEARED'
  | 'BREAK_WARP_OPENED'
  | 'BREAK_WARP_ENTERED'
  | 'BOSS_STARTED'
  | 'BOSS_HIT'
  | 'BOSS_PROJECTILE_FIRED'
  | 'BOSS_DEFEATED'
  | 'GAME_OVER'
  | 'NAME_ENTRY_STARTED'
  | 'ENDING_STARTED'
  | 'RETURNED_TO_TITLE';
```

---

## 27. Final Implementation Note

The highest-risk parts of this project are not the basic web engine, but the **reference-accurate data and rights-cleared expression**:

- Exact stage layouts.
- Exact title and ending screens.
- Exact BGM/SFX.
- Exact collision/speed/RNG behavior.

The recommended path is to build the engine and data schema first, then use a legally approved reference package to fill and validate fidelity data.

---

## 28. Appendix: Definitions

This document uses several terms interchangeably in casual references; the following
are the canonical definitions for implementation:

| Term | Definition |
|---|---|
| **Round** | A single numbered stage of the game (e.g. U.S. Round 1–36). The canonical unit of progression. |
| **Stage / Level** | Synonyms for *round*. The codebase and data files use `round`; this document uses *stage*/*level* only when quoting reference material. |
| **Tick** | One fixed-step simulation step (1/60 s). All game logic, RNG, and replay logs are tick-based. |
| **Frame** | One rendered display frame. Rendering may run independently of ticks; do not use frames as the simulation clock. |
| **Vaus** | The player-controlled paddle spacecraft. |
| **Energy ball** | The ball the player keeps in play. |
| **Capsule** | A falling power-up item bearing a letter (S/C/L/D/P/E/B). |
| **Power-up** | The active effect granted by a collected capsule. |
| **DOH** | The final boss, encountered on the last round. |
| **Brick field** | The grid of bricks in a brick round. |
| **Clear-required** | Bricks that must be destroyed to complete the round (colored + silver; never gold). |
| **Licensed Fidelity Mode** | Build using rights-cleared original-equivalent assets/data (see §1, §4). |
| **Clean-Room Homage Mode** | Build using original, non-infringing assets/data (see §1, §4). |

---

## 29. Appendix: Accessibility

The game should meet a baseline accessibility bar beyond the core fidelity targets:

- **Remappable controls** (already required by §9.5) must be persistent across sessions.
- **Color-blind support:** brick types must remain distinguishable by more than color
  alone (e.g. pattern/glyph differences) so red/green and blue/pink bricks are not
  confused. This is especially important since brick color encodes point value (§11.3).
- **Touch targets:** on mobile (§5.1) the Vaus and any on-screen buttons should meet a
  minimum touch target (~44 CSS px) even though the logical Vaus is 32 px; scale the
  drag-hit area independently of the drawn sprite.
- **Reduced motion:** the optional CRT filter (§6.3) and any transition/flash effects
  must respect the OS `prefers-reduced-motion` setting.
- **Captions / cues:** SFX-only events with gameplay significance (capsule spawn, enemy
  spawn, boss projectile) should have an optional visual indicator for players who mute
  audio or cannot hear it.
- **Keyboard-only operation:** the entire title→game→ending flow must be completable
  with keyboard alone (no pointer required).
- **No seizure-inducing patterns:** avoid high-frequency strobing in death/explosion
  and boss effects.

Color-blind glyph visuals and caption/visual-cue designs `[DEFERRED → M5]`; glyphs live in an optional overlay layer (does not alter §18.3 fidelity pixels).

---

## 30. Appendix: Determinism & Numeric Model

### 30.1 Scope (G6)
Only the **simulation** is bit-deterministic: physics, collision, RNG, scoring,
brick-destruction order, capsule drops, and enemy/boss/projectile motion. Render
interpolation, audio mixing, and decorative particles are **not** part of the deterministic
contract and may differ per frame/device.

### 30.2 Numeric representation (D1)
All simulation position and velocity values use signed **16.16 fixed-point** (Q16.16). No
IEEE-754 float appears in the simulation path. Multiply uses a 64-bit intermediate then `>>16`;
divide uses `(a<<16)/b`. Accumulation order is left-to-right in the order operands appear in each
formula. Collision tests use simulation (fixed-point) coordinates, never render-rounded ones.

### 30.3 Angle handling (D2)
The simulation never calls runtime trigonometry. The finite angle set — launch (60°,120°),
8-zone deflection (±75,±55,±35,±15), Disruption split (±15 relative), and the ±10° vertical-loop
clamp — is precomputed at build time into a table of Q16.16 unit vectors. Outgoing velocity =
`unit × speed`. The continuous deflection model quantizes `scalingFactor∈[-1,1]` to a fixed 1/256
grid before lookup, so it too is table-driven and deterministic.

### 30.4 PRNG (D3, D5)
The capsule randomizer uses **mulberry32** (32-bit state), seeded once at game start from the
replay-header `deterministicSeed`, advancing exactly one draw per capsule-type decision (§12.3).
No other subsystem consumes this stream. In 2-player mode each player owns an independent
mulberry32 stream seeded `deterministicSeed XOR playerIndex`. The 32-bit state of every active
stream is part of the replay header (§19.4.1) and any save state.

### 30.5 RNG draw discipline (D6)
- A capsule-type draw occurs only when a carrier brick is destroyed AND exactly one ball is active
  (§12.4). When suppressed during multi-ball, **no draw occurs and the stream is not advanced**.
- `previousCapsule` (duplicate-prevention state, §12.3) resets to null at each round start.

### 30.6 Fixed-step & input (D11, D12)
- Simulation runs at 60 ticks/s via a frame-time accumulator; **at most 5 ticks** are processed per
  rendered frame (catch-up cap). Excess accumulated time beyond the cap is discarded; the cap never
  changes the absolute tick index.
- Input is sampled **exactly once per tick**; analog inputs are quantized to integer logical pixels
  before entering the simulation. The replay stores one record per tick (`inputTicks[]`,
  `tickIndex == array index`); this is the per-tick input log defined in §19.4.1.

### 30.7 Replay header & configHash (D7, D8, D9, D10, L9)
- Header adds: `deflectionModel`, `jitterEnabled`, `numericModel` (version string), and the PRNG
  stream state(s).
- `configHash` = SHA-256 of a **canonical JSON** serialization (UTF-8, keys sorted ascending,
  numbers as shortest round-trip decimal, no insignificant whitespace) of the gameplay-affecting
  allowlist `{region, mode, deflectionModel, jitterEnabled, numericModel}` plus the
  simulation-asset manifest digest. Cosmetic settings (volumes, `inputMode`, CRT, palette/audio
  pack identity) are excluded.
- The simulation-asset manifest digest covers **only level-data identities** (per-round level JSON
  hashes); cosmetic packs are excluded.
- On `configHash` or `formatVersion` mismatch a replay is **rejected** (not played). Any change to
  physics, RNG, or the angle/numeric model MUST bump a determinism-breaking version that
  invalidates older replays.

---

## 31. Appendix: State Transition Table

Single source for all flow transitions. Format: `(source, event/guard, target, tick/duration)`.
The single-player core is complete here; full two-player handoff is `[DEFERRED → M3]` (§10.6).

| Source | Event / Guard | Target | Timing |
|---|---|---|---|
| BOOT | assets loaded + audio unlocked (click/tap) | TITLE | after load |
| LOADING | success / failure | TITLE / ERROR | — |
| TITLE | idle 600 t | OPENING_STORY (storyExit=idle) | — |
| TITLE | Start | OPENING_STORY (storyExit=newGame) | — |
| TITLE | continue-code (§14.7) | ROUND_INTRO (restore lastPlayedRound, score 0) | — |
| OPENING_STORY | storyExit=idle: 600 t | GAMEPLAY_DEMO | — |
| OPENING_STORY | storyExit=newGame: scroll end | ROUND_INTRO | — |
| GAMEPLAY_DEMO | 600 t or any input | TITLE | — |
| ROUND_INTRO | jingle complete | BALL_READY | jingle length (ticks) |
| BALL_READY | Fire | PLAYING | — |
| BALL_READY | A+Start (skip secret) | ROUND_INTRO (round+1, cap 16) | — |
| PLAYING | all balls lost | LIFE_LOST | — |
| PLAYING | clear-required == 0 | ROUND_CLEAR | — |
| PLAYING | Vaus enters break exit | BREAK_WARP | — |
| PLAYING / BOSS_PLAYING | Start | PAUSED (pausedFrom set) | — |
| PAUSED | Start | pausedFrom | — |
| PAUSED | quit-to-title | TITLE | — |
| LIFE_LOST | lives > 0 | BALL_READY (round from beginning) | — |
| LIFE_LOST | lives == 0 | GAME_OVER | — |
| ROUND_CLEAR | roundNumber == bossRound(region) | BOSS_INTRO | — |
| ROUND_CLEAR | else | ROUND_INTRO (round+1) | — |
| BREAK_WARP | entry animation end | ROUND_INTRO (round+1) | — |
| BOSS_INTRO | intro end | BOSS_PLAYING | intro ticks |
| BOSS_PLAYING | damage == 16 | BOSS_DEFEATED | — |
| BOSS_PLAYING | projectile hits Vaus, lives>0 | BOSS_PLAYING (re-launch) | — |
| BOSS_PLAYING | projectile hits Vaus, lives==0 | GAME_OVER (no continue, skip NAME_ENTRY) | — |
| BOSS_DEFEATED | defeat sequence end | ENDING | defeat ticks |
| GAME_OVER | qualifies for leaderboard | NAME_ENTRY | — |
| GAME_OVER | else | TITLE | — |
| NAME_ENTRY | 3rd initial or timeout | TITLE | — |
| ENDING | crawl + credits end | TITLE | — |

Pausable states (S4): PLAYING, BALL_READY, BOSS_PLAYING only; all simulation timers freeze while
paused. Demo (S10) replays a seeded input log on a fixed round, abortable by any input.

---

## 32. Appendix: Tick Resolution Order

Within a single tick, events resolve in this fixed order (S16) so deterministic replay is
well-defined when multiple events coincide:

1. **Capsule collection & power-up apply** (P is immediate, §12.1.1).
2. **Score & extra-life awards** (§16; crossing rule §10.5/§16.3).
3. **Warp entry / round advance** (§8.10).
4. **Ball-out / life-loss check** (§8.6).

Because (2) precedes (4), a score-threshold extra life earned on the same tick the last ball drains
**prevents** game over. Capsule apply (1) precedes life-loss (4), so a P collected on the fatal tick
still grants its life.

---

## 33. Appendix: Provisional Constants

All values below are clean-room tuning defaults, tagged `[PROVISIONAL]`, pending reference capture
(§22, §27). They are the single source of truth; other sections reference this table rather than
restating numbers.

### 33.1 Ball & paddle
| Constant | Value | Decision |
|---|---|---|
| Base ball speed | 2.0 px/tick | §10.2 |
| Ceiling-hit speed step | +0.25 px/tick (first ceiling hit/round) | §10.2 |
| Brick-hit speed step | +0.05 px/tick per 10 hits | §10.2 |
| Max ball speed | 5.0 px/tick | §10.2 |
| Slow power-up speed | 1.5 px/tick (distinct from life-loss reset 2.0) | D15 |
| Launch dividing X | playfield center, inclusive → launch right | P10 |
| Continuous max deflection | 75° (scalingFactor clamped to [-1,1]) | P2 |
| Vertical-loop min angle | ±10° from vertical | §10.4 |

### 33.2 Vaus
| Constant | Value | Decision |
|---|---|---|
| Move step (digital) | 3 px/tick, no acceleration | C2 |
| Enlarged collision width | 48 px (8-zone bands scale to active width) | C7 |
| Held-ball offset | Vaus center (even when wall-clamped) | P11 |

### 33.3 Capsules
| Constant | Value | Decision |
|---|---|---|
| Fall speed | 1.0 px/tick, constant | C1 |
| Spawn position | destroyed brick center | C1 |
| Bottom despawn | no penalty | C1 |
| Catch auto-release | 360 ticks | C6 |
| Capsule weights | standard {S,C,L,D,E}=2, special {P,B}=1 | §12.3 |

### 33.4 Laser
| Constant | Value | Decision |
|---|---|---|
| Silver decrement per beam | 1 hit; beam consumed on hit; pair beams independent | C5 |
| Cooldown / max on screen | 15 ticks / 2 pairs | §12.6 |

### 33.5 Enemies (per-type path table)
| Type | Path | Amplitude | Period | Descent | Loop radius |
|---|---|---|---|---|---|
| Konerd | sine | 24 px | 120 t | 0.5 px/t | — |
| Pyradok | sine | 16 px | 90 t | 0.6 px/t | — |
| Tri-sphere | loop | — | 150 t | 0.5 px/t | 12 px |
| Opopo | loop | — | 180 t | 0.4 px/t | 16 px |

Enemies pass through bricks/walls; bottom exit = despawn, no penalty. Point value 100 all types
`[PROVISIONAL]` (F6). Vaus-vs-enemy is harmless (§13.2).

### 33.6 Boss (DOH)
| Constant | Value | Decision |
|---|---|---|
| Hits to defeat | 16 | §15.1 |
| Per-ball hit debounce | must separate ≥1 tick before re-hit; simultaneous multi-ball each count once | P8 |
| Projectile speed | 2 px/tick | C3 |
| Fire interval | every 90 ticks | C3 |
| Max simultaneous projectiles | 2 | C3 |
| Projectile trajectory | aimed at Vaus X at fire time; indestructible; no wall bounce | C3 |

---

## 34. Appendix: Acceptance Tolerances

Single source for every numeric tolerance/threshold referenced by §20 and §23 milestones.

| Metric | Threshold | Source |
|---|---|---|
| SFX latency (event → playback) | ≤ 50 ms | §17.4 |
| Sim FPS floor (desktop) | 60 ticks/s, 0 dropped ticks over a 60 s golden run | §24.2 |
| Sim FPS floor (mobile tier) | 60 ticks/s sustained; render ≥ 30 fps | §24.2 |
| Missed-vsync budget | ≤ 1% of frames over a 60 s window | §24.2 |
| Input-to-photon | ≤ 50 ms desktop `[PROVISIONAL]` | §24.2 |
| Load (warm cache, broadband) | ≤ 3 s; cold/bandwidth baseline `[DEFERRED → M6]` | §24.2 |
| Determinism | byte-identical final state + matching `configHash` across the §5.1 browser matrix | §19.4 |
| Physics parity oracle | the engine's own golden replay output (cross-browser exact) | §20.4 |

### 34.1 Determinism acceptance
Maintain a golden-replay corpus (N seeds × representative rounds). A build passes only if every
replay reproduces a byte-identical final state and `configHash` on every browser in §5.1. Replace
the word "stable" in §20.5 with "exactly reproduces".

### 34.2 Mechanism acceptance
Add unit/behavior tests asserting exact outputs: ball-speed curve after N hits; launch vectors;
deflection per offset (both models) incl. the 10° clamp; capsule distribution over a seeded run;
2P state isolation/handoff `[DEFERRED → M3]`; boss no-continue + scoring + once-per-hit
registration; name-entry incl. blocked-`localStorage` fallback; both cheat sequences.

### 34.3 Accessibility acceptance
Release-blocking, measurable: 44 px touch-target check; keyboard-only title→ending completion;
WCAG 2.3.1 flash-rate limit (≤ 3 flashes/s); color-blind glyph-presence check (glyphs in an
optional overlay layer, §18.3/§29).
