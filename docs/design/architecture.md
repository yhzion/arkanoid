# System Architecture

*Reference: `prd.md` Sections 19.1, 19.2, 19.4, 30.4 (Technical Architecture)*

This document focuses on the implementation details of the game engine architecture.

## 1. Engine Paradigm
To maintain strict determinism, the engine separates logic updates from rendering:
- **Simulation Loop:** Runs at a fixed 60Hz. Updates game state based on inputs.
- **Rendering Loop:** Runs on `requestAnimationFrame`. Interpolates state for smooth rendering (optional) or snaps to integer coordinates for pixel-perfect fidelity.

## 2. Directory Structure (/game-engine)
The engine uses an internal taxonomy. Every PRD §19.2 module group maps unambiguously to a location below.

- `/core`: Main game loop (`fixedStep`), state machine, event bus, RNG (`rng.ts`), replay (`replay.ts`), scoring, transitions, gameState/roundState.
- `/entities`: Vaus, Ball, Brick, Enemy, Boss, PowerUp/Capsule logic.
- `/physics`: Collision detection, AABB, response math.
- `/render`: Canvas rendering contexts (Fidelity vs Clean-room).
- `/input`: Keyboard, Mouse, Gamepad, Touch polling and abstraction.
- `/audio`: Sound effects and music playback (`audio.ts`, §17.4).
- `/loaders`: Asset and Level JSON loaders (load only — schema/validation lives in `/data`).
- `/data`: Level schema + §19.6 validator (`levelSchema`), asset manifest.
- `/ui`: Title screen, HUD, pause, game over, ending overlays.
- `/app`: Boot layer (`boot.ts`, `main.ts`).
- `/tools` (top-level, outside the engine): `validateLevels`, `renderLevelPreview`, `compareReferenceImage`.

### 2.1 PRD §19.2 → Location Mapping
Implementers MUST place every §19.2 module here:

| PRD §19.2 module(s) | Location |
| --- | --- |
| `boot.ts`, `main.ts` | `/app` |
| `fixedStep.ts` | `/core` |
| `stateMachine.ts` | `/core` |
| `rng.ts` (mulberry32, §30.4) | `/core/rng.ts` |
| `replay.ts` (§19.4 / §30.7) | `/core/replay.ts` |
| `scoring.ts`, `transitions.ts` | `/core` |
| `gameState.ts`, `roundState.ts` | `/core` |
| `input.ts` | `/input` |
| `audio.ts` (§17.4) | `/audio/audio.ts` |
| `renderer.ts` | `/render` |
| `assetLoader.ts` | `/loaders` |
| `levelSchema.ts` + §19.6 validator | `/data` |
| `assetManifest.ts` | `/data` |
| `vaus.ts`, `ball.ts`, `bricks.ts`, `capsules.ts`, `enemies.ts`, `boss.ts` | `/entities` |
| `collision.ts` | `/physics` |
| `titleScreen.ts`, `hud.ts`, `pause.ts`, `gameOver.ts`, `ending.ts` | `/ui` |
| `validateLevels.ts`, `renderLevelPreview.ts`, `compareReferenceImage.ts` | `/tools` |

## 3. Determinism Pointers
- The deterministic RNG/seed model is specified in `prd.md` §30.4 (**mulberry32**, 32-bit state, seeded from `deterministicSeed`; per-player streams seeded `deterministicSeed XOR playerIndex`).
- The replay/determinism format is specified in `docs/qa/replay_format.md` (see also §19.4.1).
