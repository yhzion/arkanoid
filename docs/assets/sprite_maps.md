# Sprite Maps and Coordinates

*Reference: `prd.md` Section 18 (Visual Asset Requirements)*

This document defines the UV coordinates for rendering sprites. Actual image files are located in the `game-data` folders.

## 1. Grid Size
- Base tile size: `16x8` (Bricks) or `32x16` (Vaus).

## 2. Sprite Atlas Coordinates (Draft)
*Coordinates map to top-left (x, y) and dimensions (w, h)*

| Asset | X | Y | W | H | Frames |
|-------|---|---|---|---|--------|
| Vaus (Normal) | 0 | 0 | 32 | 8 | 1 |
| Vaus (Enlarge) | 0 | 8 | 48 | 8 | 1 |
| Ball | 0 | 16 | 4 | 4 | 1 |
| Brick (White) | 0 | 24 | 16 | 8 | 1 |
| Capsule (S) | 32 | 0 | 16 | 8 | 8 |

*Note: The actual coordinates will be generated dynamically by a texture packer or manually specified based on the final asset sheet. Do not embed pixel data in code.*
