# Sprite Maps and Coordinates

*Reference: `prd.md` Section 18.1 (Sprite Inventory), 18.2 (Reference Sprite Dimensions)*

This document defines the UV coordinates for rendering sprites. Actual image files are located in the `game-data` folders.

## 1. Grid Size
- Base tile size: `16x8` (Bricks) or `32x8` (Vaus), per PRD §18.2 reference dimensions.

## 2. Sprite Atlas Coordinates (Draft)
*Coordinates map to top-left (x, y) and dimensions (w, h)*

> **Draft / partial.** Final/full sprite dimensions are `[DEFERRED → M5]` per PRD §18.1, so the cells below are placeholders. The complete §18.1 inventory (enemies — Konerd, Pyradok, Tri-sphere, Opopo; DOH boss; the 7 capsule letters S, C, L, D, P, E, B; lasers; warp/break exit; silver/gold bricks; explosions/death effects; HUD digits/score/lives/round; title and ending screens) is intentionally **not yet enumerated here** and is `[DEFERRED → M5]`.

| Asset | X | Y | W | H | Frames |
|-------|---|---|---|---|--------|
| Vaus (Normal) | 0 | 0 | 32 | 8 | 1 |
| Vaus (Enlarge) | 0 | 8 | 48* | 8 | 1 |
| Ball | 0 | 16 | 4** | 4 | 1 |
| Brick (White) | 0 | 24 | 16 | 8 | 1 |
| Capsule (S) | 32 | 0 | 16 | 8 | 8 |

\* The `48` is a **provisional gameplay collision width**, not the reference sprite dimension. PRD §18.2 lists the Vaus large *reference sprite asset* as `32x8`, with gameplay collision width to be verified; `48 != reference sprite size`.

\*\* PRD §18.2 lists the energy ball reference as `5x4`. The `4x4` cell is a Draft placeholder pending the `[DEFERRED → M5]` final dimensions.

*Note: The actual coordinates will be generated dynamically by a texture packer or manually specified based on the final asset sheet. Do not embed pixel data in code.*
